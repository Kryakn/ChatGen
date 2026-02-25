import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "./context/ThemeContext";

import LandingPage from "./components/LandingPage";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";

// Component to protect chat route - only checks authentication
function ProtectedChatRoute({ user }) {
  if (!user) {
    return <Navigate to="/login" />;
  }
  return <Chat user={user} />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-600 text-white">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading...</div>
          <div className="text-sm opacity-75">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/chat"
          element={<ProtectedChatRoute user={user} />}
        />
      </Routes>
    </Router>
  );
}