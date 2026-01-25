import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
// ... baki imports (LandingPage, Signup, Login, Chat)

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Route Logic */}
        <Route 
          path="/chat" 
          element={user ? <Chat /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}