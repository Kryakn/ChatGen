import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function VerifyEmail() {
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const verifyEmail = async () => {
      // Get action code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const actionCode = urlParams.get("oobCode");
      const mode = urlParams.get("mode");

      if (!actionCode) {
        setStatus("error");
        setMessage("Invalid verification link. Please request a new one.");
        return;
      }

      // Only handle verifyEmail mode
      if (mode !== "verifyEmail") {
        setStatus("error");
        setMessage("Invalid action. Please use the correct link.");
        return;
      }

      try {
        // Check if code is valid
        await checkActionCode(auth, actionCode);
        
        // Apply the verification
        await applyActionCode(auth, actionCode);
        
        setStatus("success");
        setMessage("Your email has been verified successfully! Redirecting...");
        
        // Redirect to login page immediately
        navigate("/login");
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        
        if (error.code === "auth/expired-action-code") {
          setMessage("This link has expired. Please request a new verification email.");
        } else if (error.code === "auth/invalid-action-code") {
          setMessage("Invalid link. Please request a new verification email.");
        } else {
          setMessage("Something went wrong. Please try again or request a new link.");
        }
      }
    };

    verifyEmail();
  }, [navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case "verifying":
        return "⏳";
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "📧";
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "verifying":
        return "Verifying Email...";
      case "success":
        return "Email Verified!";
      case "error":
        return "Verification Failed";
      default:
        return "Email Verification";
    }
  };

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

      <div className={`max-w-md w-full rounded-lg shadow p-8 text-center transition-colors ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          status === "success" 
            ? (isDark ? 'bg-green-900' : 'bg-green-100')
            : status === "error"
            ? (isDark ? 'bg-red-900' : 'bg-red-100')
            : (isDark ? 'bg-blue-900' : 'bg-blue-100')
        }`}>
          <span className="text-3xl">{getStatusIcon()}</span>
        </div>

        <h2 className={`text-2xl font-bold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {getStatusTitle()}
        </h2>

        <p className={`mb-6 ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {message}
        </p>

        {status === "success" && (
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Redirecting to login page...
          </p>
        )}

        {status === "error" && (
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}
