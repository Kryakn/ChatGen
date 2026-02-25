import { useState } from "react";
import { Mail, Lock, LogIn, ArrowLeft, Moon, Sun, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { MIN_PASSWORD_LENGTH, ROUTES } from "../constants";

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return "";
}

function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return "";
}

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  
  // Check if user came from email verification
  const searchParams = new URLSearchParams(location.search);
  const isVerified = searchParams.get("verified") === "true";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setResetEmailSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }

      setErrors((prev) => ({ ...prev, general: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Get user data
      const user = userCredential.user;

      // Save user to Firestore (email verification temporarily disabled)
      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: user.displayName || "",
          email: user.email.toLowerCase(),
          emailVerified: true,
          createdAt: serverTimestamp(),
        });
      } catch (firestoreError) {
        // If document already exists, that's fine - just log it
        console.log("User document may already exist:", firestoreError.message);
      }

      navigate(ROUTES.CHAT);
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Invalid email or password. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }

      setErrors((prev) => ({ ...prev, general: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`absolute top-6 right-6 p-3 rounded-full transition-colors ${
            isDark 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
          }`}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className={`p-8 rounded-lg shadow w-full max-w-md transition-colors ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          {resetEmailSent ? (
            // Success state
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDark ? 'bg-green-900' : 'bg-green-100'
              }`}>
                <span className="text-3xl">✉️</span>
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Check Your Email
              </h2>
              <p className={`mb-4 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                We have sent a password reset link to{" "}
                <strong>{formData.email}</strong>
              </p>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setFormData((prev) => ({ ...prev, email: "" }));
                }}
                className="text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          ) : (
            // Forgot password form
            <>
              <button
                onClick={() => setShowForgotPassword(false)}
                className={`flex items-center mb-4 ${
                  isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ArrowLeft size={20} className="mr-1" />
                Back
              </button>

              <h2 className={`text-2xl font-bold mb-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Reset Password
              </h2>
              <p className={`mb-6 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Enter your email to receive a reset link
              </p>

              {errors.general && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                }`}>
                  {errors.general}
                </div>
              )}

              <form className="space-y-4" onSubmit={handlePasswordReset}>
                <div>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-3 ${
                        isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}
                      size={20}
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-200'
                      } ${errors.email ? "border-red-300" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-full transition-colors ${
          isDark 
            ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
            : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
        }`}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className={`p-8 rounded-lg shadow w-full max-w-md transition-colors ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className={`text-2xl font-bold mb-1 text-center ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Welcome Back
        </h2>
        <p className={`text-center mb-6 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>Sign in to continue</p>

        {/* Show success message if email was verified */}
        {isVerified && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
          }`}>
            ✅ Email verified successfully! Please sign in to continue.
          </div>
        )}

        {/* Show error only if not coming from verification */}
        {errors.general && !isVerified && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
          }`}>
            {errors.general}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <div className="relative">
              <Mail className={`absolute left-3 top-3 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`} size={20} />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-200'
                } ${errors.email ? "border-red-300" : ""}`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <Lock className={`absolute left-3 top-3 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`} size={20} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-200'
                } ${errors.password ? "border-red-300" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${
                  isDark 
                    ? 'text-gray-400 hover:text-gray-200' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? "Signing In..." : "Sign In"}
            {!isLoading && <LogIn size={20} />}
          </button>
        </form>

        <p className={`mt-6 text-center text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          New here?{" "}
          <Link to={ROUTES.SIGNUP} className="text-blue-600 hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
