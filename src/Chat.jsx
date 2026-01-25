import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase'; //
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Send, LogOut } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const user = auth.currentUser;
  const scrollRef = useRef();
  const navigate = useNavigate();

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage,
        uid: user.uid,
        displayName: user.displayName || "User", //
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error("Firestore Error:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f3f4f6] font-sans">
      <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'C'}
          </div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">ChatGen</h2>
        </div>
        <button onClick={() => { auth.signOut(); navigate('/login'); }} className="text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={22} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.uid === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
              msg.uid === user.uid 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
            }`}>
              <p className="text-[10px] font-bold opacity-60 mb-1">{msg.displayName}</p>
              <p className="text-sm">{msg.text}</p>
              
              {/* NEW: Timestamp Logic */}
              <div className={`text-[9px] mt-1 opacity-50 text-right font-medium ${msg.uid === user.uid ? 'text-blue-100' : 'text-slate-500'}`}>
                {msg.createdAt ? (
                  new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                ) : (
                  "..."
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <footer className="p-4 bg-white border-t">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <input 
            type="text" value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 py-3 px-5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md">
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default Chat;