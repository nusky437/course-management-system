import { Link } from "react-router-dom";
import { FaEye } from "react-icons/fa";

function CourseCard({ course }) {

  const isFull =
    course.max_students !== null &&
    Number(course.enrolled_count) >= Number(course.max_students);

  return (

    <article className="course-card">

      {/* Course image from the database */}
      <img
        src={course.image}
        alt={course.title}
        className="course-card-image"
        loading="lazy"
      />


      <div className="course-card-body">

        <div className="course-card-tags">
          <span className="tag tag-category">
            {course.category}
          </span>

          <span className="tag tag-level">
            {course.level}
          </span>
        </div>


        <h3 className="course-card-title">
          {course.title}
        </h3>


        {/* Short summary - we trim the long description */}
        <p className="course-card-summary">
          {course.description?.slice(0, 110)}
          {course.description?.length > 110 ? "..." : ""}
        </p>


        <ul className="course-card-meta">
          <li>
            <strong>Duration:</strong> {course.duration}
          </li>

          <li>
            <strong>Price:</strong> Rs. {course.price}
          </li>

          {/* Course availability */}
          <li>
            <strong>Availability:</strong>{" "}

            {course.max_students === null ? (
              <span className="course-availability unlimited">
                Unlimited
              </span>
            ) : isFull ? (
              <span className="course-availability full">
                Course Full
              </span>
            ) : (
              <span className="course-availability available">
                {course.enrolled_count} / {course.max_students} students
              </span>
            )}
          </li>
        </ul>


        <Link
          to={`/courses/${course.id}`}
          className="btn btn-primary btn-block"
        >
          <FaEye />
          View Details
        </Link>

      </div>

    </article>
  );
}

export default CourseCard;