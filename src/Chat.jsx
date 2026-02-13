import { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { getAuth, signOut } from "firebase/auth";
import {
  collection, addDoc, query, where, onSnapshot,
  orderBy, serverTimestamp, updateDoc, doc, or, and
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Menu, X, Image, Send, Lock } from "lucide-react";
import { encryptMessage, decryptMessage, isEncrypted } from "./utils/encryption";

// Simple user icon component
function UserIcon({ className = "w-6 h-6" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  );
}

// Format timestamp to readable time
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat({ user }) {
  const auth = getAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatType, setActiveChatType] = useState("user"); // 'user' or 'group'
  const [activeUserInfo, setActiveUserInfo] = useState(null);
  const [activeGroupInfo, setActiveGroupInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // messageId
  const [editingMessage, setEditingMessage] = useState(null); // {id, text}
  const [editText, setEditText] = useState("");
  const [showMessageMenu, setShowMessageMenu] = useState(null); // messageId
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true); // E2E encryption toggle
  const [decryptedMessages, setDecryptedMessages] = useState({}); // Cache decrypted messages
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Common emojis for reactions
  const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

  // Edit time limit: 15 minutes
  const EDIT_TIME_LIMIT = 15 * 60 * 1000;

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Send browser notification
  const sendNotification = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "💬",
        badge: "💬",
        tag: "chat-message",
      });
    }
  };

  // Update document title with unread count
  useEffect(() => {
    const unreadMessages = messages.filter(
      (m) => m.uid !== user.uid && m.status !== "read"
    ).length;
    setUnreadCount(unreadMessages);

    if (unreadMessages > 0) {
      document.title = `(${unreadMessages}) Chat App`;
    } else {
      document.title = "Chat App";
    }
  }, [messages, user.uid]);

  // Show loading if no user
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-600 text-white">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading...</div>
          <div className="text-sm opacity-75">Please wait</div>
        </div>
      </div>
    );
  }

  // Fetch users list
  useEffect(() => {
    const usersQuery = query(
      collection(db, "users"),
      where("uid", "!=", user.uid)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map((doc) => doc.data());
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Fetch groups where user is member
  useEffect(() => {
    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroups(groupsList);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Fetch active user or group info
  useEffect(() => {
    if (!activeChatId) return;

    if (activeChatType === "user") {
      const unsubscribe = onSnapshot(
        doc(db, "users", activeChatId),
        (docSnap) => {
          if (docSnap.exists()) {
            setActiveUserInfo(docSnap.data());
            setActiveGroupInfo(null);
          }
        }
      );
      return () => unsubscribe();
    } else {
      const unsubscribe = onSnapshot(
        doc(db, "groups", activeChatId),
        (docSnap) => {
          if (docSnap.exists()) {
            setActiveGroupInfo({ id: docSnap.id, ...docSnap.data() });
            setActiveUserInfo(null);
          }
        }
      );
      return () => unsubscribe();
    }
  }, [activeChatId, activeChatType]);

  // Fetch messages for user chat or group chat
  useEffect(() => {
    if (!activeChatId) return;

    let messagesQuery;

    if (activeChatType === "user") {
      // Direct messages between two users
      messagesQuery = query(
        collection(db, "messages"),
        or(
          and(
            where("uid", "==", user.uid),
            where("receiverId", "==", activeChatId)
          ),
          and(
            where("uid", "==", activeChatId),
            where("receiverId", "==", user.uid)
          )
        ),
        orderBy("createdAt", "asc")
      );
    } else {
      // Group messages
      messagesQuery = query(
        collection(db, "groupMessages"),
        where("groupId", "==", activeChatId),
        orderBy("createdAt", "asc")
      );
    }

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Check for new messages and send notifications
      const previousMessages = messages;
      const newMessages = msgs.filter(
        (m) => !previousMessages.find((pm) => pm.id === m.id)
      );

      newMessages.forEach((msg) => {
        // Only notify if message is from someone else and window is not focused
        if (msg.uid !== user.uid && !document.hasFocus()) {
          const senderName =
            activeChatType === "user"
              ? activeUserInfo?.displayName || "Someone"
              : `${activeGroupInfo?.name || "Group"}: ${
                  users.find((u) => u.uid === msg.uid)?.displayName || "Someone"
                }`;
          sendNotification(
            `New message from ${senderName}`,
            msg.text || "Sent an image"
          );
        }
      });

      setMessages(msgs);

      // Mark messages as read (only for direct messages)
      if (activeChatType === "user") {
        snapshot.docs.forEach(async (docSnap) => {
          const data = docSnap.data();
          if (
            data.receiverId === user.uid &&
            data.uid === activeChatId &&
            data.status !== "read"
          ) {
            await updateDoc(doc(db, "messages", docSnap.id), {
              status: "read",
            });
          }
        });
      }
    });

    return () => unsubscribe();
  }, [activeChatId, activeChatType, user.uid]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Decrypt messages for direct chats
  useEffect(() => {
    if (activeChatType !== "user" || !activeChatId) {
      setDecryptedMessages({});
      return;
    }

    const decryptMessages = async () => {
      const decrypted = {};
      for (const msg of messages) {
        if (msg.encrypted && isEncrypted(msg.text)) {
          try {
            // Determine the other user's ID for key generation
            const otherUserId = msg.uid === user.uid ? activeChatId : msg.uid;
            const decryptedText = await decryptMessage(msg.text, user.uid, otherUserId);
            decrypted[msg.id] = decryptedText;
          } catch (err) {
            console.error("Failed to decrypt message:", err);
            decrypted[msg.id] = "[Encrypted message]";
          }
        }
      }
      setDecryptedMessages(decrypted);
    };

    decryptMessages();
  }, [messages, activeChatType, activeChatId, user.uid]);

  const handleLogout = () => signOut(auth);

  // Filter users based on search term
  const filteredUsers = users.filter((u) =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter messages based on search term
  const filteredMessages = messageSearchTerm.trim()
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(messageSearchTerm.toLowerCase())
      )
    : messages;

  // Highlight search text in message
  const highlightText = (text, searchTerm) => {
    if (!searchTerm.trim() || !text) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, { typingTo: e.target.value.length > 0 ? activeChatId : null });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(userRef, { typingTo: null });
    }, 2000);
  };

  // Send message (direct or group)
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    try {
      let messageText = newMessage.trim();

      // Encrypt message for direct chats if encryption is enabled
      if (activeChatType === "user" && encryptionEnabled) {
        const encrypted = await encryptMessage(messageText, user.uid, activeChatId);
        if (encrypted) {
          messageText = encrypted;
        }
      }

      if (activeChatType === "user") {
        // Direct message
        await addDoc(collection(db, "messages"), {
          text: messageText,
          uid: user.uid,
          receiverId: activeChatId,
          createdAt: serverTimestamp(),
          status: "sent",
          encrypted: encryptionEnabled, // Flag to identify encrypted messages
        });
      } else {
        // Group message (not encrypted - too complex for intern style)
        await addDoc(collection(db, "groupMessages"), {
          text: newMessage.trim(),
          uid: user.uid,
          groupId: activeChatId,
          createdAt: serverTimestamp(),
        });
      }
      setNewMessage("");
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  // Handle user selection on mobile - close sidebar
  const handleUserSelect = (userId) => {
    setActiveChatId(userId);
    setActiveChatType("user");
    setIsSidebarOpen(false);
  };

  // Handle group selection
  const handleGroupSelect = (groupId) => {
    setActiveChatId(groupId);
    setActiveChatType("group");
    setIsSidebarOpen(false);
  };

  // Create new group
  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) return;

    try {
      const groupData = {
        name: newGroupName.trim(),
        members: [...selectedMembers, user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "groups"), groupData);
      setNewGroupName("");
      setSelectedMembers([]);
      setShowCreateGroup(false);
    } catch (err) {
      console.error("Create group error:", err);
      alert("Failed to create group");
    }
  };

  // Toggle member selection for group
  const toggleMember = (uid) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Add reaction to message
  const addReaction = async (messageId, emoji) => {
    if (!messageId) return;

    const isGroup = activeChatType === "group";
    const collectionName = isGroup ? "groupMessages" : "messages";
    const messageRef = doc(db, collectionName, messageId);

    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      // Get current reactions or empty object
      const currentReactions = message.reactions || {};

      // Toggle reaction - if user already reacted with this emoji, remove it
      const userReactions = currentReactions[emoji] || [];
      if (userReactions.includes(user.uid)) {
        // Remove user's reaction
        const updatedUsers = userReactions.filter((uid) => uid !== user.uid);
        if (updatedUsers.length === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = updatedUsers;
        }
      } else {
        // Add user's reaction
        currentReactions[emoji] = [...userReactions, user.uid];
      }

      await updateDoc(messageRef, { reactions: currentReactions });
      setShowEmojiPicker(null);
    } catch (err) {
      console.error("Add reaction error:", err);
    }
  };

  // Get reaction count for display
  const getReactionCount = (reactions, emoji) => {
    if (!reactions || !reactions[emoji]) return 0;
    return reactions[emoji].length;
  };

  // Check if user reacted with emoji
  const hasUserReacted = (reactions, emoji) => {
    if (!reactions || !reactions[emoji]) return false;
    return reactions[emoji].includes(user.uid);
  };

  // Check if message can be edited (within 15 min)
  const canEditMessage = (message) => {
    if (message.uid !== user.uid) return false;
    if (!message.createdAt) return false;
    const messageTime = message.createdAt.toDate?.() || new Date(message.createdAt);
    return Date.now() - messageTime.getTime() < EDIT_TIME_LIMIT;
  };

  // Check if message can be deleted (only own messages)
  const canDeleteMessage = (message) => {
    return message.uid === user.uid;
  };

  // Start editing message
  const startEdit = (message) => {
    if (!canEditMessage(message)) return;
    setEditingMessage({ id: message.id, text: message.text });
    setEditText(message.text);
    setShowMessageMenu(null);
  };

  // Save edited message
  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    const isGroup = activeChatType === "group";
    const collectionName = isGroup ? "groupMessages" : "messages";
    const messageRef = doc(db, collectionName, editingMessage.id);

    try {
      await updateDoc(messageRef, {
        text: editText.trim(),
        edited: true,
        editedAt: serverTimestamp(),
      });
      setEditingMessage(null);
      setEditText("");
    } catch (err) {
      console.error("Edit error:", err);
      alert("Failed to edit message");
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    const isGroup = activeChatType === "group";
    const collectionName = isGroup ? "groupMessages" : "messages";

    try {
      // Import deleteDoc
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, collectionName, messageId));
      setShowMessageMenu(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete message");
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChatId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `${user.uid}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `chatImages/${filename}`);

      // Upload image
      await uploadBytes(storageRef, file);

      // Get download URL
      const imageUrl = await getDownloadURL(storageRef);

      // Send message with image
      await addDoc(collection(db, "messages"), {
        text: "",
        imageUrl: imageUrl,
        uid: user.uid,
        receiverId: activeChatId,
        createdAt: serverTimestamp(),
        status: "sent",
      });
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - responsive */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 md:transform-none ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold">Chat App</h2>
              <p className="text-xs text-blue-100">Online</p>
            </div>
          </div>
        </div>

        {/* Create Group Button */}
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Group
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">
              🔍
            </span>
          </div>
        </div>

        {/* Groups list */}
        {groups.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              Groups
            </div>
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => handleGroupSelect(g.id)}
                className={`p-3 flex items-center cursor-pointer border-b border-gray-50 ${
                  activeChatId === g.id && activeChatType === "group"
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">
                    {g.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {g.members?.length || 0} members
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
            Direct Messages
          </div>
          {filteredUsers.map((u) => (
            <div
              key={u.uid}
              onClick={() => handleUserSelect(u.uid)}
              className={`p-3 flex items-center cursor-pointer border-b border-gray-50 ${
                activeChatId === u.uid && activeChatType === "user"
                  ? "bg-blue-50 border-l-4 border-l-blue-600"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  <UserIcon className="w-6 h-6" />
                </div>
                {u.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 truncate">
                  {u.displayName}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {u.typingTo === user.uid
                    ? "typing..."
                    : u.online
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat window */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Connection status bar */}
        {!isOnline && (
          <div className="bg-red-500 text-white text-center py-2 text-sm font-medium">
            ⚠️ You are offline. Messages will be sent when you reconnect.
          </div>
        )}

        {activeChatId ? (
          <>
            {/* Chat header */}
            <div className="p-4 bg-white border-b flex items-center justify-between">
              <div className="ml-12 md:ml-0 flex-1">
                {activeChatType === "user" ? (
                  <>
                    <span className="font-semibold text-gray-800">
                      {activeUserInfo?.displayName}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {activeUserInfo?.typingTo === user.uid
                        ? "typing..."
                        : activeUserInfo?.online
                        ? "Online"
                        : "Offline"}
                    </span>
                    {encryptionEnabled && (
                      <span className="text-xs text-green-600 ml-2 flex items-center gap-1">
                        <Lock size={10} />
                        End-to-End Encrypted
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-gray-800">
                      {activeGroupInfo?.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {activeGroupInfo?.members?.length || 0} members
                    </span>
                  </>
                )}
              </div>

              {/* Search and Connection indicators */}
              <div className="flex items-center gap-3">
                {/* Message search */}
                {showMessageSearch ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageSearchTerm}
                      onChange={(e) => setMessageSearchTerm(e.target.value)}
                      placeholder="Search messages..."
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg w-40 md:w-56 outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setShowMessageSearch(false);
                        setMessageSearchTerm("");
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMessageSearch(true)}
                    className="text-gray-500 hover:text-blue-600 p-1"
                    title="Search messages"
                  >
                    🔍
                  </button>
                )}

                {/* Connection indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? "bg-green-500" : "bg-red-500"
                    }`}
                    title={isOnline ? "Online" : "Offline"}
                  />
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {isOnline ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Search results count */}
              {messageSearchTerm.trim() && (
                <div className="text-center text-sm text-gray-500 py-2 bg-gray-50 rounded">
                  {filteredMessages.length === 0
                    ? "No messages found"
                    : `Found ${filteredMessages.length} message${filteredMessages.length > 1 ? "s" : ""}`}
                </div>
              )}

              {filteredMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.uid === user.uid ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="relative group max-w-[75%] md:max-w-md">
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        m.uid === user.uid
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                      }`}
                    >
                      {/* Image message */}
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="Shared image"
                          className="max-w-full rounded-lg mb-2 cursor-pointer"
                          onClick={() => window.open(m.imageUrl, "_blank")}
                        />
                      )}
                      {/* Text message with highlight */}
                      {m.text && (
                        <p className="text-sm break-words">
                          {m.encrypted && decryptedMessages[m.id]
                            ? decryptedMessages[m.id] // Show decrypted text
                            : highlightText(m.text, messageSearchTerm)}
                        </p>
                      )}
                      {/* Encryption indicator */}
                      {m.encrypted && (
                        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                          <Lock size={10} />
                          <span>Encrypted</span>
                        </div>
                      )}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                          m.uid === user.uid ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {formatTime(m.createdAt)}
                        {m.edited && <span>(edited)</span>}
                        {m.uid === user.uid && (
                          <span>{m.status === "read" ? "✓✓" : "✓"}</span>
                        )}
                      </div>
                    </div>

                    {/* Reactions row */}
                    {m.reactions && Object.keys(m.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(m.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(m.id, emoji)}
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              hasUserReacted(m.reactions, emoji)
                                ? "bg-blue-100 border-blue-300"
                                : "bg-gray-100 border-gray-200"
                            }`}
                            title={`${users.length} reaction${users.length > 1 ? "s" : ""}`}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message menu button (only for own messages) */}
                    {canDeleteMessage(m) && (
                      <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowMessageMenu(showMessageMenu === m.id ? null : m.id)}
                          className="text-gray-400 hover:text-gray-600 bg-white rounded-full px-1 shadow border text-xs"
                        >
                          ⋮
                        </button>
                      </div>
                    )}

                    {/* Message menu popup */}
                    {showMessageMenu === m.id && (
                      <div className="absolute top-4 right-0 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[100px]">
                        {canEditMessage(m) && (
                          <button
                            onClick={() => startEdit(m)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        <button
                          onClick={() => deleteMessage(m.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}

                    {/* Emoji picker button */}
                    <div className="absolute -bottom-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)}
                        className="text-gray-400 hover:text-gray-600 text-sm bg-white rounded-full px-2 py-0.5 shadow border"
                      >
                        😊
                      </button>
                    </div>

                    {/* Emoji picker popup */}
                    {showEmojiPicker === m.id && (
                      <div className="absolute bottom-8 right-0 bg-white rounded-lg shadow-lg border p-2 flex gap-1 z-10">
                        {commonEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(m.id, emoji)}
                            className={`text-xl hover:bg-gray-100 rounded p-1 ${
                              hasUserReacted(m.reactions, emoji) ? "bg-blue-100" : ""
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input - Normal or Edit mode */}
            {editingMessage ? (
              <form
                onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
                className="p-4 bg-blue-50 border-t flex gap-2 items-center"
              >
                <div className="flex-1">
                  <div className="text-xs text-blue-600 mb-1">Editing message</div>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Edit your message..."
                    className="w-full px-4 py-2 bg-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editText.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </form>
            ) : (
              <form
                onSubmit={sendMessage}
                className="p-4 bg-white border-t flex gap-2 items-center"
              >
                {/* Image upload button */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Send image"
                >
                  {uploadingImage ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <Image size={20} />
                  )}
                </button>

                {/* Encryption toggle (only for direct chats) */}
                {activeChatType === "user" && (
                  <button
                    type="button"
                    onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                    title={encryptionEnabled ? "Encryption ON" : "Encryption OFF"}
                    className={`p-2 rounded-lg transition-colors ${
                      encryptionEnabled
                        ? "text-green-600 bg-green-50 hover:bg-green-100"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Lock size={18} />
                  </button>
                )}

                <input
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder={
                    isOnline
                      ? encryptionEnabled && activeChatType === "user"
                        ? "Type an encrypted message..."
                        : "Type a message..."
                      : "Waiting for connection..."
                  }
                  disabled={!isOnline}
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !isOnline}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </form>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl shadow mb-4">
              💬
            </div>
            <h2 className="text-xl font-semibold text-gray-700 text-center">
              Welcome, {user?.displayName?.split(" ")[0] || "Friend"}!
            </h2>
            <p className="text-sm text-gray-500 mt-1 text-center">
              Select a user to start chatting
            </p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create New Group</h3>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createGroup} className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Members ({selectedMembers.length} selected)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {users.map((u) => (
                    <label
                      key={u.uid}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.uid)}
                        onChange={() => toggleMember(u.uid)}
                        className="mr-3 h-4 w-4 text-blue-600"
                      />
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{u.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}