import { useEffect, useState } from "react";

import api from "../services/api";
import { getUser, updateUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const validateFullName = (value) => {
  const fullName = value.trim();
  const length = Array.from(fullName).length;

  if (length < 3 || length > 100) {
    return "Full name must be between 3 and 100 characters.";
  }

  return "";
};

const validatePassword = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = "Enter your current password.";
  }

  if (!newPassword) {
    errors.newPassword = "Enter a new password.";
  } else if (Array.from(newPassword).length < 8) {
    errors.newPassword = "Password must be at least 8 characters.";
  } else if (new TextEncoder().encode(newPassword).length > 72) {
    errors.newPassword = "Password must not exceed bcrypt's 72-byte limit.";
  } else if (newPassword === currentPassword) {
    errors.newPassword = "New password must be different from your current password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

function Profile() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileFieldError, setProfileFieldError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/users/me");
        setProfile(response.data.user);
        setFullName(response.data.user.full_name);
      } catch (error) {
        setProfileError(
          error.response?.data?.message || "Profile could not be loaded."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileFieldError("");

    const validationError = validateFullName(fullName);
    if (validationError) {
      setProfileFieldError(validationError);
      return;
    }

    setProfileSaving(true);
    try {
      const response = await api.put("/users/me", {
        full_name: fullName.trim(),
      });
      const updatedProfile = response.data.user;
      setProfile(updatedProfile);
      setFullName(updatedProfile.full_name);

      const storedUser = getUser();
      if (storedUser) {
        updateUser({ ...storedUser, full_name: updatedProfile.full_name });
      }

      setProfileSuccess(response.data.message || "Profile updated successfully.");
    } catch (error) {
      setProfileFieldError(error.response?.data?.errors?.full_name || "");
      setProfileError(
        error.response?.data?.errors?.full_name
          ? ""
          : error.response?.data?.message || "Profile could not be updated."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
    setPasswordErrors((current) => ({ ...current, [name]: "" }));
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const validationErrors = validatePassword(passwords);
    setPasswordErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await api.put("/users/me/password", passwords);
      setPasswordSuccess(response.data.message || "Password changed successfully.");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    } catch (error) {
      setPasswordErrors(error.response?.data?.errors || {});
      setPasswordError(
        error.response?.data?.message || "Password could not be changed."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="container profile-page">
        <div className="page-header">
          <div>
            <h1>My Profile</h1>
            <p className="page-subtitle">
              View your account details and manage your sign-in information.
            </p>
          </div>
        </div>

        {profileLoading && <p className="loading">Loading profile...</p>}
        {profileError && <p className="error" role="alert">{profileError}</p>}

        {!profileLoading && profile && (
          <>
            <section className="section-card">
              <div className="section-card-header">
                <h2>Profile information</h2>
              </div>

              <dl className="profile-details">
                <div>
                  <dt>User ID</dt>
                  <dd>{profile.id}</dd>
                </div>
                <div>
                  <dt>Username</dt>
                  <dd>{profile.username}</dd>
                </div>
                <div>
                  <dt>Full name</dt>
                  <dd>{profile.full_name}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd><span className="role-badge">{profile.role}</span></dd>
                </div>
              </dl>
            </section>

            <section className="section-card profile-section">
              <div className="section-card-header">
                <h2>Change full name</h2>
              </div>
              {profileSuccess && (
                <p className="success" role="status">{profileSuccess}</p>
              )}
              <form className="form profile-form" onSubmit={handleProfileSubmit}>
                <div className="form-group">
                  <label htmlFor="full_name">Full name</label>
                  <input
                    id="full_name"
                    name="full_name"
                    className="input"
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      setProfileFieldError("");
                      setProfileSuccess("");
                    }}
                    autoComplete="name"
                    aria-invalid={Boolean(profileFieldError)}
                    aria-describedby={profileFieldError ? "full-name-error" : undefined}
                    disabled={profileSaving}
                  />
                  {profileFieldError && (
                    <span id="full-name-error" className="field-error" role="alert">
                      {profileFieldError}
                    </span>
                  )}
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving..." : "Save full name"}
                  </button>
                </div>
              </form>
            </section>

            <section className="section-card profile-section">
              <div className="section-card-header">
                <h2>Change password</h2>
              </div>
              {passwordError && (
                <p className="error" role="alert">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="success" role="status">{passwordSuccess}</p>
              )}
              <form className="form profile-form" onSubmit={handlePasswordSubmit}>
                {[
                  ["currentPassword", "Current password", "current-password"],
                  ["newPassword", "New password", "new-password"],
                  ["confirmPassword", "Confirm new password", "new-password"],
                ].map(([name, label, autoComplete]) => (
                  <div className="form-group" key={name}>
                    <label htmlFor={name}>{label}</label>
                    <input
                      id={name}
                      name={name}
                      className="input"
                      type="password"
                      value={passwords[name]}
                      onChange={handlePasswordChange}
                      autoComplete={autoComplete}
                      aria-invalid={Boolean(passwordErrors[name])}
                      aria-describedby={
                        passwordErrors[name] ? `${name}-error` : undefined
                      }
                      disabled={passwordSaving}
                    />
                    {passwordErrors[name] && (
                      <span id={`${name}-error`} className="field-error" role="alert">
                        {passwordErrors[name]}
                      </span>
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Changing..." : "Change password"}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}

export default Profile;
