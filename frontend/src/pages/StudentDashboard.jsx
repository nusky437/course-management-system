import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaEye,
  FaGraduationCap,
  FaSearch
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


function StudentDashboard() {

  const [enrollments, setEnrollments] = useState([]);

  const [stats, setStats] = useState({
    enrolledCourses: 0,
    distinctCategories: 0,
    earliestEnrollment: null,
    latestEnrollment: null,
    recentEnrollments: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = getUser();


  useEffect(() => {

    const loadDashboard = async () => {

      try {

        const [reportResult, enrollmentsResult] = await Promise.allSettled([
          api.get("/reports/my"),
          api.get("/enrollments/my"),
        ]);
        if (reportResult.status === "fulfilled") {
          setStats(reportResult.value.data.report);
        } else {
          setError("Your learning report could not be loaded. Please refresh to try again.");
        }
        if (enrollmentsResult.status === "fulfilled") {
          setEnrollments(enrollmentsResult.value.data.enrollments || []);
        } else {
          setError((current) => current || "Your course list could not be loaded.");
        }
      } catch (loadError) {
        setError("Dashboard data could not be loaded. Please refresh to try again.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

  }, []);


  // The report endpoint supplies the recent list. Fall back to the existing
  // own-enrollments endpoint if the report request fails.
  const recentEnrollments = stats.recentEnrollments.length
    ? stats.recentEnrollments
    : enrollments.slice(0, 5);


  // ---------- Format date ----------

  const formatDate = (value) => {

    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString();

  };


  return (

    <>
      <Navbar />

      <div className="container">

        {/* ---------- Welcome ---------- */}

        <div className="page-header">

          <div>

            <h1>Student Dashboard</h1>

            <p className="page-subtitle">
              Welcome back,{" "}
              {user?.full_name || user?.username}!
            </p>

          </div>

          <Link
            to="/courses"
            className="btn btn-primary"
          >
            <FaSearch />
            Browse Courses
          </Link>

        </div>


        {/* ---------- Error ---------- */}

        {error && (
          <p className="error">
            {error}
          </p>
        )}


        {/* ---------- Stat Cards ---------- */}

        <div className="dashboard-grid">

          {/* My Enrolled Courses */}

          <div className="dashboard-card">

            <span className="dashboard-card-value">
              {loading ? "..." : stats.enrolledCourses}
            </span>

            <span className="dashboard-card-label">
              My Enrolled Courses
            </span>

          </div>


          {/* Distinct course categories */}

          <div className="dashboard-card">

            <span className="dashboard-card-value">

              {loading ? "..." : stats.distinctCategories}

            </span>

            <span className="dashboard-card-label">
              Distinct Categories
            </span>

          </div>


          {/* Courses Available */}

          <div className="dashboard-card">

            <span className="dashboard-card-value">
              {loading ? "..." : formatDate(stats.earliestEnrollment)}
            </span>

            <span className="dashboard-card-label">
              First Enrollment
            </span>

          </div>


          {/* Registered Students */}

          <div className="dashboard-card">

            <span className="dashboard-card-value">
              {loading ? "..." : formatDate(stats.latestEnrollment)}
            </span>

            <span className="dashboard-card-label">
              Latest Enrollment
            </span>

          </div>

        </div>


        {/* ---------- Recent Enrollments ---------- */}

        <section className="section-card">

          <div className="section-card-header">

            <h2>
              My Recent Enrollments
            </h2>

            <Link
              to="/my-enrollments"
              className="link-inline"
            >
              <FaEye />
              View all
            </Link>

          </div>


          {loading && (
            <p className="loading">
              Loading...
            </p>
          )}


          {!loading && recentEnrollments.length === 0 && (

            <p className="empty">
              You have not enrolled in any courses yet.
              Head over to the courses page and enroll in
              your first course.
            </p>

          )}


          {!loading && recentEnrollments.length > 0 && (

            <div className="table-wrapper">

              <table className="table">

                <thead>

                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Enrolled On</th>
                  </tr>

                </thead>

                <tbody>

                  {recentEnrollments.map((enrollment) => (

                    <tr key={enrollment.id}>

                      <td>
                        <Link
                          to={`/courses/${enrollment.course_id}`}
                        >
                          {enrollment.title}
                        </Link>
                      </td>

                      <td>
                        {enrollment.category}
                      </td>

                      <td>
                        {enrollment.level}
                      </td>

                      <td>
                        {formatDate(
                          enrollment.enrolled_at
                        )}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* ---------- Quick Actions ---------- */}

        <section className="section-card">

          <div className="section-card-header">

            <h2>
              Quick Actions
            </h2>

          </div>


          <div className="quick-actions">

            <Link
              to="/courses"
              className="quick-action"
            >

              <span className="quick-action-icon">
                <FaBook />
              </span>

              <span>
                Browse all courses
              </span>

            </Link>


            <Link
              to="/my-enrollments"
              className="quick-action"
            >

              <span className="quick-action-icon">
                <FaGraduationCap />
              </span>

              <span>
                View my enrollments
              </span>

            </Link>

          </div>

        </section>

      </div>

      <Footer />

    </>
  );
}


export default StudentDashboard;
