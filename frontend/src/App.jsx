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

<<<<<<< HEAD
// Component to protect chat route - bypass email verification for development
=======
// Component to protect chat route - only checks authentication
>>>>>>> 345957dfeeb150343505f969a8ba47a5ae5c9bf1
function ProtectedChatRoute({ user }) {
  if (!user) {
    return <Navigate to="/login" />;
  }
<<<<<<< HEAD
  // For development: skip email verification
  // if (!user.emailVerified) {
  //   return (
  //     <div className="h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center p-8 bg-white rounded-lg shadow max-w-md">
  //         <div className="text-4xl mb-4">✉️</div>
  //         <h2 className="text-xl font-bold text-gray-900 mb-2">
  //           Email Not Verified
  //         </h2>
  //         <p className="text-gray-600 mb-4">
  //           Please verify your email address to access the chat.
  //         </p>
  //         <a
  //           href="/login"
  //           className="text-blue-600 hover:underline"
  //           onClick={() => auth.signOut()}
  //         >
  //           Back to Login
  //         </a>
  //       </div>
  //     </div>
  //   );
  // }
=======
>>>>>>> 345957dfeeb150343505f969a8ba47a5ae5c9bf1
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