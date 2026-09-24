import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaSave,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


const EMPTY_COURSE = {
  title: "",
  category: "",
  level: "Beginner",
  duration: "",
  price: "",
  image: "",
  description: "",
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

// Columns that can be sorted (CR-003 / FR-015), in the order they
// appear in the table. "numeric: true" tells the sorter to compare
// the values as numbers instead of text (needed for Price).
const SORTABLE_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  { key: "level", label: "Level" },
  { key: "duration", label: "Duration" },
  { key: "price", label: "Price", numeric: true },
];


// Load the course list.
async function fetchAllCourses() {
  const response = await api.get("/courses");

  return response.data.courses;
}


function ManageCourses() {

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form visibility + which course is being edited (null = adding new)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);


  // ---------- Search / filter / sort state (CR-003) ----------
  // These are kept separate from `courses`, so they naturally stay
  // active after create / update / delete (FR-029 - FR-031), since
  // refreshCourses() only replaces the course data, never this state.
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");


  // ---------- Load the course list once, when the page opens ----------
  useEffect(() => {

    const loadCourses = async () => {

      try {

        setCourses(await fetchAllCourses());

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load courses"
        );

      } finally {

        setLoading(false);

      }
    };

    loadCourses();

  }, []);


  // ---------- Reload the list after a create / update / delete ----------
  const refreshCourses = async () => {
    setCourses(await fetchAllCourses());
  };


  // ---------- Search / filter / sort (CR-003) ----------

  // Category options, built from whatever categories currently exist
  // in the course list, plus the required "All" option (FR-008).
  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set(
      courses.map((course) => course.category).filter(Boolean)
    );

    return ["All", ...uniqueCategories];
  }, [courses]);

  // Level options, always the same three levels plus "All" (FR-011).
  const levelOptions = ["All", ...LEVEL_OPTIONS];

  // Clicking a sortable column header (FR-016 - FR-019).
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      // Same column clicked again -> flip the direction.
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      // A different column -> sort by it, starting ascending.
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // Clears search text, both filters, min/max price, and any active sorting (FR-026 - FR-028).
  const resetFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setMinPrice("");
    setMaxPrice("");
    setSortColumn(null);
    setSortDirection("asc");
  };

  const hasActiveFilters =
    searchText.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedLevel !== "All" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    sortColumn !== null;

  // Search (title / category / course ID) + category filter + level
  // filter + min/max price range, all combined with AND logic (FR-005, FR-013, FR-014).
  const filteredCourses = courses.filter((course) => {
    const search = searchText.trim().toLowerCase();

    const title = String(course.title || "").toLowerCase();
    const category = String(course.category || "").toLowerCase();
    const courseId = String(course.id ?? "").toLowerCase();

    // Case-insensitive search across title, category and course ID (FR-002, FR-003, FR-004, FR-006).
    const matchesSearch =
      search === "" ||
      title.includes(search) ||
      category.includes(search) ||
      courseId.includes(search);

    const matchesCategory =
      selectedCategory === "All" || course.category === selectedCategory;

    const matchesLevel =
      selectedLevel === "All" || course.level === selectedLevel;

    // Min / max price range filter. Blank = no bound on that side.
    const coursePrice = Number(course.price) || 0;

    const matchesMinPrice = minPrice === "" || coursePrice >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || coursePrice <= Number(maxPrice);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesLevel &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });

  // Apply the active sort on top of the filtered results (FR-020 - FR-022).
  const displayedCourses = [...filteredCourses].sort((courseA, courseB) => {
    if (!sortColumn) {
      return 0;
    }

    const column = SORTABLE_COLUMNS.find((item) => item.key === sortColumn);

    let comparison;

    if (column?.numeric) {
      // Numeric sorting for Price, so 100 does not come before 50 (FR-020).
      const priceA = Number(courseA[sortColumn]) || 0;
      const priceB = Number(courseB[sortColumn]) || 0;

      comparison = priceA - priceB;
    } else {
      // Case-insensitive, natural-order text sorting for everything
      // else, including Duration and Course ID (FR-021, FR-022).
      const valueA = String(courseA[sortColumn] ?? "");
      const valueB = String(courseB[sortColumn] ?? "");

      comparison = valueA.localeCompare(valueB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Small helper to render the ↑ / ↓ sort indicator (FR-018).
  const renderSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return <FaSort className="sort-icon sort-icon-inactive" />;
    }

    return sortDirection === "asc" ? (
      <FaSortUp className="sort-icon" />
    ) : (
      <FaSortDown className="sort-icon" />
    );
  };


  // ---------- Form helpers ----------

  const handleChange = (event) => {

    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: "",
      });
    }
  };


  const openAddForm = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };


  const openEditForm = (course) => {
    setShowForm(true);
    setEditingId(course.id);

    // Fill the form with the existing course values.
    setFormData({
      title: course.title || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      price: String(course.price ?? ""),
      image: course.image || "",
      description: course.description || "",
    });

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };


  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
  };


  // ---------- Create / Update ----------
  const handleSubmit = async (event) => {

    // Stop the browser from reloading the page
    event.preventDefault();

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");

    const coursePayload = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      level: formData.level,
      duration: formData.duration.trim(),
      price: Number(formData.price),
      image: formData.image.trim(),
      description: formData.description.trim(),
    };


    setSaving(true);

    try {

      if (editingId) {

        // ---------- Update an existing course ----------
        const response = await api.put(
          `/courses/${editingId}`,
          coursePayload
        );

        setSuccess(response.data.message);

      } else {

        // ---------- Create a new course ----------
        const response = await api.post("/courses", coursePayload);

        setSuccess(response.data.message);

      }

      closeForm();

      // Show fresh data from the backend
      await refreshCourses();

    } catch (error) {

      if (error.response?.data?.errors) {
        setFieldErrors(error.response.data.errors);
      }

      setFormError(
        error.response?.data?.message ||
        "Could not save the course. Please try again."
      );

    } finally {

      setSaving(false);

    }
  };


  // ---------- Delete ----------
  const handleDelete = async (course) => {

    // Always confirm before a destructive action
    const confirmed = window.confirm(
      `Delete "${course.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {

      const response = await api.delete(`/courses/${course.id}`);

      setSuccess(response.data.message);

      await refreshCourses();

    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Could not delete the course."
      );

    }
  };



  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Manage Courses</h1>

            <p className="page-subtitle">
              Add new courses, update the existing ones, or remove courses
              that are no longer offered.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={showForm ? closeForm : openAddForm}
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            {showForm ? "Cancel" : "Add Course"}
          </button>

        </div>


        {/* ---------- Success / error messages ---------- */}

        {success && <p className="success">{success}</p>}

        {error && <p className="error">{error}</p>}


        {/* ---------- Search / Category / Level filters (CR-003) ---------- */}

        {!loading && courses.length > 0 && (
          <div className="filter-bar filter-bar-admin">

            <input
              type="text"
              className="input"
              placeholder="Search by title, category or course ID..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <select
              className="input"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={selectedLevel}
              onChange={(event) => setSelectedLevel(event.target.value)}
            >
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              className="input"
              placeholder="Min Price"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />

            <input
              type="number"
              min="0"
              className="input"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />

            <button
              type="button"
              className="btn btn-outline"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset Filters
            </button>

          </div>
        )}


        {/* ---------- Add / Edit form ---------- */}

        {showForm && (

          <section className="section-card">

            <div className="section-card-header">
              <h2>{editingId ? "Edit Course" : "New Course"}</h2>
            </div>


            <form className="form" onSubmit={handleSubmit}>

              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="title">Title *</label>

                  <input
                    id="title"
                    className={`input ${fieldErrors.title ? "input-error" : ""}`}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. React"
                  />

                  {fieldErrors.title && (
                    <span className="field-error">{fieldErrors.title}</span>
                  )}
                </div>


                <div className="form-group">
                  <label htmlFor="category">Category *</label>

                  <input
                    id="category"
                    className={`input ${fieldErrors.category ? "input-error" : ""}`}
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Frontend"
                  />

                  {fieldErrors.category && (
                    <span className="field-error">{fieldErrors.category}</span>
                  )}
                </div>

              </div>


              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="level">Level *</label>

                  <select
                    id="level"
                    className={`input ${fieldErrors.level ? "input-error" : ""}`}
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>

                  {fieldErrors.level && (
                    <span className="field-error">{fieldErrors.level}</span>
                  )}
                </div>


                <div className="form-group">
                  <label htmlFor="duration">Duration *</label>

                  <input
                    id="duration"
                    className={`input ${fieldErrors.duration ? "input-error" : ""}`}
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 10 Weeks"
                  />

                  {fieldErrors.duration && (
                    <span className="field-error">{fieldErrors.duration}</span>
                  )}
                </div>


                <div className="form-group">
                  <label htmlFor="price">Price (Rs.) *</label>

                  <input
                    id="price"
                    className={`input ${fieldErrors.price ? "input-error" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 25000"
                  />

                  {fieldErrors.price && (
                    <span className="field-error">{fieldErrors.price}</span>
                  )}
                </div>

              </div>


              <div className="form-group">
                <label htmlFor="image">Image URL</label>

                <input
                  id="image"
                  className={`input ${fieldErrors.image ? "input-error" : ""}`}
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://placehold.co/300x180?text=React"
                />

                {fieldErrors.image && (
                  <span className="field-error">{fieldErrors.image}</span>
                )}
              </div>


              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  className={`input ${fieldErrors.description ? "input-error" : ""}`}
                  rows="4"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short summary of what students will learn."
                />

                {fieldErrors.description && (
                  <span className="field-error">{fieldErrors.description}</span>
                )}
              </div>


              {formError && <p className="error">{formError}</p>}


              <div className="form-actions">

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <FaSave />
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Course"
                      : "Create Course"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  <FaTimes />
                  Cancel
                </button>

              </div>

            </form>

          </section>

        )}



        {/* ---------- Course table ---------- */}

        <section className="section-card">

          <div className="section-card-header">
            <h2>All Courses{courses.length > 0 ? ` (${courses.length})` : ""}</h2>

            <Link to="/admin/enrollments" className="link-inline">
              <FaEye /> Manage enrollments
            </Link>
          </div>


          {loading && <p className="loading">Loading courses...</p>}


          {!loading && courses.length === 0 && (
            <p className="empty">
              No courses yet. Click "Add Course" to create the first one.
            </p>
          )}


          {/* ---------- Result counter (FR-023) ---------- */}

          {!loading && courses.length > 0 && (
            <p className="result-count">
              Showing {displayedCourses.length} of {courses.length} courses
            </p>
          )}


          {/* ---------- No-results message (FR-024) ---------- */}

          {!loading && courses.length > 0 && displayedCourses.length === 0 && (
            <p className="empty">No courses found.</p>
          )}


          {!loading && displayedCourses.length > 0 && (

            <div className="table-wrapper">

              <table className="table">

                <thead>
                  <tr>
                    {SORTABLE_COLUMNS.slice(0, 1).map((column) => (
                      <th
                        key={column.key}
                        className="sortable-th"
                        aria-sort={
                          sortColumn === column.key
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onClick={() => handleSort(column.key)}
                      >
                        <span className="th-content">
                          {column.label}
                          {renderSortIcon(column.key)}
                        </span>
                      </th>
                    ))}
                    <th>Image</th>
                    {SORTABLE_COLUMNS.slice(1).map((column) => (
                      <th
                        key={column.key}
                        className="sortable-th"
                        aria-sort={
                          sortColumn === column.key
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onClick={() => handleSort(column.key)}
                      >
                        <span className="th-content">
                          {column.label}
                          {renderSortIcon(column.key)}
                        </span>
                      </th>
                    ))}
                    <th className="table-actions-column">Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {displayedCourses.map((course) => (

                    <tr key={course.id}>

                      <td>{course.id}</td>

                      <td>
                        <img
                          src={course.image}
                          alt={course.title}
                          className="table-thumb"
                        />
                      </td>

                      <td>{course.title}</td>

                      <td>{course.category}</td>

                      <td>
                        <span className="tag tag-level">
                          {course.level}
                        </span>
                      </td>

                      <td>{course.duration}</td>

                      <td>Rs. {course.price}</td>

                      <td>
                        <div className="table-actions">

                          <button
                            type="button"
                            className="btn btn-small btn-outline"
                            onClick={() => openEditForm(course)}
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(course)}
                          >
                            <FaTrash />
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </div>

      <Footer />

    </>
  );
}

export default ManageCourses;

