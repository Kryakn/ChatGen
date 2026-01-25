import React, { useState } from 'react';
import { MessageSquare, ArrowRight, LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';

function App() {
  const [step, setStep] = useState('landing'); // landing, login, signup

  // COMPONENT: Landing Page
  const Landing = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-blue-600 p-5 rounded-[2.5rem] shadow-2xl shadow-blue-200 mb-8 animate-pulse">
        <MessageSquare size={50} color="white" />
      </div>
      <h1 className="text-7xl font-black text-slate-900 mb-6 tracking-tighter">
        Chat<span className="text-blue-600">Gen.</span>
      </h1>
      <p className="text-xl text-slate-500 mb-12 max-w-lg leading-relaxed">
        The most intelligent real-time communication platform for the elite.
      </p>
      <div className="flex gap-4">
        <button onClick={() => setStep('signup')} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2">
          Get Started <ArrowRight size={20} />
        </button>
        <button onClick={() => setStep('login')} className="border-2 border-slate-200 px-10 py-5 rounded-2xl font-bold hover:bg-slate-50 transition-all">
          Sign In
        </button>
      </div>
    </div>
  );

  // COMPONENT: Auth Form
  const AuthForm = ({ type }) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
        <h2 className="text-4xl font-bold text-slate-900 mb-2 text-center">
          {type === 'login' ? 'Welcome Back' : 'Join the Elite'}
        </h2>
        <p className="text-slate-500 text-center mb-10 font-medium">Step into the future of chat</p>
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {type === 'signup' && (
            <div className="relative"><User className="absolute left-4 top-4 text-slate-400" size={20} /><input type="text" placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
          )}
          <div className="relative"><Mail className="absolute left-4 top-4 text-slate-400" size={20} /><input type="email" placeholder="Email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
          <div className="relative"><Lock className="absolute left-4 top-4 text-slate-400" size={20} /><input type="password" placeholder="Password" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
          <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all mt-4 flex items-center justify-center gap-2">
            {type === 'login' ? 'Sign In' : 'Create Account'} <LogIn size={20} />
          </button>
        </form>
        <p className="mt-8 text-center text-slate-600">
          {type === 'login' ? "New here? " : "Already a member? "}
          <span className="text-blue-600 font-bold cursor-pointer hover:underline" onClick={() => setStep(type === 'login' ? 'signup' : 'login')}>
            {type === 'login' ? 'Register' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="font-sans antialiased text-slate-900">
      {step === 'landing' && <Landing />}
      {step === 'login' && <AuthForm type="login" />}
      {step === 'signup' && <AuthForm type="signup" />}
    </div>
  );
}

export default App;