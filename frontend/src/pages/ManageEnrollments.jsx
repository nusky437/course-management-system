import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function ManageEnrollments() {

  // Course list - used to fill the "filter by course" dropdown
  const [courses, setCourses] = useState([]);

  // ---------- Filter / sort / paging state ----------

  // What the admin is typing (updates on every key press)
  const [searchInput, setSearchInput] = useState("");

  // The search text actually sent to the server (after a short delay)
  const [search, setSearch] = useState("");

  const [courseId, setCourseId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ---------- Data from the server ----------

  // Only the rows of the CURRENT page
  const [enrollments, setEnrollments] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Changing this number reloads the table (used after a delete)
  const [reloadKey, setReloadKey] = useState(0);


  // Start date later than end date -> do not call the server
  const invalidRange = fromDate !== "" && toDate !== "" && fromDate > toDate;


  // ---------- Load the course dropdown options (once) ----------
  useEffect(() => {

    const loadCourseOptions = async () => {

      try {

        const response = await api.get("/courses");

        setCourses(response.data.courses);

      } catch (error) {

        // The dropdown is optional, so a failure here is not fatal.
        console.error("Could not load course options:", error.message);

      }
    };

    loadCourseOptions();

  }, []);


  // ---------- Debounce the search box ----------
  // Wait 400 ms after the last key press, then search from page 1.
  useEffect(() => {

    const timer = setTimeout(() => {

      const trimmed = searchInput.trim();

      if (trimmed !== search) {
        setSearch(trimmed);
        setPage(1);
      }

    }, 400);

    return () => clearTimeout(timer);

  }, [searchInput, search]);


  // ---------- Load the current page from the server ----------
  useEffect(() => {

    // Do not call the server for an impossible date range
    if (invalidRange) {
      return;
    }

    // "ignore" stops an old, slow response from replacing a newer one
    let ignore = false;

    const loadEnrollments = async () => {

      setLoading(true);
      setError("");

      try {

        const response = await api.get("/enrollments", {
          params: {
            q: search || undefined,
            courseId: courseId || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            sort,
            order,
            page,
            limit,
          },
        });

        if (ignore) return;

        const meta = response.data.pagination;

        // The requested page no longer exists (for example the last
        // record of the last page was deleted): go to the last real page.
        if (
          response.data.enrollments.length === 0 &&
          meta.total > 0 &&
          page > meta.totalPages
        ) {
          setPage(meta.totalPages);
          return;
        }

        setEnrollments(response.data.enrollments);
        setPagination(meta);

      } catch (error) {

        if (ignore) return;

        setError(
          error.response?.data?.message ||
          "Failed to load enrollments"
        );

        setEnrollments([]);

      } finally {

        if (!ignore) {
          setLoading(false);
        }

      }
    };

    loadEnrollments();

    return () => {
      ignore = true;
    };

  }, [search, courseId, fromDate, toDate, sort, order, page, limit,
      invalidRange, reloadKey]);


  // ---------- Filter handlers: every change goes back to page 1 ----------

  const handleCourseChange = (event) => {
    setSuccess("");
    setCourseId(event.target.value);
    setPage(1);
  };

  const handleFromChange = (event) => {
    setSuccess("");
    setFromDate(event.target.value);
    setPage(1);
  };

  const handleToChange = (event) => {
    setSuccess("");
    setToDate(event.target.value);
    setPage(1);
  };

  const handleSortChange = (event) => {
    setSort(event.target.value);
    setPage(1);
  };

  const handleOrderChange = (event) => {
    setOrder(event.target.value);
    setPage(1);
  };

  const handleLimitChange = (event) => {
    setLimit(Number(event.target.value));
    setPage(1);
  };

  const handleReset = () => {
    setSuccess("");
    setSearchInput("");
    setSearch("");
    setCourseId("");
    setFromDate("");
    setToDate("");
    setSort("date");
    setOrder("desc");
    setLimit(20);
    setPage(1);
  };


  // ---------- Delete an enrollment ----------
  const handleDelete = async (enrollment) => {

    const confirmed = window.confirm(
      `Remove ${enrollment.full_name || enrollment.username}${
        enrollment.title ? ` from "${enrollment.title}"` : ""
      }?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {

      const response = await api.delete(`/enrollments/${enrollment.id}`);

      setSuccess(response.data.message);

      // That was the only row on this page -> show the previous page.
      // Filters, search and sorting stay exactly as they were.
      if (enrollments.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setReloadKey((key) => key + 1);
      }

    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Could not delete the enrollment."
      );

    }
  };


  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString();
  };


  // ---------- Pagination helpers ----------

  const { total, totalPages } = pagination;

  // "Showing 1–20 of 137"  /  "Showing 0–0 of 0"
  const rangeStart = total === 0 || enrollments.length === 0
    ? 0
    : (pagination.page - 1) * pagination.limit + 1;

  const rangeEnd = total === 0 || enrollments.length === 0
    ? 0
    : (pagination.page - 1) * pagination.limit + enrollments.length;

  const canGoBack = pagination.page > 1;
  const canGoForward = totalPages > 0 && pagination.page < totalPages;

  const hasFilters =
    search !== "" || courseId !== "" || fromDate !== "" || toDate !== "";

  const selectedCourse = courses.find(
    (course) => String(course.id) === String(courseId)
  );


  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Manage Enrollments</h1>

            <p className="page-subtitle">
              Search, filter and sort enrollments, and remove them when
              needed.
            </p>
          </div>

        </div>


        {/* ---------- Search, filters and sorting ---------- */}

        <div className="filter-bar filter-bar-enrollments">

          <div className="form-group">
            <label htmlFor="enrollmentSearch">Search student</label>

            <input
              id="enrollmentSearch"
              type="text"
              className="input"
              placeholder="Full name or username"
              maxLength={100}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="courseFilter">Course</label>

            <select
              id="courseFilter"
              className="input"
              value={courseId}
              onChange={handleCourseChange}
            >
              <option value="">All courses</option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fromDate">Enrolled from</label>

            <input
              id="fromDate"
              type="date"
              className="input"
              value={fromDate}
              max={toDate || undefined}
              onChange={handleFromChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="toDate">Enrolled to</label>

            <input
              id="toDate"
              type="date"
              className="input"
              value={toDate}
              min={fromDate || undefined}
              onChange={handleToChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sortField">Sort by</label>

            <select
              id="sortField"
              className="input"
              value={sort}
              onChange={handleSortChange}
            >
              <option value="date">Enrollment date</option>
              <option value="student">Student</option>
              <option value="course">Course</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="sortOrder">Order</label>

            <select
              id="sortOrder"
              className="input"
              value={order}
              onChange={handleOrderChange}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="pageSize">Per page</label>

            <select
              id="pageSize"
              className="input"
              value={limit}
              onChange={handleLimitChange}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={handleReset}
          >
            Reset
          </button>

        </div>


        {/* ---------- Messages ---------- */}

        {success && <p className="success">{success}</p>}

        {invalidRange && (
          <p className="error">
            The start date cannot be later than the end date.
          </p>
        )}

        {error && <p className="error">{error}</p>}


        {/* ---------- Table ---------- */}

        <section className="section-card">

          <div className="section-card-header">

            <h2>
              {selectedCourse
                ? `Enrollments in "${selectedCourse.title}"`
                : "All Enrollments"}
              {!loading && ` (${total})`}
            </h2>

          </div>


          {loading && <p className="loading">Loading enrollments...</p>}


          {!loading && !error && enrollments.length === 0 && (
            <p className="empty">
              {hasFilters
                ? "No enrollments match your search or filters."
                : "No enrollments have been made yet."}
            </p>
          )}


          {!loading && enrollments.length > 0 && (
            <div className="table-wrapper">

              <table className="table">

                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Username</th>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Enrolled On</th>
                    <th className="table-actions-column">Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {enrollments.map((enrollment) => (

                    <tr key={enrollment.id}>

                      <td>{enrollment.full_name}</td>
                      <td>{enrollment.username}</td>
                      <td>{enrollment.title}</td>
                      <td>{enrollment.category}</td>
                      <td>
                        <span className="tag tag-level">
                          {enrollment.level}
                        </span>
                      </td>
                      <td>{formatDate(enrollment.enrolled_at)}</td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(enrollment)}
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}


          {/* ---------- Pagination ---------- */}

          {!error && (
            <div className="pagination-bar">

              <span className="pagination-range">
                Showing {rangeStart}-{rangeEnd} of {total}
              </span>

              <div className="pagination-controls">

                <button
                  type="button"
                  className="btn btn-small btn-outline-dark"
                  disabled={!canGoBack || loading}
                  onClick={() => setPage(1)}
                >
                  First
                </button>

                <button
                  type="button"
                  className="btn btn-small btn-outline-dark"
                  disabled={!canGoBack || loading}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>

                <span className="pagination-info">
                  Page {totalPages === 0 ? 0 : pagination.page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-small btn-outline-dark"
                  disabled={!canGoForward || loading}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>

                <button
                  type="button"
                  className="btn btn-small btn-outline-dark"
                  disabled={!canGoForward || loading}
                  onClick={() => setPage(totalPages)}
                >
                  Last
                </button>

              </div>

            </div>
          )}

        </section>

      </div>

      <Footer />

    </>
  );
}

export default ManageEnrollments;
