import { useState } from "react";
import { ArrowLeft, Moon, Sun, User, Lock, Save, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTheme } from "../context/ThemeContext";
import { ROUTES } from "../constants";

export default function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Update display name
  const handleUpdateName = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess({});

    if (!displayName.trim()) {
      setErrors({ name: "Name cannot be empty" });
      return;
    }

    setIsLoading(true);
    try {
      // Update in Firebase Auth
      await updateProfile(user, { displayName: displayName.trim() });
      
      // Update in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
      });

      setSuccess({ name: "Name updated successfully!" });
    } catch (error) {
      console.error("Update name error:", error);
      setErrors({ name: "Failed to update name. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Update password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess({});

    // Validation
    if (!currentPassword) {
      setErrors({ password: "Current password is required" });
      return;
    }
    if (newPassword.length < 6) {
      setErrors({ password: "New password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ password: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccess({ password: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Update password error:", error);
      if (error.code === "auth/wrong-password") {
        setErrors({ password: "Current password is incorrect" });
      } else {
        setErrors({ password: "Failed to update password. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            Please <Link to={ROUTES.LOGIN} className="text-blue-600">login</Link> to view profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={ROUTES.CHAT}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Profile Settings
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User Info Card */}
        <div className={`rounded-lg shadow p-6 mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDark ? 'bg-blue-900' : 'bg-blue-100'
            }`}>
              <User size={32} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {user.displayName || "No Name"}
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {user.email}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
                user.emailVerified 
                  ? 'text-green-600' 
                  : 'text-yellow-600'
              }`}>
                {user.emailVerified ? (
                  <><Check size={12} /> Verified</>
                ) : (
                  "Not Verified"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Update Name Section */}
        <div className={`rounded-lg shadow p-6 mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <User size={20} />
            Update Display Name
          </h3>

          {success.name && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
            }`}>
              {success.name}
            </div>
          )}

          {errors.name && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              {errors.name}
            </div>
          )}

          <form onSubmit={handleUpdateName} className="flex gap-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className={`flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              Save
            </button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className={`rounded-lg shadow p-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <Lock size={20} />
            Change Password
          </h3>

          {success.password && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
            }`}>
              {success.password}
            </div>
          )}

          {errors.password && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              {errors.password}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock size={18} />
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
