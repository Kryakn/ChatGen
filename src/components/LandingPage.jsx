import { Link } from "react-router-dom";
import { MessageSquare, ArrowRight, Moon, Sun } from 'lucide-react';
import { useTheme } from "../context/ThemeContext";

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-full transition-colors ${
          isDark 
            ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/*  Icon  */}
      <div className="bg-blue-600 p-5 rounded-[2.5rem] shadow-2xl shadow-blue-500/30 mb-8 animate-pulse">
        <MessageSquare size={50} color="white" />
      </div>

      {/* Heading */}
      <h1 className={`text-7xl font-black mb-6 tracking-tighter transition-colors ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}>
        Chat<span className="text-blue-600">Gen.</span>
      </h1>

      {/* Subtext */}
      <p className={`text-xl mb-12 max-w-lg leading-relaxed transition-colors ${
        isDark ? 'text-gray-400' : 'text-slate-500'
      }`}>
        The most intelligent real-time communication platform for the elite.
      </p>

      {/* Buttons Section */}
      <div className="flex gap-4">
        {/* Get Started Button */}
        <Link to="/signup">
          <button className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-600/30">
            Get Started <ArrowRight size={20} />
          </button>
        </Link>

        {/* Sign In Button  */}
        <Link to="/login">
          <button className={`px-10 py-5 rounded-2xl font-bold transition-all border-2 ${
            isDark 
              ? 'border-gray-600 text-white hover:bg-gray-800' 
              : 'border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}>
            Sign In
          </button>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;