const db = require("../config/db");

const Report = {
  async getAdminOverview() {
    // All enrollment rows are accepted enrollments; the current schema has no status field.
    const [[totals]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM courses) AS total_courses,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
        COUNT(*) AS total_enrollments,
        COUNT(DISTINCT e.student_id) AS students_with_enrollments,
        COALESCE(SUM(e.enrolled_at >= NOW() - INTERVAL 30 DAY), 0) AS enrollments_last_30_days,
        (SELECT COUNT(*) FROM courses c
          WHERE NOT EXISTS (SELECT 1 FROM enrollments e2 WHERE e2.course_id = c.id)
        ) AS courses_without_enrollments
      FROM enrollments e
    `);

    const [categories] = await db.execute(`
      SELECT c.category, COUNT(e.id) AS enrollment_count
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.category
      ORDER BY enrollment_count DESC, c.category ASC
    `);

    const [topCourses] = await db.execute(`
      SELECT c.id AS course_id, c.title, c.category, COUNT(e.id) AS enrollment_count
      FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id, c.title, c.category
      ORDER BY enrollment_count DESC, c.title ASC
      LIMIT 5
    `);

    return {
      totalCourses: Number(totals.total_courses),
      totalStudents: Number(totals.total_students),
      totalEnrollments: Number(totals.total_enrollments),
      studentsWithEnrollments: Number(totals.students_with_enrollments),
      enrollmentsLast30Days: Number(totals.enrollments_last_30_days),
      coursesWithoutEnrollments: Number(totals.courses_without_enrollments),
      enrollmentsByCategory: categories.map((row) => ({
        category: row.category,
        enrollmentCount: Number(row.enrollment_count),
      })),
      topCourses: topCourses.map((row) => ({
        courseId: Number(row.course_id),
        title: row.title,
        category: row.category,
        enrollmentCount: Number(row.enrollment_count),
      })),
    };
  },

  async getStudentReport(studentId) {
    const [[summary]] = await db.execute(`
      SELECT
        COUNT(e.id) AS enrolled_courses,
        COUNT(DISTINCT c.category) AS distinct_categories,
        MIN(e.enrolled_at) AS earliest_enrollment,
        MAX(e.enrolled_at) AS latest_enrollment
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ?
    `, [studentId]);

    const [recentEnrollments] = await db.execute(`
      SELECT e.id, e.course_id, c.title, c.category, c.level, e.enrolled_at
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC, e.id DESC
      LIMIT 5
    `, [studentId]);

    return {
      enrolledCourses: Number(summary.enrolled_courses),
      distinctCategories: Number(summary.distinct_categories),
      earliestEnrollment: summary.earliest_enrollment,
      latestEnrollment: summary.latest_enrollment,
      recentEnrollments,
    };
  },
};

module.exports = Report;
