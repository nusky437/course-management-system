import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


function MyEnrollments() {

  const [enrollments, setEnrollments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Default sorting = newest enrolled
  const [sortOption, setSortOption] = useState("newest");

  const user = getUser();


  // ---------- Load logged-in student's enrollments ----------

  useEffect(() => {

    const getEnrollments = async () => {

      try {

        const response = await api.get("/enrollments/my");

        setEnrollments(
          response.data.enrollments || []
        );

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load your enrollments"
        );

      } finally {

        setLoading(false);

      }

    };

    getEnrollments();

  }, []);


  // ---------- Safely convert price to number ----------

  const getSafePrice = (price) => {

    const numericPrice = Number(price);

    return Number.isFinite(numericPrice)
      ? numericPrice
      : 0;

  };


  // ---------- Format price ----------

  const formatPrice = (price) => {

    return getSafePrice(price).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  };


  // ---------- Format date ----------

  const formatDate = (value) => {

    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString();

  };


  // ---------- Enrollment Summary ----------

  const summary = useMemo(() => {

    const totalCourses = enrollments.length;

    const totalValue = enrollments.reduce(
      (total, enrollment) => {

        return total + getSafePrice(enrollment.price);

      },
      0
    );

    const averagePrice =
      totalCourses > 0
        ? totalValue / totalCourses
        : 0;

    const categories = new Set(
      enrollments
        .map((enrollment) => enrollment.category)
        .filter((category) => category)
    );

    const distinctCategories = categories.size;

    return {
      totalCourses,
      totalValue,
      averagePrice,
      distinctCategories,
    };

  }, [enrollments]);


  // ---------- Sort enrollments ----------

  const sortedEnrollments = useMemo(() => {

    // Copy array so original API array is not modified
    const sorted = [...enrollments];

    switch (sortOption) {

      case "newest":

        sorted.sort((a, b) => {

          const dateA = new Date(a.enrolled_at).getTime();
          const dateB = new Date(b.enrolled_at).getTime();

          const safeDateA = Number.isFinite(dateA)
            ? dateA
            : 0;

          const safeDateB = Number.isFinite(dateB)
            ? dateB
            : 0;

          return safeDateB - safeDateA;

        });

        break;


      case "oldest":

        sorted.sort((a, b) => {

          const dateA = new Date(a.enrolled_at).getTime();
          const dateB = new Date(b.enrolled_at).getTime();

          const safeDateA = Number.isFinite(dateA)
            ? dateA
            : 0;

          const safeDateB = Number.isFinite(dateB)
            ? dateB
            : 0;

          return safeDateA - safeDateB;

        });

        break;


      case "price-high":

        sorted.sort((a, b) => {

          return (
            getSafePrice(b.price) -
            getSafePrice(a.price)
          );

        });

        break;


      case "price-low":

        sorted.sort((a, b) => {

          return (
            getSafePrice(a.price) -
            getSafePrice(b.price)
          );

        });

        break;


      case "title":

        sorted.sort((a, b) => {

          const titleA = String(
            a.title || ""
          ).toLowerCase();

          const titleB = String(
            b.title || ""
          ).toLowerCase();

          return titleA.localeCompare(titleB);

        });

        break;


      default:
        break;

    }

    return sorted;

  }, [enrollments, sortOption]);


  return (

    <>
      <Navbar />

      <div className="container">

        {/* ---------- Page Header ---------- */}

        <div className="page-header">

          <div>

            <h1>
              My Enrollments
            </h1>

            <p className="page-subtitle">

              {user?.full_name
                ? `${user.full_name}, these are the courses you are enrolled in.`
                : "These are the courses you are enrolled in."}

            </p>

          </div>


          <Link
            to="/courses"
            className="btn btn-primary"
          >
            <FaSearch />
            Browse More Courses
          </Link>

        </div>


        {/* ---------- Loading ---------- */}

        {loading && (

          <p className="loading">
            Loading your enrollments...
          </p>

        )}


        {/* ---------- Error ---------- */}

        {error && !loading && (

          <p className="error">
            {error}
          </p>

        )}


        {/* ---------- Enrollment Summary ---------- */}

        {!loading &&
          !error &&
          enrollments.length > 0 && (

            <div className="enrollment-summary">

              <div className="summary-card">

                <h3>
                  Total Enrolled Courses
                </h3>

                <p>
                  {summary.totalCourses}
                </p>

              </div>


              <div className="summary-card">

                <h3>
                  Total Course Value
                </h3>

                <p>
                  Rs. {formatPrice(summary.totalValue)}
                </p>

              </div>


              <div className="summary-card">

                <h3>
                  Average Course Price
                </h3>

                <p>
                  Rs. {formatPrice(summary.averagePrice)}
                </p>

              </div>


              <div className="summary-card">

                <h3>
                  Distinct Categories
                </h3>

                <p>
                  {summary.distinctCategories}
                </p>

              </div>

            </div>

          )}


        {/* ---------- Sorting ---------- */}

        {!loading &&
          !error &&
          enrollments.length > 0 && (

            <div className="enrollment-controls">

              <label htmlFor="sort-enrollments">
                Sort By:
              </label>

              <select
                id="sort-enrollments"
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value)
                }
              >

                <option value="newest">
                  Newest Enrolled
                </option>

                <option value="oldest">
                  Oldest Enrolled
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="title">
                  Course Title: A to Z
                </option>

              </select>

            </div>

          )}


        {/* ---------- Empty State ---------- */}

        {!loading &&
          !error &&
          enrollments.length === 0 && (

            <div className="empty-box">

              <h3>
                No Enrollments Yet
              </h3>

              <p className="empty">
                You are not enrolled in any courses yet.
              </p>

              <Link
                to="/courses"
                className="btn btn-primary"
              >
                <FaSearch />
                Find a Course
              </Link>

            </div>

          )}


        {/* ---------- Enrollment Cards ---------- */}

        {!loading &&
          !error &&
          sortedEnrollments.length > 0 && (

            <div className="course-grid">

              {sortedEnrollments.map((enrollment) => (

                <article
                  className="course-card"
                  key={enrollment.id}
                >

                  <img
                    src={enrollment.image}
                    alt={enrollment.title}
                    className="course-card-image"
                    loading="lazy"
                  />


                  <div className="course-card-body">

                    <div className="course-card-tags">

                      <span className="tag tag-category">
                        {enrollment.category}
                      </span>

                      <span className="tag tag-level">
                        {enrollment.level}
                      </span>

                    </div>


                    <h3 className="course-card-title">
                      {enrollment.title}
                    </h3>


                    <p className="course-card-summary">

                      {enrollment.description?.slice(0, 100)}

                      {enrollment.description?.length > 100
                        ? "..."
                        : ""}

                    </p>


                    <ul className="course-card-meta">

                      <li>
                        <strong>
                          Duration:
                        </strong>{" "}
                        {enrollment.duration}
                      </li>


                      <li>
                        <strong>
                          Price:
                        </strong>{" "}
                        Rs. {formatPrice(enrollment.price)}
                      </li>


                      <li>
                        <strong>
                          Enrolled on:
                        </strong>{" "}
                        {formatDate(
                          enrollment.enrolled_at
                        )}
                      </li>

                    </ul>


                    <Link
                      to={`/courses/${enrollment.course_id}`}
                      className="btn btn-outline btn-block"
                    >
                      View Course
                    </Link>

                  </div>

                </article>

              ))}

            </div>

          )}

      </div>


      <Footer />

    </>
  );
}


export default MyEnrollments;