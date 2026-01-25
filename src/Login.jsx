import React, { useState } from 'react';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase'; //
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("King Logged In!");
      navigate('/chat'); // Login ke baad seedha dashboard
    } catch (error) {
      alert("Invalid Credentials, King. Check again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
        <h2 className="text-4xl font-bold text-slate-900 mb-2 text-center">Welcome Back</h2>
        <p className="text-slate-500 text-center mb-10 font-medium">Your Chats are waiting</p>
        
        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="email" placeholder="Email Address" required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="password" placeholder="Password" required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all mt-4 flex items-center justify-center gap-2 text-lg">
            Sign In <LogIn size={20} />
          </button>
        </form>

        <p className="mt-8 text-center text-slate-600">
          New here? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;