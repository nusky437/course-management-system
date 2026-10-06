const db = require("../config/db");

const Course = {

  // Get all courses with seat availability
  async getAll() {
    const [rows] = await db.execute(`
      SELECT
        c.*,
        COUNT(e.id) AS enrolled_count,

        CASE
          WHEN c.max_students IS NULL THEN NULL
          ELSE c.max_students - COUNT(e.id)
        END AS seats_remaining,

        CASE
          WHEN c.max_students IS NULL THEN FALSE
          WHEN COUNT(e.id) >= c.max_students THEN TRUE
          ELSE FALSE
        END AS is_full

      FROM courses c

      LEFT JOIN enrollments e
        ON e.course_id = c.id

      GROUP BY c.id
      ORDER BY c.id DESC
    `);

    return rows;
  },


  // Get one course with seat availability
  async getById(id) {
    const [rows] = await db.execute(`
      SELECT
        c.*,
        COUNT(e.id) AS enrolled_count,

        CASE
          WHEN c.max_students IS NULL THEN NULL
          ELSE c.max_students - COUNT(e.id)
        END AS seats_remaining,

        CASE
          WHEN c.max_students IS NULL THEN FALSE
          WHEN COUNT(e.id) >= c.max_students THEN TRUE
          ELSE FALSE
        END AS is_full

      FROM courses c

      LEFT JOIN enrollments e
        ON e.course_id = c.id

      WHERE c.id = ?

      GROUP BY c.id
    `, [id]);

    return rows[0];
  },


  // Find a course by title. Used for duplicate title validation.
  async getByTitle(title) {
    const [rows] = await db.execute(
      "SELECT * FROM courses WHERE LOWER(title) = LOWER(?) LIMIT 1",
      [title]
    );

    return rows[0];
  },


  // Create course
  async create(course) {

    const {
      title,
      category,
      level,
      duration,
      price,
      image,
      description,
      max_students,
    } = course;

    const [result] = await db.execute(
      `INSERT INTO courses
       (
         title,
         category,
         level,
         duration,
         price,
         image,
         description,
         max_students
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students,
      ]
    );

    return result.insertId;
  },


  // Update course
  async update(id, course) {

    const {
      title,
      category,
      level,
      duration,
      price,
      image,
      description,
      max_students,
    } = course;

    const [result] = await db.execute(
      `UPDATE courses
       SET title = ?,
           category = ?,
           level = ?,
           duration = ?,
           price = ?,
           image = ?,
           description = ?,
           max_students = ?
       WHERE id = ?`,
      [
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students,
        id,
      ]
    );

    return result;
  },


  // Delete course
  async delete(id) {

    const [result] = await db.execute(
      "DELETE FROM courses WHERE id = ?",
      [id]
    );

    return result;
  },

};

module.exports = Course;