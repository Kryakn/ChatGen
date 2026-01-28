import { Link } from "react-router-dom";
import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/*  Icon  */}
      <div className="bg-blue-600 p-5 rounded-[2.5rem] shadow-2xl shadow-blue-200 mb-8 animate-pulse">
        <MessageSquare size={50} color="white" />
      </div>

      {/* Heading */}
      <h1 className="text-7xl font-black text-slate-900 mb-6 tracking-tighter">
        Chat<span className="text-blue-600">Gen.</span>
      </h1>

      {/* Subtext */}
      <p className="text-xl text-slate-500 mb-12 max-w-lg leading-relaxed">
        The most intelligent real-time communication platform for the elite.
      </p>

      {/* Buttons Section */}
      <div className="flex gap-4">
        {/* Get Started Button */}
        <Link to="/signup">
          <button className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all">
            Get Started <ArrowRight size={20} />
          </button>
        </Link>

        {/* Sign In Button  */}
        <Link to="/login">
          <button className="border-2 border-slate-200 px-10 py-5 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            Sign In
          </button>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;