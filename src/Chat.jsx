import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase"; 
import { getAuth, signOut } from "firebase/auth";
import { 
  collection, addDoc, query, where, onSnapshot, 
  orderBy, serverTimestamp, updateDoc, doc 
} from "firebase/firestore";

const Chat = ({ user }) => {
  const auth = getAuth();
  
  // Guard authentication state
  if (!user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-blue-600 text-white font-bold animate-pulse">
      <div className="text-4xl mb-4">👑</div>
      <div>Securing Connection...</div>
    </div>
  );

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState([]); 
  const [activeChatId, setActiveChatId] = useState(null); 
  const [activeUserInfo, setActiveUserInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); 
  const scrollRef = useRef();
  const typingTimeout = useRef(null);

  //Sidebar: Fetch all users except current logged-in user
  useEffect(() => {
    const q = query(collection(db, "users"), where("uid", "!=", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Presence: Track active chat partner's status
  useEffect(() => {
    if (!activeChatId) return;
    const unsub = onSnapshot(doc(db, "users", activeChatId), (docSnap) => {
      if (docSnap.exists()) setActiveUserInfo(docSnap.data());
    });
    return () => unsub();
  }, [activeChatId]);

  // Real-time Message Fetching & Read Status
  useEffect(() => {
    if (!activeChatId) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = allMsgs.filter(m => 
        (m.uid === user.uid && m.receiverId === activeChatId) || 
        (m.uid === activeChatId && m.receiverId === user.uid)
      );
      setMessages(filtered);
      
      // Mark messages as read
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.receiverId === user.uid && data.uid === activeChatId && data.status !== "read") {
          await updateDoc(doc(db, "messages", docSnap.id), { status: "read" });
        }
      });
    });
    return () => unsubscribe();
  }, [activeChatId, user.uid]);

  //  Auto-scroll 
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //  timestamps 
  const formatTime = (timestamp) => {
    if (!timestamp) return "...";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => signOut(auth);

  //search filtering
  const filteredUsers = users.filter((u) =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  //Typing.....
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, { typingTo: e.target.value.length > 0 ? activeChatId : null });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      updateDoc(userRef, { typingTo: null });
    }, 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage,
        uid: user.uid,
        receiverId: activeChatId,
        createdAt: serverTimestamp(),
        status: "sent" 
      });
      setNewMessage("");
    } catch (err) { console.error("Send error:", err); }
  };

  const GlobalUserIcon = ({ className = "w-7 h-7" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col shadow-xl z-10">
        <div className="p-5 bg-gradient-to-r from-blue-700 to-blue-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
              <GlobalUserIcon className="w-8 h-8 opacity-90" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight italic">Empire Chat</h2>
              <p className="text-[10px] text-blue-100 font-medium">System Online</p>
            </div>
          </div>
        </div>

        {/*search bar*/}
        <div className="p-4 bg-gray-50/50">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" 
            />
            <span className="absolute left-3.5 top-3 text-gray-400">🔍</span>
          </div>
        </div>

        {/*user list*/}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredUsers.map((u) => (
            <div key={u.uid} onClick={() => setActiveChatId(u.uid)} className={`px-5 py-4 flex items-center cursor-pointer transition-all relative ${activeChatId === u.uid ? 'bg-blue-50/80 border-r-4 border-blue-600' : 'hover:bg-gray-50'}`}>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-white">
                  <GlobalUserIcon className="w-8 h-8 opacity-60" />
                </div>
                {u.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-bold text-gray-800">{u.displayName}</h3>
                <p className="text-[11px] text-gray-400 truncate">{u.typingTo === user.uid ? "typing..." : "Active now"}</p>
              </div>
            </div>
          ))}
        </div>

        {/*logout control*/}
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all border border-red-100 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            LOGOUT ACCOUNT
          </button>
        </div>
      </div>

      {/*chat window*/}
      <div className="flex-1 flex flex-col bg-[#f8f9fb]">
        {activeChatId ? (
          <>
            <div className="p-4 bg-white border-b flex items-center justify-between shadow-sm z-10">
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-lg">{activeUserInfo?.displayName}</span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {activeUserInfo?.typingTo === user.uid ? "typing..." : (activeUserInfo?.online ? "Online" : "Offline")}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.uid === user.uid ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-md shadow-sm relative ${m.uid === user.uid ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"}`}>
                    <p className="text-sm leading-relaxed pr-8">{m.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-70 italic">
                      {formatTime(m.createdAt)}
                      {m.uid === user.uid && <span>{m.status === 'read' ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-3 items-center">
              <input value={newMessage} onChange={handleTyping} placeholder="Write a message..." className="flex-1 px-5 py-3 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
              <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 shadow-md transition-all">Send</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl shadow-xl border-4 border-blue-50 animate-bounce">💬</div>
             <div className="text-center px-4">
               {/* username welcome */}
               <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Welcome, {user?.displayName?.split(" ")[0] || "Friend"}!</h2>
               <p className="italic text-sm font-medium mt-2 max-w-xs text-gray-500">
                 Connect with your contacts to start sharing secure messages in real-time.
               </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;