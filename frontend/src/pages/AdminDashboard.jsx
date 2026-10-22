import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaChartBar,
  FaSearch,
  FaUsers,
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function AdminDashboard() {

  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    studentsWithEnrollments: 0,
    enrollmentsLast30Days: 0,
    coursesWithoutEnrollments: 0,
    enrollmentsByCategory: [],
    topCourses: [],
  });

  // Only the 6 most recent enrollments (one small page from the server)
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = getUser();


  useEffect(() => {

    const loadDashboard = async () => {

      try {

        const [reportResult, enrollmentsResult] = await Promise.allSettled([
          api.get("/reports/overview"),
          api.get("/enrollments", { params: { page: 1, limit: 6 } }),
        ]);

        if (reportResult.status === "fulfilled") {
          setStats(reportResult.value.data.report);
        } else {
          setError("The report could not be loaded. Please refresh to try again.");
        }

        if (enrollmentsResult.status === "fulfilled") {
          setRecentEnrollments(enrollmentsResult.value.data.enrollments || []);
        } else {
          setError((current) => current || "Recent enrollments could not be loaded.");
        }
      } catch (loadError) {
        setError("Dashboard data could not be loaded. Please refresh to try again.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

  }, []);


  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString();
  };


  return (

    <>
      <Navbar />

      <div className="container">

        {/* ---------- Welcome ---------- */}

        <div className="page-header">

          <div>
            <h1>Admin Dashboard</h1>

            <p className="page-subtitle">
              Welcome back, {user?.full_name || user?.username}. Here is
              an overview of the system.
            </p>
          </div>

          <Link to="/admin/courses" className="btn btn-primary">
            <FaChartBar />
            Manage Courses
          </Link>

        </div>


        {error && <p className="error">{error}</p>}


        {/* ---------- Stat cards ---------- */}

        <div className="dashboard-grid">

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : stats.totalCourses}
            </span>
            <span className="dashboard-card-label">Total Courses</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : stats.totalStudents}
            </span>
            <span className="dashboard-card-label">Total Students</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : stats.totalEnrollments}
            </span>
            <span className="dashboard-card-label">Total Enrollments</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : stats.studentsWithEnrollments}
            </span>
            <span className="dashboard-card-label">
              Students with Enrollments
            </span>
          </div>

        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-card-value">{loading ? "..." : stats.enrollmentsLast30Days}</span>
            <span className="dashboard-card-label">Enrollments in the Last 30 Days</span>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-card-value">{loading ? "..." : stats.coursesWithoutEnrollments}</span>
            <span className="dashboard-card-label">Courses Without Enrollments</span>
          </div>
        </div>

        {!loading && (stats.enrollmentsByCategory.length > 0 || stats.topCourses.length > 0) && (
          <div className="report-grid">
            <section className="section-card">
              <div className="section-card-header"><h2>Enrollments by Category</h2></div>
              {stats.enrollmentsByCategory.length === 0 ? <p className="empty">No category data yet.</p> : (
                <div className="report-list">
                  {stats.enrollmentsByCategory.map((item) => {
                    const maxCount = Math.max(...stats.enrollmentsByCategory.map((row) => row.enrollmentCount), 1);
                    return <div className="report-row" key={item.category}>
                      <div className="report-row-label"><span>{item.category}</span><strong>{item.enrollmentCount}</strong></div>
                      <div className="report-bar-track"><div className="report-bar" style={{ width: `${(item.enrollmentCount / maxCount) * 100}%` }} /></div>
                    </div>;
                  })}
                </div>
              )}
            </section>
            <section className="section-card">
              <div className="section-card-header"><h2>Top Courses</h2></div>
              {stats.topCourses.length === 0 ? <p className="empty">No enrollments yet.</p> : (
                <div className="table-wrapper"><table className="table"><thead><tr><th>Course</th><th>Category</th><th>Enrollments</th></tr></thead>
                  <tbody>{stats.topCourses.map((course) => <tr key={course.courseId}><td>{course.title}</td><td>{course.category}</td><td>{course.enrollmentCount}</td></tr>)}</tbody>
                </table></div>
              )}
            </section>
          </div>
        )}


        {/* ---------- Recent enrollments ---------- */}

        <section className="section-card">

          <div className="section-card-header">
            <h2>Recent Enrollments</h2>

            <Link to="/admin/enrollments" className="link-inline">
              Manage enrollments
            </Link>
          </div>


          {loading && <p className="loading">Loading...</p>}


          {!loading && recentEnrollments.length === 0 && (
            <p className="empty">
              No enrollments have been made yet.
            </p>
          )}


          {!loading && recentEnrollments.length > 0 && (
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
                  </tr>
                </thead>

                <tbody>
                  {recentEnrollments.map((enrollment) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>


        {/* ---------- Admin shortcuts ---------- */}

        <section className="section-card">

          <div className="section-card-header">
            <h2>Administration</h2>
          </div>

          <div className="quick-actions">

            <Link to="/admin/courses" className="quick-action">
              <span className="quick-action-icon"><FaBook /></span>
              <span>Add, edit and delete courses</span>
            </Link>

            <Link to="/admin/enrollments" className="quick-action">
              <span className="quick-action-icon"><FaUsers /></span>
              <span>View and remove enrollments</span>
            </Link>

            <Link to="/courses" className="quick-action">
              <span className="quick-action-icon"><FaSearch /></span>
              <span>See the public course list</span>
            </Link>

          </div>

        </section>

      </div>

      <Footer />

    </>
  );
}

export default AdminDashboard;
