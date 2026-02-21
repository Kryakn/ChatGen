// App Constants - Intern Style
// Centralized values used across the app

// App Info
export const APP_NAME = "ChatGen";
export const APP_TAGLINE = "Real-time communication platform for the elite";

// Time Limits (in milliseconds)
export const EDIT_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes

// Length Limits
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_GROUP_NAME_LENGTH = 50;
export const MIN_PASSWORD_LENGTH = 6;

// Firebase Collection Names
export const COLLECTIONS = {
  USERS: "users",
  MESSAGES: "messages",
  GROUPS: "groups",
  GROUP_MESSAGES: "groupMessages",
  CONTACTS: "contacts",
};

// Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  CHAT: "/chat",
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  THEME: "theme",
  REMOVED_CHATS: "removedChats",
};

// Encryption
export const ENCRYPTION_KEY_NAME = "chatAppEncryptionKey";
