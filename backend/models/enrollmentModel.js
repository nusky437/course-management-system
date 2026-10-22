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


  // ---------- CR-008: search / filter / sort / paginate ----------

  // Columns the client is allowed to sort by (allowlist).
  // The client sends only the KEY ("date"); the SQL column is chosen here,
  // so no client text is ever placed inside the SQL string.
  SORT_COLUMNS: {
    date: "e.enrolled_at",
    student: "u.full_name",
    course: "c.title",
  },

  // Escape LIKE wildcards so that % and _ typed by the user
  // are matched literally. "!" is the escape character.
  escapeLike(value) {
    return value.replace(/[!%_]/g, "!$&");
  },

  // Builds the WHERE clause + parameter list.
  // BOTH the data query and the COUNT(*) query use this one function,
  // so they always apply identical filters.
  buildFilter({ q, courseId, from, to }) {
    const conditions = [];
    const params = [];

    if (q) {
      const pattern = `%${Enrollment.escapeLike(q)}%`;
      conditions.push(
        "(u.full_name LIKE ? ESCAPE '!' OR u.username LIKE ? ESCAPE '!')"
      );
      params.push(pattern, pattern);
    }

    if (courseId) {
      conditions.push("e.course_id = ?");
      params.push(courseId);
    }

    // "from" is inclusive: >= 00:00:00 of that day
    if (from) {
      conditions.push("e.enrolled_at >= ?");
      params.push(`${from} 00:00:00`);
    }

    // "to" is inclusive for the whole day: < 00:00:00 of the NEXT day
    if (to) {
      const next = new Date(`${to}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      conditions.push("e.enrolled_at < ?");
      params.push(`${next.toISOString().slice(0, 10)} 00:00:00`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    return { where, params };
  },

  // Separate COUNT(*) query - total rows matching the filters
  async countFiltered(filters) {
    const { where, params } = Enrollment.buildFilter(filters);

    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       ${where}`,
      params
    );

    return Number(rows[0].total);
  },

  // One page of enrollments (LIMIT / OFFSET)
  async getPaginated(filters) {
    const { sort, order, page, limit } = filters;
    const { where, params } = Enrollment.buildFilter(filters);

    // Both values come from allowlists (validated in the controller)
    const sortColumn = Enrollment.SORT_COLUMNS[sort];
    const direction = order === "asc" ? "ASC" : "DESC";

    const offset = (page - 1) * limit;

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
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id

       ${where}

       ORDER BY ${sortColumn} ${direction}, e.id ${direction}
       LIMIT ? OFFSET ?`,
      // LIMIT/OFFSET sent as strings: mysql2 prepared statements
      // reject JS numbers here on MySQL 8.0.22+
      [...params, String(limit), String(offset)]
    );

    return rows;
  },

  // Count distinct students who have at least one enrollment
  async countDistinctStudents() {
    const [rows] = await db.execute(
      "SELECT COUNT(DISTINCT student_id) AS count FROM enrollments"
    );

    return Number(rows[0].count);
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
