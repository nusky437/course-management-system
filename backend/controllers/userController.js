const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const hashPassword = require("../helpers/hashPassword");

const PASSWORD_FAILURE_LIMIT = 5;
const PASSWORD_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const failedPasswordAttempts = new Map();

const isAdmin = (user) => user.role === "admin";

const canAccessUser = (requestUser, targetUserId) =>
  isAdmin(requestUser) || String(requestUser.id) === String(targetUserId);

const sendLockedResponse = (res, lockUntil) => {
  const retryAfter = Math.max(1, Math.ceil((lockUntil - Date.now()) / 1000));

  res.set("Retry-After", String(retryAfter));
  return res.status(429).json({
    message: "Too many incorrect password attempts. Please try again later.",
  });
};

const fieldErrors = (res, errors) =>
  res.status(400).json({
    message: "Please correct the highlighted fields.",
    errors,
  });

// Get user by username
const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!canAccessUser(req.user, user.id)) {
      return res.status(403).json({
        message: "Access denied. You may only view your own profile.",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "User found",
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error("Error finding user:", error.message);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!canAccessUser(req.user, user.id)) {
      return res.status(403).json({
        message: "Access denied. You may only view your own profile.",
      });
    }

    res.status(200).json({
      message: "User found",
      user,
    });

  } catch (error) {
    console.error("Error finding user:", error.message);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error loading profile:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateMyProfile = async (req, res) => {
  const fullName =
    typeof req.body?.full_name === "string" ? req.body.full_name.trim() : "";
  const nameLength = Array.from(fullName).length;

  if (nameLength < 3 || nameLength > 100) {
    return fieldErrors(res, {
      full_name: "Full name must be between 3 and 100 characters.",
    });
  }

  try {
    await User.updateFullName(req.user.id, fullName);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const changeMyPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const errors = {};

  if (typeof currentPassword !== "string" || !currentPassword) {
    errors.currentPassword = "Enter your current password.";
  }

  if (typeof newPassword !== "string" || !newPassword) {
    errors.newPassword = "Enter a new password.";
  } else if (Array.from(newPassword).length < 8) {
    errors.newPassword = "Password must be at least 8 characters.";
  } else if (Buffer.byteLength(newPassword, "utf8") > 72) {
    errors.newPassword = "Password must not exceed bcrypt's 72-byte limit.";
  }

  if (typeof confirmPassword !== "string" || !confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (typeof newPassword === "string" && confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return fieldErrors(res, errors);
  }

  const now = Date.now();
  let attempts = failedPasswordAttempts.get(String(req.user.id));

  if (attempts && attempts.lockUntil <= now) {
    failedPasswordAttempts.delete(String(req.user.id));
    attempts = undefined;
  }

  if (attempts?.count >= PASSWORD_FAILURE_LIMIT) {
    return sendLockedResponse(res, attempts.lockUntil);
  }

  try {
    const user = await User.findByIdWithPassword(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentPasswordIsValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!currentPasswordIsValid) {
      const currentAttempts = failedPasswordAttempts.get(String(req.user.id));
      const nextAttempts = currentAttempts
        ? { ...currentAttempts, count: currentAttempts.count + 1 }
        : {
            count: 1,
            lockUntil: now + PASSWORD_FAILURE_WINDOW_MS,
          };

      failedPasswordAttempts.set(String(req.user.id), nextAttempts);

      if (nextAttempts.count >= PASSWORD_FAILURE_LIMIT) {
        return sendLockedResponse(res, nextAttempts.lockUntil);
      }

      return res.status(401).json({
        message: "Current password is incorrect.",
        errors: { currentPassword: "Current password is incorrect." },
      });
    }

    failedPasswordAttempts.delete(String(req.user.id));

    if (await bcrypt.compare(newPassword, user.password)) {
      return fieldErrors(res, {
        newPassword: "New password must be different from your current password.",
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await User.updatePassword(req.user.id, passwordHash);

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Error changing password:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  getUserByUsername,
  getUserById,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
