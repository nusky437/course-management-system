import { useEffect, useState } from "react";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CourseCard from "../components/CourseCard";

function Courses() {
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // ---------- Load courses from backend ----------
  useEffect(() => {
    const getCourses = async () => {
      try {
        const response = await api.get("/courses");

        setCourses(response.data.courses || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load courses"
        );
      } finally {
        setLoading(false);
      }
    };

    getCourses();
  }, []);

  // ---------- Build category list ----------
  const categories = [
    "All",
    ...new Set(
      courses
        .map((course) => course.category)
        .filter(Boolean)
    ),
  ];

  // ---------- Level list ----------
  const levels = [
    "All",
    "Beginner",
    "Intermediate",
    "Advanced",
  ];

  // ---------- Apply filters ----------
  const filteredCourses = courses.filter((course) => {
    const search = searchText.trim().toLowerCase();

    // Null-safe values
    const title = String(course.title || "").toLowerCase();
    const category = String(course.category || "").toLowerCase();
    const level = String(course.level || "").toLowerCase();
    const description = String(
      course.description || ""
    ).toLowerCase();
    const duration = String(
      course.duration || ""
    ).toLowerCase();

    // Search
    const matchesSearch =
      search === "" ||
      title.includes(search) ||
      category.includes(search) ||
      level.includes(search) ||
      description.includes(search) ||
      duration.includes(search);

    // Category
    const matchesCategory =
      selectedCategory === "All" ||
      course.category === selectedCategory;

    // Level
    const matchesLevel =
      selectedLevel === "All" ||
      course.level === selectedLevel;

    // Price
    const coursePrice = Number(course.price);

    const matchesMinPrice =
      minPrice === "" ||
      (!Number.isNaN(coursePrice) &&
        coursePrice >= Number(minPrice));

    const matchesMaxPrice =
      maxPrice === "" ||
      (!Number.isNaN(coursePrice) &&
        coursePrice <= Number(maxPrice));

    // AND logic
    return (
      matchesSearch &&
      matchesCategory &&
      matchesLevel &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });

  // ---------- Clear all filters ----------
  const clearAllFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setMinPrice("");
    setMaxPrice("");
  };

  // ---------- Check active filters ----------
  const hasActiveFilters =
    searchText.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedLevel !== "All" ||
    minPrice !== "" ||
    maxPrice !== "";

  return (
    <>
      <Navbar />

      <div className="container">

        <div className="page-header">
          <div>
            <h1>Our Courses</h1>

            <p className="page-subtitle">
              Browse the full catalogue and view the details of any course.
            </p>
          </div>
        </div>

        {/* ---------- Filters ---------- */}

        {!loading &&
          !error &&
          courses.length > 0 && (
            <div className="filter-bar">

              {/* Search */}
              <input
                type="text"
                className="input"
                placeholder="Search by title, category, level, description or duration..."
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
              />

              {/* Category */}
              <select
                className="input"
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value)
                }
              >
                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>

              {/* Level */}
              <select
                className="input"
                value={selectedLevel}
                onChange={(event) =>
                  setSelectedLevel(event.target.value)
                }
              >
                {levels.map((level) => (
                  <option
                    key={level}
                    value={level}
                  >
                    {level}
                  </option>
                ))}
              </select>

              {/* Minimum Price */}
              <input
                type="number"
                className="input"
                placeholder="Minimum price"
                min="0"
                value={minPrice}
                onChange={(event) =>
                  setMinPrice(event.target.value)
                }
              />

              {/* Maximum Price */}
              <input
                type="number"
                className="input"
                placeholder="Maximum price"
                min="0"
                value={maxPrice}
                onChange={(event) =>
                  setMaxPrice(event.target.value)
                }
              />

            </div>
          )}

        {/* ---------- Active Filters ---------- */}

        {!loading &&
          !error &&
          courses.length > 0 &&
          hasActiveFilters && (
            <div className="active-filters">

              <div className="filter-chips">

                {searchText.trim() !== "" && (
                  <span className="filter-chip">
                    Search: {searchText}
                  </span>
                )}

                {selectedCategory !== "All" && (
                  <span className="filter-chip">
                    Category: {selectedCategory}
                  </span>
                )}

                {selectedLevel !== "All" && (
                  <span className="filter-chip">
                    Level: {selectedLevel}
                  </span>
                )}

                {minPrice !== "" && (
                  <span className="filter-chip">
                    Min Price: {minPrice}
                  </span>
                )}

                {maxPrice !== "" && (
                  <span className="filter-chip">
                    Max Price: {maxPrice}
                  </span>
                )}

              </div>

              <button
                type="button"
                className="clear-filters"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </button>

            </div>
          )}

        {/* ---------- Loading ---------- */}

        {loading && (
          <p className="loading">
            Loading courses...
          </p>
        )}

        {/* ---------- Error ---------- */}

        {error && !loading && (
          <p className="error">
            {error}
          </p>
        )}

        {/* ---------- No courses exist ---------- */}

        {!loading &&
          !error &&
          courses.length === 0 && (
            <p className="empty">
              There are no courses available at the moment.
            </p>
          )}

        {/* ---------- No matching courses ---------- */}

        {!loading &&
          !error &&
          courses.length > 0 &&
          filteredCourses.length === 0 && (
            <p className="empty">
              No courses match the selected filters.
              Try changing or clearing your filters.
            </p>
          )}

        {/* ---------- Result counter ---------- */}

        {!loading &&
          !error &&
          courses.length > 0 && (
            <>
              <p className="result-count">
                Showing {filteredCourses.length} of{" "}
                {courses.length} courses
              </p>

              {/* ---------- Course list ---------- */}

              {filteredCourses.length > 0 && (
                <div className="course-grid">

                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                    />
                  ))}

                </div>
              )}
            </>
          )}

      </div>

      <Footer />
    </>
  );
}

export default Courses;