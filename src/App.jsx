import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import LandingPage from "./components/LandingPage"; 
import Signup from "./Signup";
import Login from "./Login";
import Chat from "./Chat";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase auth observer: Ye check karta hai ki King login hai ya nahi
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Professional Loading State taaki white screen na aaye
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-600 text-white font-bold animate-pulse">
     Authenticating Aryan...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        
        {/* FIXED: 'user={user}' pass kiya taaki Chat component ko data mile */}
        <Route 
          path="/chat" 
          element={user ? <Chat user={user} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;