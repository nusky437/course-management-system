const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

// Enroll in a course
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Logged-in student's ID
    const studentId = req.user.id;

    // Check course ID
    if (!courseId) {
      return res.status(400).json({
        message: "Course ID is required",
      });
    }

    // Create enrollment
    // Capacity check + enrollment insertion
    // are handled atomically inside the model.
    const enrollmentId = await Enrollment.create(
      studentId,
      courseId
    );

    res.status(201).json({
      message: "Course enrollment successful",
      enrollmentId,
    });

  } catch (error) {
    console.error(
      "Error enrolling in course:",
      error.message
    );

    // Course not found
    if (error.code === "COURSE_NOT_FOUND") {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Already enrolled
    if (error.code === "ALREADY_ENROLLED") {
      return res.status(409).json({
        message: "You are already enrolled in this course",
        code: "ALREADY_ENROLLED",
      });
    }

    // Course is full
    if (error.code === "COURSE_FULL") {
      return res.status(409).json({
        message: "Course is full. No seats are available.",
        code: "COURSE_FULL",
      });
    }

    // Other server errors
    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get logged-in student's courses
const getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments =
      await Enrollment.getByStudent(studentId);

    res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting student enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get students enrolled in a course
const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check whether course exists
    const course = await Course.getById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const enrollments =
      await Enrollment.getByCourse(courseId);

    res.status(200).json({
      message: "Course enrollments retrieved successfully",
      course,
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting course enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// ---------- CR-008: query-parameter validation ----------

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

const SORT_FIELDS = ["date", "student", "course"];
const SORT_ORDERS = ["asc", "desc"];

// Strict YYYY-MM-DD that is also a real calendar date (rejects 2026-02-31)
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// Returns { error } or { filters }
const parseEnrollmentQuery = (query) => {
  const { q, courseId, from, to, sort, order, page, limit } = query;

  // ?q=a&q=b gives an array - reject anything that is not a plain string
  for (const [name, value] of Object.entries({
    q, courseId, from, to, sort, order, page, limit,
  })) {
    if (value !== undefined && typeof value !== "string") {
      return { error: `Invalid ${name} parameter` };
    }
  }

  // page
  let pageNumber = DEFAULT_PAGE;
  if (page !== undefined) {
    if (!/^\d+$/.test(page) || Number(page) < 1 || !Number.isSafeInteger(Number(page))) {
      return { error: "page must be a positive integer starting from 1" };
    }
    pageNumber = Number(page);
  }

  // limit
  let limitNumber = DEFAULT_LIMIT;
  if (limit !== undefined) {
    if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > MAX_LIMIT) {
      return { error: `limit must be an integer between 1 and ${MAX_LIMIT}` };
    }
    limitNumber = Number(limit);
  }

  if (!Number.isSafeInteger((pageNumber - 1) * limitNumber)) {
    return { error: "page is too large" };
  }

  // courseId
  if (courseId !== undefined && !/^[1-9]\d{0,9}$/.test(courseId)) {
    return { error: "courseId must be a positive integer" };
  }

  // dates
  if (from !== undefined && !isValidDate(from)) {
    return { error: "from must be a valid date in YYYY-MM-DD format" };
  }

  if (to !== undefined && !isValidDate(to)) {
    return { error: "to must be a valid date in YYYY-MM-DD format" };
  }

  if (from !== undefined && to !== undefined && from > to) {
    return { error: "from date cannot be later than to date" };
  }

  // sorting (default: enrollment date, newest first)
  const sortField = sort === undefined ? "date" : sort;
  if (!SORT_FIELDS.includes(sortField)) {
    return { error: `sort must be one of: ${SORT_FIELDS.join(", ")}` };
  }

  const sortOrder = order === undefined ? "desc" : order;
  if (!SORT_ORDERS.includes(sortOrder)) {
    return { error: "order must be asc or desc" };
  }

  // search text
  const search = q === undefined ? "" : q.trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    return { error: `q cannot be longer than ${MAX_SEARCH_LENGTH} characters` };
  }

  return {
    filters: {
      q: search,
      courseId: courseId === undefined ? null : Number(courseId),
      from: from === undefined ? null : from,
      to: to === undefined ? null : to,
      sort: sortField,
      order: sortOrder,
      page: pageNumber,
      limit: limitNumber,
    },
  };
};


// Get enrollments (search + filter + sort + pagination)
const getAllEnrollments = async (req, res) => {
  try {
    // 1. Validate BEFORE touching the database
    const { error, filters } = parseEnrollmentQuery(req.query);

    if (error) {
      return res.status(400).json({ message: error });
    }

    // 2. Separate COUNT(*) query (same filters, no paging)
    const total = await Enrollment.countFiltered(filters);

    // 3. Only fetch rows if there is something to show.
    //    An out-of-range page simply returns an empty array (not 404).
    const enrollments = total > 0
      ? await Enrollment.getPaginated(filters)
      : [];

    res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });

  } catch (error) {
    console.error(
      "Error getting all enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Cancel logged-in student's own enrollment
const cancelMyEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid enrollment ID",
      });
    }

    const result = await Enrollment.deleteByStudent(
      id,
      studentId
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    res.status(200).json({
      message: "Enrollment cancelled successfully",
    });

  } catch (error) {
    console.error(
      "Error cancelling enrollment:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Delete enrollment
const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const result =
      await Enrollment.delete(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    res.status(200).json({
      message: "Enrollment deleted successfully",
    });

  } catch (error) {
    console.error(
      "Error deleting enrollment:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


module.exports = {
  enrollInCourse,
  getMyEnrollments,
  getCourseEnrollments,
  getAllEnrollments,
  cancelMyEnrollment,
  deleteEnrollment,
};
