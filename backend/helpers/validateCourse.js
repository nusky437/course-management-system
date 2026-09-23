const ALLOWED_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const trimValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

const hasTwoDecimalPlacesOrLess = (value) => {
  const priceText = String(value).trim();

  return /^\d+(\.\d{1,2})?$/.test(priceText);
};

const validateCourse = (courseData) => {
  const cleanedCourse = {
    title: trimValue(courseData.title || ""),
    category: trimValue(courseData.category || ""),
    level: trimValue(courseData.level || ""),
    duration: trimValue(courseData.duration || ""),
    price: trimValue(courseData.price ?? ""),
    image: trimValue(courseData.image || ""),
    description: trimValue(courseData.description || ""),
  };

  const errors = {};

  if (!cleanedCourse.title) {
    errors.title = "Title is required";
  } else if (cleanedCourse.title.length < 3) {
    errors.title = "Title must contain at least 3 characters";
  } else if (cleanedCourse.title.length > 100) {
    errors.title = "Title cannot exceed 100 characters";
  }

  if (!cleanedCourse.category) {
    errors.category = "Category is required";
  } else if (cleanedCourse.category.length < 2) {
    errors.category = "Category must contain at least 2 characters";
  } else if (cleanedCourse.category.length > 50) {
    errors.category = "Category cannot exceed 50 characters";
  }

  if (!ALLOWED_LEVELS.includes(cleanedCourse.level)) {
    errors.level = "Level must be Beginner, Intermediate, or Advanced";
  }

  if (!cleanedCourse.duration) {
    errors.duration = "Duration is required";
  } else if (!/^[1-9]\d*\s+(Days|Weeks|Months)$/.test(cleanedCourse.duration)) {
    errors.duration = "Duration must follow the format: 5 Days, 8 Weeks, or 3 Months";
  }

  const priceNumber = Number(cleanedCourse.price);

  if (cleanedCourse.price === "") {
    errors.price = "Price is required";
  } else if (Number.isNaN(priceNumber)) {
    errors.price = "Price must be numeric";
  } else if (priceNumber < 0) {
    errors.price = "Price cannot be negative";
  } else if (priceNumber > 1000000) {
    errors.price = "Price cannot exceed 1,000,000";
  } else if (!hasTwoDecimalPlacesOrLess(cleanedCourse.price)) {
    errors.price = "Price cannot contain more than two decimal places";
  }

  if (cleanedCourse.image) {
    if (cleanedCourse.image.length > 500) {
      errors.image = "Image URL cannot exceed 500 characters";
    } else {
      try {
        const imageUrl = new URL(cleanedCourse.image);

        if (!["http:", "https:"].includes(imageUrl.protocol)) {
          errors.image = "Image must be a valid HTTP or HTTPS URL";
        }
      } catch (error) {
        errors.image = "Image must be a valid HTTP or HTTPS URL";
      }
    }
  }

  if (cleanedCourse.description.length > 1000) {
    errors.description = "Description cannot exceed 1,000 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      ...cleanedCourse,
      price: cleanedCourse.price === "" ? "" : priceNumber,
      image: cleanedCourse.image || null,
      description: cleanedCourse.description || null,
    },
  };
};

module.exports = validateCourse;
