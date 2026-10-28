const express = require("express");

const router = express.Router();

const {
  getUserByUsername,
  getUserById,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} = require("../controllers/userController");

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.put("/me/password", changeMyPassword);

// Get user by username
router.get(
  "/username/:username",
  getUserByUsername
);


// Get user by ID
router.get(
  "/:id",
  getUserById
);


module.exports = router;
