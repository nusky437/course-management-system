const db = require("../config/db");

const Enrollment = {

// Create enrollment with atomic course capacity check
async create(studentId, courseId) {
  const connection = await db.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // Lock the course row.
    // This prevents two students from taking the final seat
    // at the same time.
    const [courseRows] = await connection.execute(
      `SELECT
          id,
          max_students
       FROM courses
       WHERE id = ?
       FOR UPDATE`,
      [courseId]
    );

    if (courseRows.length === 0) {
      const error = new Error("Course not found");
      error.code = "COURSE_NOT_FOUND";
      throw error;
    }

    const course = courseRows[0];

    // Check whether this student is already enrolled
    const [existingRows] = await connection.execute(
      `SELECT id
       FROM enrollments
       WHERE student_id = ?
       AND course_id = ?
       LIMIT 1`,
      [studentId, courseId]
    );

    if (existingRows.length > 0) {
      const error = new Error(
        "You are already enrolled in this course"
      );

      error.code = "ALREADY_ENROLLED";
      throw error;
    }

    // Count current enrollments
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS enrolled_count
       FROM enrollments
       WHERE course_id = ?`,
      [courseId]
    );

    const enrolledCount = Number(
      countRows[0].enrolled_count
    );

    // Check course capacity
    // NULL means unlimited.
    if (
      course.max_students !== null &&
      enrolledCount >= Number(course.max_students)
    ) {
      const error = new Error(
        "Course is full. No seats are available."
      );

      error.code = "COURSE_FULL";
      throw error;
    }

    // Capacity is available, so create enrollment
    const [result] = await connection.execute(
      `INSERT INTO enrollments
       (student_id, course_id)
       VALUES (?, ?)`,
      [studentId, courseId]
    );

    // Commit transaction
    await connection.commit();

    return result.insertId;

  } catch (error) {
    // Roll back if anything fails
    await connection.rollback();
    throw error;

  } finally {
    // Always release connection
    connection.release();
  }
},


  // Check if student is already enrolled
  async findByStudentAndCourse(studentId, courseId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM enrollments
       WHERE student_id = ?
       AND course_id = ?`,
      [studentId, courseId]
    );

    return rows[0];
  },


  // Get all courses enrolled by a student
  async getByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          c.id AS course_id,
          c.title,
          c.category,
          c.level,
          c.duration,
          c.price,
          c.image,
          c.description
       FROM enrollments e
       JOIN courses c
         ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    return rows;
  },


  // Get all students enrolled in a course
  async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          u.id AS student_id,
          u.username,
          u.full_name
       FROM enrollments e
       JOIN users u
         ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    return rows;
  },


  // Get all enrollments
  async getAll() {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,

          u.id AS student_id,
          u.username,
          u.full_name,

          c.id AS course_id,
          c.title,
          c.category,
          c.level

       FROM enrollments e

       JOIN users u
         ON e.student_id = u.id

       JOIN courses c
         ON e.course_id = c.id

       ORDER BY e.enrolled_at DESC`
    );

    return rows;
  },


  // Delete enrollment
  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?`,
      [id]
    );

    return result;
  },


  // Delete a student's own enrollment
  async deleteByStudent(id, studentId) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?
       AND student_id = ?`,
      [id, studentId]
    );

    return result;
  },

};

module.exports = Enrollment;
