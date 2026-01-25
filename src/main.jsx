import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from "./context/AuthContext"; // Jo file aapne abhi banayi

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Global State Provider: Iske andar ki har file ko ab Auth ki power milegi */}
    <AuthProvider> 
      <App />
    </AuthProvider>
  </React.StrictMode>,
)