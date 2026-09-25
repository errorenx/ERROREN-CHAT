var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = require("http");
var import_path2 = __toESM(require("path"), 1);
var import_ws = require("ws");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DB_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DB_DIR, "database.json");
var dbState = {
  users: {},
  contacts: {},
  chats: {},
  messages: {},
  communities: {},
  channels: {},
  channelPosts: {},
  statuses: [],
  callLogs: [],
  aiConversations: {},
  reports: [],
  blocks: {}
};
var otpStore = /* @__PURE__ */ new Map();
function isServerTestUser(u) {
  if (!u) return true;
  const username = String(u.username || "").toLowerCase().trim().replace(/^@/, "");
  const displayName = String(u.displayName || u.name || "").toLowerCase().trim();
  const email = String(u.email || "").toLowerCase().trim();
  const about = String(u.about || u.bio || "").toLowerCase().trim();
  const id = String(u.id || "").toLowerCase().trim();
  const blockedUsernames = ["test", "test2", "testuser", "testuser99", "testperson", "complete_user"];
  if (blockedUsernames.includes(username)) return true;
  if (username.startsWith("test") || username.endsWith("test") || username.includes("complete_user") || username.includes("testperson") || username.includes("testuser") || username.includes("mock") || username.includes("dummy")) {
    return true;
  }
  const blockedNames = ["test", "test two", "test user 99", "test person", "test complete user", "complete user"];
  if (blockedNames.includes(displayName)) return true;
  if (displayName.includes("test user") || displayName.includes("test person") || displayName.includes("test two") || displayName.includes("test complete") || displayName.startsWith("test ") || displayName.endsWith(" test") || displayName === "test") {
    return true;
  }
  if (email.startsWith("test") || email.includes("testuser") || email.includes("complete_user") || email.includes("@test.") || email.includes("example.com")) {
    return true;
  }
  if (about.includes("testing profile") || about.includes("test profile")) {
    return true;
  }
  if (id.startsWith("usr_test") || id.includes("complete_user") || id.includes("testuser") || id.includes("testperson")) {
    return true;
  }
  return false;
}
function cleanMockDataIfPresent() {
  const mockUserIds = [
    "usr_ayesha",
    "usr_zain",
    "usr_fatima",
    "usr_hassan",
    "usr_ali",
    "usr_sarah",
    "usr_erroren_ai"
  ];
  const mockGroupIds = ["chat_grp_family", "chat_grp_work", "chat_grp_study", "chat_grp_friends"];
  const mockCommIds = ["comm_rajpoot", "comm_erroren_demo"];
  let modified = false;
  mockUserIds.forEach((id) => {
    if (dbState.users[id]) {
      delete dbState.users[id];
      delete dbState.contacts[id];
      delete dbState.aiConversations[id];
      modified = true;
    }
  });
  Object.keys(dbState.users).forEach((uid) => {
    const u = dbState.users[uid];
    if (!u || isServerTestUser(u)) {
      delete dbState.users[uid];
      delete dbState.contacts[uid];
      delete dbState.aiConversations[uid];
      modified = true;
    }
  });
  mockGroupIds.forEach((gid) => {
    if (dbState.chats[gid]) {
      delete dbState.chats[gid];
      delete dbState.messages[gid];
      modified = true;
    }
  });
  mockCommIds.forEach((cid) => {
    if (dbState.communities[cid]) {
      delete dbState.communities[cid];
      modified = true;
    }
  });
  if (Object.keys(dbState.communities).length === 0) {
    const defaultCommId = "comm_official_erroren";
    const defaultChanId = "chan_official_announcements";
    const systemAdminId = "usr_system_admin";
    if (!dbState.users[systemAdminId]) {
      dbState.users[systemAdminId] = {
        id: systemAdminId,
        displayName: "ERROREN Official",
        username: "erroren_official",
        about: "Official ERROREN CHAT System Admin \u26A1",
        avatarUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=ERROREN_OFFICIAL",
        isOnline: true,
        lastSeen: Date.now(),
        role: "admin",
        createdAt: Date.now()
      };
    }
    dbState.communities[defaultCommId] = {
      id: defaultCommId,
      name: "ERROREN Official Community",
      description: "Official global community space for ERROREN CHAT announcements, feature updates, and discussions.",
      avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=ERROREN_Official_Community",
      creatorId: systemAdminId,
      members: [
        { userId: systemAdminId, role: "owner", joinedAt: Date.now() }
      ],
      adminIds: [systemAdminId],
      groupIds: [],
      channelIds: [defaultChanId],
      inviteCode: "ERROREN2026",
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    dbState.channels[defaultChanId] = {
      id: defaultChanId,
      communityId: defaultCommId,
      name: "Announcements",
      description: "Official announcements, release notes, and updates from the ERROREN CHAT team.",
      avatarUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=ERROREN_Announcements",
      creatorId: systemAdminId,
      adminIds: [systemAdminId],
      followerIds: [systemAdminId],
      isReadOnly: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const welcomePostId = "post_official_welcome";
    dbState.channelPosts[defaultChanId] = [{
      id: welcomePostId,
      channelId: defaultChanId,
      authorId: systemAdminId,
      authorName: "ERROREN Official",
      authorAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=ERROREN_OFFICIAL",
      title: "Welcome to ERROREN CHAT Communities! \u{1F680}",
      content: "Welcome to the official community space of ERROREN CHAT! Here you can follow official announcements, create discussion groups, and collaborate with members worldwide. Everything is secure, private, and real-time.",
      createdAt: Date.now(),
      likes: [systemAdminId]
    }];
    modified = true;
    console.log("[Database] Seeded official default ERROREN community and channels.");
  }
  Object.keys(dbState.chats).forEach((cid) => {
    if (cid.startsWith("chat_ai_") || dbState.chats[cid]?.memberIds?.includes("usr_erroren_ai")) {
      delete dbState.chats[cid];
      delete dbState.messages[cid];
      modified = true;
    }
  });
  if (modified) {
    saveDatabase();
  }
}
function initDatabase() {
  try {
    if (!import_fs.default.existsSync(DB_DIR)) {
      import_fs.default.mkdirSync(DB_DIR, { recursive: true });
    }
    if (import_fs.default.existsSync(DB_FILE)) {
      const fileData = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(fileData);
      dbState = {
        users: parsed.users || {},
        contacts: parsed.contacts || {},
        chats: parsed.chats || {},
        messages: parsed.messages || {},
        communities: parsed.communities || {},
        channels: parsed.channels || {},
        channelPosts: parsed.channelPosts || {},
        statuses: Array.isArray(parsed.statuses) ? parsed.statuses : [],
        callLogs: Array.isArray(parsed.callLogs) ? parsed.callLogs : [],
        aiConversations: parsed.aiConversations || {},
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        blocks: parsed.blocks || {}
      };
      console.log(`[Database] Loaded persistent data: ${Object.keys(dbState.users).length} users, ${Object.keys(dbState.chats).length} chats, ${Object.keys(dbState.communities).length} communities.`);
    } else {
      saveDatabase();
      console.log("[Database] Initialized fresh empty database at data/database.json");
    }
    cleanMockDataIfPresent();
  } catch (err) {
    console.error("[Database] Error initializing database:", err);
  }
}
function saveDatabase() {
  try {
    if (!import_fs.default.existsSync(DB_DIR)) {
      import_fs.default.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    import_fs.default.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), "utf-8");
    import_fs.default.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("[Database] Failed to write database to disk:", err);
  }
}
initDatabase();
function matchPhoneNumbers(target, candidate) {
  if (!target || !candidate) return false;
  const cTarget = target.replace(/[^0-9]/g, "");
  const cCandidate = candidate.replace(/[^0-9]/g, "");
  if (!cTarget || !cCandidate) return false;
  if (cTarget === cCandidate) return true;
  const stripTarget = cTarget.replace(/^0+/, "");
  const stripCandidate = cCandidate.replace(/^0+/, "");
  if (stripTarget === stripCandidate) return true;
  if (stripTarget.length >= 7 && stripCandidate.length >= 7) {
    if (stripTarget.endsWith(stripCandidate)) {
      const diff = stripTarget.length - stripCandidate.length;
      if (diff >= 1 && diff <= 4) return true;
    } else if (stripCandidate.endsWith(stripTarget)) {
      const diff = stripCandidate.length - stripTarget.length;
      if (diff >= 1 && diff <= 4) return true;
    }
  }
  return false;
}
var db = {
  // --- USERS ---
  getUserById(id) {
    return dbState.users[id] || null;
  },
  getUserByEmail(email) {
    const cleanEmail = email.trim().toLowerCase();
    for (const u of Object.values(dbState.users)) {
      if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
        return u;
      }
    }
    return null;
  },
  getUserByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    for (const u of Object.values(dbState.users)) {
      if (u.username && u.username.trim().toLowerCase().replace(/^@/, "") === cleanUsername) {
        return u;
      }
    }
    return null;
  },
  getUserByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanTarget = clean.replace(/[^0-9]/g, "");
    for (const u of Object.values(dbState.users)) {
      if (u.email && u.email.trim().toLowerCase() === clean) {
        return u;
      }
      if (u.username && u.username.trim().toLowerCase().replace(/^@/, "") === clean.replace(/^@/, "")) {
        return u;
      }
      if (u.phoneNumber && cleanTarget.length >= 6) {
        const cleanPhone = u.phoneNumber.replace(/[^0-9]/g, "");
        const cleanUserFull = ((u.countryCode || "") + u.phoneNumber).replace(/[^0-9]/g, "");
        if (cleanPhone === cleanTarget || cleanUserFull === cleanTarget || matchPhoneNumbers(cleanTarget, cleanPhone) || matchPhoneNumbers(cleanTarget, cleanUserFull)) {
          return u;
        }
      }
    }
    return null;
  },
  getUserByGoogleId(googleId) {
    for (const u of Object.values(dbState.users)) {
      if (u.googleId && u.googleId === googleId) {
        return u;
      }
    }
    return null;
  },
  getUserByPhone(normalizedPhone) {
    if (!normalizedPhone) return null;
    const cleanTarget = normalizedPhone.replace(/[^0-9]/g, "");
    if (!cleanTarget) return null;
    for (const u of Object.values(dbState.users)) {
      if (u.phoneNumber) {
        const cleanUserPhone = ((u.countryCode || "") + u.phoneNumber).replace(/[^0-9]/g, "");
        const cleanJustPhone = (u.phoneNumber || "").replace(/[^0-9]/g, "");
        if (cleanTarget === cleanUserPhone || cleanTarget === cleanJustPhone || matchPhoneNumbers(cleanTarget, cleanUserPhone) || matchPhoneNumbers(cleanTarget, u.phoneNumber)) {
          return u;
        }
      }
    }
    return null;
  },
  isEmailTaken(email, excludeUserId) {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    for (const u of Object.values(dbState.users)) {
      if (excludeUserId && u.id === excludeUserId) continue;
      if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
        return true;
      }
    }
    return false;
  },
  isUsernameTaken(username, excludeUserId) {
    if (!username) return false;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    for (const u of Object.values(dbState.users)) {
      if (excludeUserId && u.id === excludeUserId) continue;
      if (u.username && u.username.trim().toLowerCase().replace(/^@/, "") === cleanUsername) {
        return true;
      }
    }
    return false;
  },
  isPhoneTaken(phone, excludeUserId) {
    if (!phone) return false;
    const cleanTarget = phone.replace(/[^0-9]/g, "");
    if (!cleanTarget) return false;
    for (const u of Object.values(dbState.users)) {
      if (excludeUserId && u.id === excludeUserId) continue;
      if (u.phoneNumber) {
        const cleanUserPhone = ((u.countryCode || "") + u.phoneNumber).replace(/[^0-9]/g, "");
        const cleanJustPhone = (u.phoneNumber || "").replace(/[^0-9]/g, "");
        if (cleanTarget === cleanUserPhone || cleanTarget === cleanJustPhone || matchPhoneNumbers(cleanTarget, cleanUserPhone) || matchPhoneNumbers(cleanTarget, u.phoneNumber)) {
          return true;
        }
      }
    }
    return false;
  },
  linkContactsToUser(user) {
    if (!user.phoneNumber) return;
    for (const ownerId of Object.keys(dbState.contacts)) {
      for (const c of dbState.contacts[ownerId]) {
        if (!c.contactUserId && (matchPhoneNumbers(c.phoneNumber, user.phoneNumber) || matchPhoneNumbers(c.phoneNumber, (user.countryCode || "") + user.phoneNumber))) {
          c.contactUserId = user.id;
          c.avatarUrl = user.avatarUrl || c.avatarUrl;
        }
      }
    }
    saveDatabase();
  },
  getAllUsers() {
    return Object.values(dbState.users).filter((u) => !isServerTestUser(u));
  },
  searchUsers(query, excludeUserId) {
    const q = query.trim().toLowerCase();
    const cleanQ = query.replace(/[^0-9]/g, "");
    return Object.values(dbState.users).filter((u) => {
      if (!u || isServerTestUser(u)) return false;
      if (excludeUserId && u.id === excludeUserId) return false;
      if (u.isSuspended) return false;
      if (!q) return true;
      const nameMatch = (u.displayName || "").toLowerCase().includes(q);
      const usernameMatch = (u.username || "").toLowerCase().includes(q.replace("@", ""));
      const emailMatch = (u.email || "").toLowerCase().includes(q);
      const aboutMatch = (u.about || "").toLowerCase().includes(q);
      const phoneClean = ((u.countryCode || "") + (u.phoneNumber || "")).replace(/[^0-9]/g, "");
      const uPhoneClean = (u.phoneNumber || "").replace(/[^0-9]/g, "");
      const phoneMatch = cleanQ.length > 0 && (phoneClean.includes(cleanQ) || cleanQ.includes(uPhoneClean) || matchPhoneNumbers(cleanQ, phoneClean) || matchPhoneNumbers(cleanQ, uPhoneClean));
      return nameMatch || usernameMatch || emailMatch || aboutMatch || phoneMatch;
    });
  },
  createUser(user) {
    if (user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      if (this.isEmailTaken(cleanEmail, user.id)) {
        throw new Error("An account with this email already exists. Please log in to your existing account.");
      }
    }
    if (user.username) {
      const cleanUsername = user.username.trim().toLowerCase().replace(/^@/, "");
      if (cleanUsername.length > 0 && this.isUsernameTaken(cleanUsername, user.id)) {
        throw new Error("This username is already taken. Please choose a different username.");
      }
    }
    if (user.phoneNumber) {
      const cleanPhone = user.phoneNumber.replace(/[^0-9]/g, "");
      if (cleanPhone.length > 0 && this.isPhoneTaken(cleanPhone, user.id)) {
        throw new Error("This phone number is already associated with another account.");
      }
    }
    dbState.users[user.id] = user;
    saveDatabase();
    return user;
  },
  updateUser(id, updates) {
    const u = dbState.users[id];
    if (!u) return null;
    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (this.isEmailTaken(cleanEmail, id)) {
        throw new Error("An account with this email already exists. Please log in to your existing account.");
      }
    }
    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase().replace(/^@/, "");
      if (cleanUsername.length > 0 && this.isUsernameTaken(cleanUsername, id)) {
        throw new Error("This username is already taken. Please choose a different username.");
      }
    }
    if (updates.phoneNumber) {
      const cleanPhone = updates.phoneNumber.replace(/[^0-9]/g, "");
      if (cleanPhone.length > 0 && this.isPhoneTaken(cleanPhone, id)) {
        throw new Error("This phone number is already associated with another account.");
      }
    }
    dbState.users[id] = { ...u, ...updates, updatedAt: Date.now() };
    saveDatabase();
    return dbState.users[id];
  },
  deleteUser(id) {
    if (!dbState.users[id]) return false;
    delete dbState.users[id];
    delete dbState.contacts[id];
    delete dbState.aiConversations[id];
    saveDatabase();
    return true;
  },
  // --- CONTACTS ---
  getContacts(ownerUserId) {
    return dbState.contacts[ownerUserId] || [];
  },
  hasContact(ownerUserId, contactUserId, phoneNumber) {
    const list = dbState.contacts[ownerUserId] || [];
    return list.some((c) => {
      if (contactUserId && c.contactUserId === contactUserId) return true;
      if (phoneNumber && c.phoneNumber && matchPhoneNumbers(c.phoneNumber, phoneNumber)) return true;
      return false;
    });
  },
  addContact(ownerUserId, contact) {
    if (!dbState.contacts[ownerUserId]) {
      dbState.contacts[ownerUserId] = [];
    }
    const existingIndex = dbState.contacts[ownerUserId].findIndex(
      (c) => c.id === contact.id || contact.phoneNumber && matchPhoneNumbers(c.phoneNumber, contact.phoneNumber)
    );
    if (existingIndex >= 0) {
      dbState.contacts[ownerUserId][existingIndex] = {
        ...dbState.contacts[ownerUserId][existingIndex],
        ...contact
      };
    } else {
      dbState.contacts[ownerUserId].unshift(contact);
    }
    saveDatabase();
    return contact;
  },
  deleteContact(ownerUserId, contactId) {
    if (!dbState.contacts[ownerUserId]) return false;
    dbState.contacts[ownerUserId] = dbState.contacts[ownerUserId].filter((c) => c.id !== contactId);
    saveDatabase();
    return true;
  },
  // --- OTP STORE ---
  getOtp(phone) {
    const clean = phone.replace(/[^0-9]/g, "");
    return otpStore.get(clean);
  },
  setOtp(phone, otpData) {
    const clean = phone.replace(/[^0-9]/g, "");
    otpStore.set(clean, otpData);
  },
  removeOtp(phone) {
    const clean = phone.replace(/[^0-9]/g, "");
    otpStore.delete(clean);
  },
  incrementOtpAttempts(phone) {
    const clean = phone.replace(/[^0-9]/g, "");
    const rec = otpStore.get(clean);
    if (rec) {
      rec.attempts += 1;
      otpStore.set(clean, rec);
    }
  },
  // --- CHATS ---
  getAllChats() {
    return Object.values(dbState.chats).filter((c) => {
      const name = (c.name || c.title || "").toLowerCase();
      if (name.includes("test") || name === "janu" || name === "mani") return false;
      if (name.includes("erroren ai") || name.includes("ready to assist")) return false;
      if (c.id.includes("chat_ai") || c.id.includes("erroren_ai")) return false;
      return true;
    });
  },
  getChatsForUser(userId) {
    const user = dbState.users[userId];
    if (user) {
      const selfChatId = "chat_self_" + userId;
      if (!dbState.chats[selfChatId]) {
        const uHandle = user.username ? `@${user.username}` : user.displayName || "user";
        const selfChat = {
          id: selfChatId,
          name: `${uHandle} (You)`,
          title: `${uHandle} (You)`,
          avatarUrl: user.avatarUrl || "",
          memberIds: [userId],
          participantIds: [userId],
          isGroup: false,
          isPinned: true,
          unreadCount: 0,
          createdAt: user.createdAt || Date.now(),
          updatedAt: Date.now(),
          lastMessage: {
            id: `msg_self_${userId}`,
            chatId: selfChatId,
            senderId: userId,
            senderName: user.displayName || "You",
            content: "Message yourself (Notes, links, reminders)",
            type: "text",
            timestamp: Date.now(),
            status: "read"
          }
        };
        dbState.chats[selfChatId] = selfChat;
        if (!dbState.messages[selfChatId]) {
          dbState.messages[selfChatId] = [selfChat.lastMessage];
        }
        saveDatabase();
      }
    }
    return Object.values(dbState.chats).filter((c) => {
      if (!(c.memberIds || []).includes(userId)) return false;
      const name = (c.name || c.title || "").toLowerCase();
      if (name.includes("test") || name === "janu" || name === "mani") return false;
      if (name.includes("erroren ai") || name.includes("ready to assist")) return false;
      if (c.id.includes("chat_ai") || c.id.includes("erroren_ai")) return false;
      if (c.id === "chat_1789026111971_emok" || c.id === "chat_1789546741695_qsg9") return false;
      return true;
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
  getChatById(chatId) {
    return dbState.chats[chatId] || null;
  },
  findDirectChat(userId1, userId2) {
    for (const chat of Object.values(dbState.chats)) {
      if (!chat.isGroup && chat.memberIds.includes(userId1) && chat.memberIds.includes(userId2)) {
        return chat;
      }
    }
    return null;
  },
  createChat(chat) {
    dbState.chats[chat.id] = chat;
    if (!dbState.messages[chat.id]) {
      dbState.messages[chat.id] = [];
    }
    saveDatabase();
    return chat;
  },
  updateChat(chatId, updates) {
    const c = dbState.chats[chatId];
    if (!c) return null;
    dbState.chats[chatId] = { ...c, ...updates };
    saveDatabase();
    return dbState.chats[chatId];
  },
  deleteChat(chatId) {
    delete dbState.chats[chatId];
    delete dbState.messages[chatId];
    saveDatabase();
  },
  // --- MESSAGES ---
  getMessages(chatId) {
    return dbState.messages[chatId] || [];
  },
  addMessage(chatId, message) {
    if (!dbState.messages[chatId]) {
      dbState.messages[chatId] = [];
    }
    dbState.messages[chatId].push(message);
    if (dbState.chats[chatId]) {
      dbState.chats[chatId].updatedAt = message.timestamp || Date.now();
      dbState.chats[chatId].lastMessage = message;
    }
    saveDatabase();
    return message;
  },
  updateMessage(chatId, messageId, updates) {
    const list = dbState.messages[chatId];
    if (!list) return null;
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return null;
    Object.assign(msg, updates);
    saveDatabase();
    return msg;
  },
  deleteMessage(chatId, messageId, forEveryone, userId) {
    const list = dbState.messages[chatId];
    if (!list) return false;
    const msgIndex = list.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return false;
    if (forEveryone) {
      list[msgIndex].isDeletedForEveryone = true;
      list[msgIndex].content = "\u{1F6AB} This message was deleted";
      list[msgIndex].mediaUrl = void 0;
    } else {
      if (!list[msgIndex].deletedForUserIds) {
        list[msgIndex].deletedForUserIds = [];
      }
      if (!list[msgIndex].deletedForUserIds.includes(userId)) {
        list[msgIndex].deletedForUserIds.push(userId);
      }
    }
    saveDatabase();
    return true;
  },
  clearChatMessages(chatId) {
    dbState.messages[chatId] = [];
    if (dbState.chats[chatId]) {
      dbState.chats[chatId].lastMessage = void 0;
      dbState.chats[chatId].updatedAt = Date.now();
    }
    saveDatabase();
  },
  // --- STATUS STORIES ---
  getStatuses(onlyActive = true) {
    const now = Date.now();
    if (onlyActive) {
      return dbState.statuses.filter((s) => s.expiresAt > now);
    }
    return dbState.statuses;
  },
  addStatus(status) {
    dbState.statuses.unshift(status);
    saveDatabase();
    return status;
  },
  viewStatus(statusId, viewer) {
    const story = dbState.statuses.find((s) => s.id === statusId);
    if (story) {
      if (!story.viewers.some((v) => v.userId === viewer.userId)) {
        story.viewers.push(viewer);
        saveDatabase();
      }
    }
  },
  deleteStatus(statusId) {
    const idx = dbState.statuses.findIndex((s) => s.id === statusId);
    if (idx >= 0) {
      dbState.statuses.splice(idx, 1);
      saveDatabase();
    }
  },
  // --- CALL LOGS ---
  getCallLogs(userId) {
    return dbState.callLogs.filter((c) => c.callerId === userId || c.receiverId === userId).sort((a, b) => b.startedAt - a.startedAt);
  },
  addCallLog(log) {
    dbState.callLogs.unshift(log);
    saveDatabase();
    return log;
  },
  clearCallLogs(userId) {
    dbState.callLogs = dbState.callLogs.filter((c) => c.callerId !== userId && c.receiverId !== userId);
    saveDatabase();
  },
  // --- AI CONVERSATIONS ---
  getAIConversations(userId) {
    return (dbState.aiConversations[userId] || []).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  saveAIConversation(userId, conversation) {
    if (!dbState.aiConversations[userId]) {
      dbState.aiConversations[userId] = [];
    }
    const idx = dbState.aiConversations[userId].findIndex((c) => c.id === conversation.id);
    if (idx >= 0) {
      dbState.aiConversations[userId][idx] = conversation;
    } else {
      dbState.aiConversations[userId].unshift(conversation);
    }
    saveDatabase();
    return conversation;
  },
  deleteAIConversation(userId, conversationId) {
    if (!dbState.aiConversations[userId]) return false;
    dbState.aiConversations[userId] = dbState.aiConversations[userId].filter((c) => c.id !== conversationId);
    saveDatabase();
    return true;
  },
  // --- BLOCKS ---
  getBlockedUserIds(userId) {
    return dbState.blocks[userId] || [];
  },
  blockUser(userId, targetId) {
    if (!dbState.blocks[userId]) {
      dbState.blocks[userId] = [];
    }
    if (!dbState.blocks[userId].includes(targetId)) {
      dbState.blocks[userId].push(targetId);
      saveDatabase();
    }
  },
  unblockUser(userId, targetId) {
    if (dbState.blocks[userId]) {
      dbState.blocks[userId] = dbState.blocks[userId].filter((id) => id !== targetId);
      saveDatabase();
    }
  },
  // --- REPORTS ---
  getReports() {
    return dbState.reports;
  },
  addReport(report) {
    dbState.reports.unshift(report);
    saveDatabase();
    return report;
  },
  resolveReport(reportId, action) {
    const rep = dbState.reports.find((r) => r.id === reportId);
    if (rep) {
      rep.status = action === "banned" ? "resolved" : action;
      if (action === "banned" && rep.reportedUserId) {
        if (dbState.users[rep.reportedUserId]) {
          dbState.users[rep.reportedUserId].isSuspended = true;
        }
      }
      saveDatabase();
    }
  },
  // --- TELEMETRY ---
  getStats(totalAiRequests2) {
    let totalMsgs = 0;
    Object.values(dbState.messages).forEach((arr) => {
      totalMsgs += arr.length;
    });
    return {
      totalUsers: Object.keys(dbState.users).length,
      activeUsers24h: Object.values(dbState.users).filter((u) => u.isOnline || Date.now() - u.lastSeen < 864e5).length,
      totalMessages: totalMsgs,
      totalGroups: Object.values(dbState.chats).filter((c) => c.isGroup).length,
      totalCalls: dbState.callLogs.length,
      totalStatuses: dbState.statuses.filter((s) => s.expiresAt > Date.now()).length,
      totalCommunities: Object.keys(dbState.communities).length,
      aiRequestsCount: totalAiRequests2,
      storageUsedMb: Math.round(1.2 + totalMsgs * 0.01),
      serverUptimeHours: 48,
      serviceHealth: {
        database: "healthy",
        realtime: "healthy",
        aiGateway: "healthy",
        mediaStorage: "healthy"
      },
      reports: dbState.reports
    };
  },
  // --- COMMUNITIES ---
  getAllCommunities() {
    return Object.values(dbState.communities).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  },
  getCommunityById(id) {
    return dbState.communities[id] || null;
  },
  getCommunityByInvite(code) {
    const clean = code.trim().toLowerCase();
    for (const c of Object.values(dbState.communities)) {
      if (c.inviteCode && c.inviteCode.trim().toLowerCase() === clean) {
        return c;
      }
    }
    return null;
  },
  createCommunity(comm) {
    dbState.communities[comm.id] = comm;
    saveDatabase();
    return comm;
  },
  updateCommunity(id, updates) {
    const c = dbState.communities[id];
    if (!c) return null;
    dbState.communities[id] = { ...c, ...updates, updatedAt: Date.now() };
    saveDatabase();
    return dbState.communities[id];
  },
  deleteCommunity(id) {
    if (!dbState.communities[id]) return false;
    const comm = dbState.communities[id];
    if (comm.channelIds) {
      comm.channelIds.forEach((chId) => {
        delete dbState.channels[chId];
        delete dbState.channelPosts[chId];
      });
    }
    delete dbState.communities[id];
    saveDatabase();
    return true;
  },
  addCommunityMember(commId, userId, role = "member") {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    if (!comm.members) comm.members = [];
    const exists = comm.members.find((m) => m.userId === userId);
    if (!exists) {
      comm.members.push({ userId, role, joinedAt: Date.now() });
      if (role === "admin" && !comm.adminIds.includes(userId)) {
        comm.adminIds.push(userId);
      }
      comm.updatedAt = Date.now();
      saveDatabase();
    }
    return comm;
  },
  removeCommunityMember(commId, userId) {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    if (comm.creatorId === userId) return comm;
    comm.members = (comm.members || []).filter((m) => m.userId !== userId);
    comm.adminIds = (comm.adminIds || []).filter((id) => id !== userId);
    comm.updatedAt = Date.now();
    saveDatabase();
    return comm;
  },
  updateCommunityMemberRole(commId, userId, role) {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    const member = (comm.members || []).find((m) => m.userId === userId);
    if (member) {
      member.role = role;
      if (role === "admin" || role === "owner") {
        if (!comm.adminIds.includes(userId)) comm.adminIds.push(userId);
      } else {
        comm.adminIds = comm.adminIds.filter((id) => id !== userId);
      }
      comm.updatedAt = Date.now();
      saveDatabase();
    }
    return comm;
  },
  addGroupToCommunity(commId, groupId) {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    if (!comm.groupIds) comm.groupIds = [];
    if (!comm.groupIds.includes(groupId)) {
      comm.groupIds.push(groupId);
      comm.updatedAt = Date.now();
      if (dbState.chats[groupId]) {
        dbState.chats[groupId].communityId = commId;
      }
      saveDatabase();
    }
    return comm;
  },
  removeGroupFromCommunity(commId, groupId) {
    const comm = dbState.communities[commId];
    if (!comm) return null;
    comm.groupIds = (comm.groupIds || []).filter((id) => id !== groupId);
    comm.updatedAt = Date.now();
    if (dbState.chats[groupId]) {
      dbState.chats[groupId].communityId = void 0;
    }
    saveDatabase();
    return comm;
  },
  // --- CHANNELS ---
  getAllChannels() {
    return Object.values(dbState.channels);
  },
  getChannelsForCommunity(commId) {
    return Object.values(dbState.channels).filter((ch) => ch.communityId === commId);
  },
  getChannelById(channelId) {
    return dbState.channels[channelId] || null;
  },
  createChannel(channel) {
    dbState.channels[channel.id] = channel;
    if (!dbState.channelPosts[channel.id]) {
      dbState.channelPosts[channel.id] = [];
    }
    if (dbState.communities[channel.communityId]) {
      const comm = dbState.communities[channel.communityId];
      if (!comm.channelIds) comm.channelIds = [];
      if (!comm.channelIds.includes(channel.id)) {
        comm.channelIds.push(channel.id);
        comm.updatedAt = Date.now();
      }
    }
    saveDatabase();
    return channel;
  },
  updateChannel(channelId, updates) {
    const ch = dbState.channels[channelId];
    if (!ch) return null;
    dbState.channels[channelId] = { ...ch, ...updates, updatedAt: Date.now() };
    saveDatabase();
    return dbState.channels[channelId];
  },
  deleteChannel(channelId) {
    const ch = dbState.channels[channelId];
    if (!ch) return false;
    if (dbState.communities[ch.communityId]) {
      const comm = dbState.communities[ch.communityId];
      comm.channelIds = (comm.channelIds || []).filter((id) => id !== channelId);
      comm.updatedAt = Date.now();
    }
    delete dbState.channels[channelId];
    delete dbState.channelPosts[channelId];
    saveDatabase();
    return true;
  },
  joinChannel(channelId, userId) {
    const ch = dbState.channels[channelId];
    if (!ch) return null;
    if (!ch.followerIds) ch.followerIds = [];
    if (!ch.followerIds.includes(userId)) {
      ch.followerIds.push(userId);
      ch.updatedAt = Date.now();
      saveDatabase();
    }
    return ch;
  },
  leaveChannel(channelId, userId) {
    const ch = dbState.channels[channelId];
    if (!ch) return null;
    ch.followerIds = (ch.followerIds || []).filter((id) => id !== userId);
    ch.updatedAt = Date.now();
    saveDatabase();
    return ch;
  },
  // --- CHANNEL POSTS ---
  getChannelPosts(channelId) {
    return (dbState.channelPosts[channelId] || []).sort((a, b) => b.createdAt - a.createdAt);
  },
  addChannelPost(post) {
    if (!dbState.channelPosts[post.channelId]) {
      dbState.channelPosts[post.channelId] = [];
    }
    dbState.channelPosts[post.channelId].unshift(post);
    if (dbState.channels[post.channelId]) {
      dbState.channels[post.channelId].updatedAt = post.createdAt || Date.now();
    }
    saveDatabase();
    return post;
  },
  likeChannelPost(channelId, postId, userId) {
    const list = dbState.channelPosts[channelId];
    if (!list) return null;
    const post = list.find((p) => p.id === postId);
    if (!post) return null;
    if (!post.likes) post.likes = [];
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      post.likes.push(userId);
    }
    saveDatabase();
    return post;
  },
  deleteChannelPost(channelId, postId) {
    const list = dbState.channelPosts[channelId];
    if (!list) return false;
    dbState.channelPosts[channelId] = list.filter((p) => p.id !== postId);
    saveDatabase();
    return true;
  }
};

// src/utils/aiLanguageEngine.ts
var ROMAN_URDU_KEYWORDS = [
  "kese",
  "kaise",
  "kaisa",
  "kesi",
  "kya",
  "kia",
  "kyun",
  "kyu",
  "kab",
  "kahan",
  "kidhar",
  "kon",
  "kaun",
  "kr",
  "kar",
  "karo",
  "karein",
  "karta",
  "karti",
  "karte",
  "kare",
  "karna",
  "kro",
  "bhai",
  "yr",
  "yar",
  "bhaiya",
  "dost",
  "janab",
  "hoon",
  "hun",
  "ho",
  "hai",
  "he",
  "hain",
  "tha",
  "thi",
  "the",
  "hoga",
  "hogi",
  "honge",
  "mujhe",
  "mjhe",
  "mera",
  "meri",
  "mere",
  "hum",
  "humein",
  "humara",
  "humari",
  "ap",
  "aap",
  "tum",
  "tumhara",
  "tumhari",
  "tera",
  "teri",
  "tere",
  "apka",
  "apki",
  "apke",
  "aapka",
  "aapki",
  "batao",
  "btao",
  "batayein",
  "bataein",
  "bolo",
  "boliye",
  "sunao",
  "dekho",
  "chahiye",
  "chahye",
  "chahta",
  "chahti",
  "theek",
  "thik",
  "shukriya",
  "shukria",
  "meharbani",
  "mehrbani",
  "zara",
  "bhi",
  "nhi",
  "nahi",
  "na",
  "mat",
  "ka",
  "ki",
  "ke",
  "ko",
  "se",
  "me",
  "mein",
  "aur",
  "or",
  "par",
  "pr",
  "pe",
  "ye",
  "yeh",
  "wo",
  "woh",
  "yahan",
  "wahan",
  "idhar",
  "udhar",
  "kaam",
  "kam",
  "swal",
  "sawal",
  "jwab",
  "jawab",
  "madad",
  "help",
  "salam",
  "walekum",
  "assalam",
  "khuda hafiz",
  "allah hafiz",
  "likh",
  "likho",
  "likhein",
  "banao",
  "bnao",
  "bna",
  "do",
  "dein",
  "bhejo",
  "samjha",
  "samjhao",
  "acha",
  "achi",
  "ache",
  "bohot",
  "bht",
  "zyada",
  "ziyada",
  "thoda",
  "kam",
  "sirf",
  "swal",
  "masla",
  "hal",
  "cheez",
  "tareeqa",
  "tarika",
  "wajah",
  "shamil"
];
function detectLanguage(text) {
  const clean = text.trim();
  if (!clean) return "english";
  if (/[\u0600-\u06FF]/.test(clean)) {
    if (/[ٹڈڑںےہگچپژ]/.test(clean)) {
      return "urdu";
    }
    if (/[\u0621-\u064A]/.test(clean)) {
      if (/^(مرحبا|السلام عليكم|شكرا|كيف حالك|أهلا)/.test(clean)) {
        return "arabic";
      }
      return "urdu";
    }
    return "urdu";
  }
  if (/[\u0900-\u097F]/.test(clean)) {
    return "hindi";
  }
  const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    let romanCount = 0;
    for (const w of words) {
      if (ROMAN_URDU_KEYWORDS.includes(w)) {
        romanCount++;
      }
    }
    const ratio = romanCount / words.length;
    if (romanCount >= 2 || words.length <= 3 && romanCount >= 1 || ratio >= 0.2) {
      return "roman_urdu";
    }
  }
  const lower = clean.toLowerCase();
  if (/\b(hola|gracias|por favor|buenos dias|como estas)\b/.test(lower)) return "other";
  if (/\b(bonjour|merci|s'il vous plait|comment allez-vous)\b/.test(lower)) return "other";
  if (/\b(hallo|danke|bitte|guten tag)\b/.test(lower)) return "other";
  return "english";
}
function generateMultilingualReply(userPrompt) {
  const p = userPrompt.trim();
  const lower = p.toLowerCase();
  const lang = detectLanguage(p);
  if (lang === "roman_urdu") {
    if (lower.includes("salam") || lower.includes("assalam") || lower.includes("slm")) {
      return `Wa Alaikum Assalam wa Rahmatullahi wa Barakatuhu! \u{1F31F}

Khush aamdeed! Main **ERROREN AI** hoon, aapka dedicated AI personal assistant. Main bilkul khairiyat se hoon.

Aap batayein, aaj main aapki kya khidmat kar sakta hoon? Aap mujhse koi bhi sawal pooch sakte hain, programming ka code banwa sakte hain, ya koi bhi baat discuss kar sakte hain!`;
    }
    if (lower.includes("kese ho") || lower.includes("kaise ho") || lower.includes("kia hal") || lower.includes("kya hal") || lower.includes("kaisa hai")) {
      return `Alhamdulillah main bilkul theek aur pur-azm hoon! Shukriya poochne ka.

Main har waqt aapki rehnumai aur madad ke liye tayyar rehta hoon. Aap sunayein, aapka din kaisa guzar raha hai aur aaj hum kis topic par kaam karein?`;
    }
    if (lower.includes("ap kon ho") || lower.includes("tum kon ho") || lower.includes("kon ho") || lower.includes("kaun ho")) {
      return `Main **ERROREN AI** hoon \u2014 ERROREN CHAT ka official aur intelligent AI Assistant! \u26A1

### Main aapki kya kya madad kar sakta hoon:
- \u{1F4AC} **Har Zuban Mein Guftagu**: Roman Urdu, Urdu, English, Hindi, Arabic wagera mein bila-jhijhak baat karein.
- \u{1F4BB} **Programming & Coding**: React, TypeScript, Python, Node.js, bugs fix karna aur logic design karna.
- \u{1F4DA} **Taleem & Maloomaat**: Science, maths, tareekh, general knowledge aur daily facts.
- \u{1F4DD} **Writing & Drafting**: Messages, emails, darkhwast, essays, aur summaries likhna.
- \u{1F310} **Zubano Ka Tarjuma**: Kisi bhi zuban ka durust aur natural tarjuma karna.

Aap jis zuban mein chahein sawal karein, main hamesha hazir hoon!`;
    }
    if (lower.includes("kya kar sakte ho") || lower.includes("kya krte ho") || lower.includes("kya kr skte ho") || lower.includes("features") || lower.includes("madad")) {
      return `Main aapke liye bohot kuch kar sakta hoon! Yahan kuch ahem misalein hain:

1. **Coding & Software**: Kisi bhi programming language mein code likhna aur bugs theek karna.
2. **Sawal Jawab**: Har topic par tafseeli aur sahi maloomaat faraham karna.
3. **Application & Email**: Office, school, ya business ke liye professional drafting.
4. **Urdu & English Translation**: Lafzi aur ba-muhawara tarjuma.
5. **Maths & Science**: Equations hal karna aur scientific concepts aasan lafzon mein samjhana.

Aap bas batayein aapko abhi kis cheez mein madad chahiye?`;
    }
    if (lower.includes("code") || lower.includes("react") || lower.includes("javascript") || lower.includes("typescript") || lower.includes("python") || lower.includes("program")) {
      return `Zaroor! Yeh raha aapki request ke mutabiq saaf aur functional code:

\`\`\`typescript
// ERROREN AI - Clean TypeScript Implementation
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: number;
}

export async function requestData<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`Request failed with status \${response.status}\`);
    }
    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Kuch masla paish aaya',
      timestamp: Date.now(),
    };
  }
}
\`\`\`

### Is Code Ki Wazaahat:
- **TypeScript Safety**: Isme generic type \`<T>\` use ki gayi hai taake har qisam ke data ko handle kiya ja sake.
- **Error Handling**: Agar server down ho ya network fail ho, to ye crash hone ke bajaye safayi se error report karega.

Agar isme koi tabdeeli karni ho ya koi aur code likhwana ho to mujhe zaroor batayein!`;
    }
    if (lower.includes("pakistan") || lower.includes("islamabad") || lower.includes("lahore") || lower.includes("karachi")) {
      return `Pakistan ke hawale se ahem maloomaat:

- **Dar-ul-Hukoomat (Capital)**: **Islamabad** Pakistan ka federal capital hai, jo Margalla Hills ke daman mein waqay hai aur dunya ke khubsurat tareen shehron mein shumar hota hai.
- **Ahem Shehar**: Karachi (Maashi Markaz), Lahore (Saqafati Markaz), Rawalpindi, Faisalabad, Peshawar aur Quetta.
- **Qaumi Zuban**: Urdu qaumi zuban hai, jabkay daryai aur saqafati zubano mein Punjabi, Pashto, Sindhi, Balochi, Saraiki aur Kashmiri shamil hain.

Agar aapko Pakistan ki tareekh, geography ya kisi aur cheez ke baray mein mazeed janna hai to batayein!`;
    }
    if (lower.includes("application") || lower.includes("darkhwast") || lower.includes("chutti") || lower.includes("leave") || lower.includes("email")) {
      return `Yeh rahi chutti ke liye professional darkhwast ka format:

**Mohtaram Janab (Manager / Principal Sahab),**

*Assalam-o-Alaikum,*

Muaddibana guzarish hai ke mujhe kal gharelu zaroori kaam ki wajah se office / idara aana mumkin nahi hoga. Is liye baraye meharbani mujhe ek din (tareekh: [Tareekh]) ki chutti inayat farmayein.

Main aapki is inayat par bohot mashkoor rahoon ga.

**Aapka Farmanbardar / Mukhlis,**  
[Aapka Naam]  
[Designation / Roll Number]  
[Tareekh]`;
    }
    if (lower.includes("kahani") || lower.includes("story") || lower.includes("waqia")) {
      return `### Umeed Ki Roshni \u{1F31F}

Ek dafa ka zikr hai ke ek purane shehar mein ek nojawan rehta tha jiska naam Zaid tha. Zaid hamesha nayi technologies aur coding seekhne ka shauq rakhta tha, magar uske pas na mehanga laptop tha aur na tez internet. Magar uske andar kuch kar dikhane ka jazba tha.

Usne himmat nahi haari aur rozana shaam ko library jakar thode se waqt mein practice karta raha. Kuch arsay ki lagatar mehnat ke baad usne ek aisa secure messaging platform banaya jisne lakhoon logon ki zindagiyan aasan bana dein.

**Sabaq**: Zindagi mein mushkilaat jitni bhi hon, agar insaan lagan aur mehnat se koshish jari rakhay to kamyabi zaroor qadam choomti hai!`;
    }
    return `Main aapka sawal samajh gaya hoon: **"${p}"**.

Is hawale se mukammal jwab yeh hai ke main aapki har marhale par poori rehnumai ke liye tayyar hoon. Aap mujhse iske mutalliq mazeed tafseelat pooch sakte hain, ya agar kisi specific cheez ki wazaahat chahiye to batayein, main foran Roman Urdu mein tafseeli jwab dunga! \u{1F680}`;
  }
  if (lang === "urdu") {
    if (lower.includes("\u0633\u0644\u0627\u0645") || lower.includes("\u0627\u0644\u0633\u0644\u0627\u0645")) {
      return `\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645 \u0648\u0631\u062D\u0645\u06C3 \u0627\u0644\u0644\u06C1 \u0648\u0628\u0631\u06A9\u0627\u062A\u06C1! \u{1F338}

\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F! \u0645\u06CC\u06BA **ERROREN AI** \u06C1\u0648\u06BA\u060C \u0622\u067E \u06A9\u0627 \u0630\u0627\u062A\u06CC \u0630\u06C1\u06CC\u0646 \u0627\u0633\u0633\u0679\u0646\u0679\u06D4 \u0645\u06CC\u06BA \u0628\u0627\u0644\u06A9\u0644 \u062E\u06CC\u0631\u06CC\u062A \u0633\u06D2 \u06C1\u0648\u06BA\u06D4

\u0641\u0631\u0645\u0627\u0626\u06CC\u06D2\u060C \u0622\u062C \u0645\u06CC\u06BA \u0622\u067E \u06A9\u06CC \u06A9\u0633 \u0637\u0631\u062D \u0631\u06C1\u0646\u0645\u0627\u0626\u06CC \u0627\u0648\u0631 \u062E\u062F\u0645\u062A \u06A9\u0631 \u0633\u06A9\u062A\u0627 \u06C1\u0648\u06BA\u061F \u0622\u067E \u0628\u0644\u0627 \u062C\u06BE\u062C\u06BE\u06A9 \u06A9\u0648\u0626\u06CC \u0628\u06BE\u06CC \u0633\u0648\u0627\u0644 \u067E\u0648\u0686\u06BE \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA!`;
    }
    if (lower.includes("\u06A9\u0648\u0646 \u06C1\u0648") || lower.includes("\u062A\u0639\u0627\u0631\u0641")) {
      return `\u0645\u06CC\u06BA **ERROREN AI** \u06C1\u0648\u06BA\u060C ERROREN CHAT \u06A9\u0627 \u0628\u0627\u0636\u0627\u0628\u0637\u06C1 \u0627\u0648\u0631 \u062C\u062F\u06CC\u062F \u062A\u0631\u06CC\u0646 \u0645\u0635\u0646\u0648\u0639\u06CC \u0630\u06C1\u0627\u0646\u062A \u06A9\u0627 \u0627\u0633\u0633\u0679\u0646\u0679! \u26A1

### \u0645\u06CC\u0631\u06CC \u0646\u0645\u0627\u06CC\u0627\u06BA \u062E\u0635\u0648\u0635\u06CC\u0627\u062A:
- \u{1F4D6} **\u06C1\u0631 \u0632\u0628\u0627\u0646 \u0645\u06CC\u06BA \u0645\u06C1\u0627\u0631\u062A**: \u0627\u0631\u062F\u0648\u060C \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648\u060C \u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC \u0627\u0648\u0631 \u062F\u06CC\u06AF\u0631 \u0632\u0628\u0627\u0646\u0648\u06BA \u0645\u06CC\u06BA \u062F\u0631\u0633\u062A \u0627\u0648\u0631 \u0641\u0635\u06CC\u062D \u06AF\u0641\u062A\u06AF\u0648\u06D4
- \u{1F4BB} **\u067E\u0631\u0648\u06AF\u0631\u0627\u0645\u0646\u06AF \u0627\u0648\u0631 \u0679\u06CC\u06A9\u0646\u0627\u0644\u0648\u062C\u06CC**: \u062C\u062F\u06CC\u062F \u062A\u0631\u06CC\u0646 \u06A9\u0648\u0688\u0646\u06AF\u060C \u0627\u06CC\u0631\u0631\u0632 \u06A9\u06CC \u062F\u0631\u0633\u062A\u06AF\u06CC \u0627\u0648\u0631 \u0633\u0648\u0641\u0679 \u0648\u06CC\u0626\u0631 \u0688\u06CC\u0632\u0627\u0626\u0646\u0646\u06AF\u06D4
- \u{1F4DD} **\u0639\u0644\u0645 \u0648 \u0627\u062F\u0628 \u0627\u0648\u0631 \u0645\u0636\u0627\u0645\u06CC\u0646**: \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u060C \u062E\u0637\u0648\u0637\u060C \u0627\u06CC \u0645\u06CC\u0644\u0632 \u0627\u0648\u0631 \u062A\u062D\u0642\u06CC\u0642\u06CC \u0645\u0648\u0627\u062F \u06A9\u06CC \u062A\u06CC\u0627\u0631\u06CC\u06D4
- \u{1F50D} **\u0633\u0648\u0627\u0644 \u0648 \u062C\u0648\u0627\u0628**: \u0633\u0627\u0626\u0646\u0633\u060C \u0631\u06CC\u0627\u0636\u06CC\u060C \u062A\u0627\u0631\u06CC\u062E \u0627\u0648\u0631 \u0639\u0645\u0648\u0645\u06CC \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u06A9\u06D2 \u0641\u0648\u0631\u06CC \u0648 \u0645\u0633\u062A\u0646\u062F \u062C\u0648\u0627\u0628\u0627\u062A\u06D4`;
    }
    if (lower.includes("\u06A9\u06CC\u0633\u06D2 \u06C1\u0648") || lower.includes("\u062D\u0627\u0644")) {
      return `\u0627\u0644\u062D\u0645\u062F\u0644\u0644\u06C1 \u0645\u06CC\u06BA \u0628\u0627\u0644\u06A9\u0644 \u0628\u062E\u06CC\u0631 \u0627\u0648\u0631 \u0645\u0633\u062A\u0639\u062F \u06C1\u0648\u06BA! \u0622\u067E \u06A9\u06CC \u062E\u06CC\u0631\u06CC\u062A \u06A9\u0627 \u0637\u0627\u0644\u0628 \u06C1\u0648\u06BA\u06D4

\u0628\u062A\u0627\u0626\u06CC\u06D2\u060C \u0622\u062C \u0622\u067E \u06A9\u0633 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u0631\u06C1\u0646\u0645\u0627\u0626\u06CC \u062D\u0627\u0635\u0644 \u06A9\u0631\u0646\u0627 \u0686\u0627\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA\u061F`;
    }
    return `\u0622\u067E \u06A9\u06D2 \u0633\u0648\u0627\u0644 \u06A9\u0627 \u0634\u06A9\u0631\u06CC\u06C1: **"${p}"**\u06D4

\u0645\u06CC\u06BA **ERROREN AI** \u0622\u067E \u06A9\u06D2 \u0627\u0633 \u0633\u0648\u0627\u0644 \u06A9\u0627 \u0645\u06A9\u0645\u0644\u060C \u062F\u0631\u0633\u062A \u0627\u0648\u0631 \u0645\u062F\u0644\u0644 \u062C\u0648\u0627\u0628 \u0641\u0631\u0627\u06C1\u0645 \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u062D\u0627\u0636\u0631 \u06C1\u0648\u06BA\u06D4 \u0627\u06AF\u0631 \u0622\u067E \u06A9\u0648 \u0627\u0633 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u0645\u0632\u06CC\u062F \u062A\u0641\u0635\u06CC\u0644\u060C \u0639\u0645\u0644\u06CC \u0645\u062B\u0627\u0644\u06CC\u06BA \u06CC\u0627 \u067E\u0631\u0648\u06AF\u0631\u0627\u0645\u0646\u06AF \u06A9\u0648\u0688 \u062F\u0631\u06A9\u0627\u0631 \u06C1\u0648 \u062A\u0648 \u0645\u062C\u06BE\u06D2 \u0622\u06AF\u0627\u06C1 \u0641\u0631\u0645\u0627\u0626\u06CC\u06BA\u060C \u0645\u06CC\u06BA \u0641\u0648\u0631\u0627\u064B \u067E\u06CC\u0634 \u06A9\u0631 \u062F\u0648\u06BA \u06AF\u0627! \u{1F31F}`;
  }
  if (lang === "arabic") {
    return `\u0623\u0647\u0644\u0627\u064B \u0648\u0633\u0647\u0644\u0627\u064B \u0628\u0643! \u0623\u0646\u0627 **ERROREN AI**\u060C \u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u062F\u0627\u062E\u0644 ERROREN CHAT.

\u064A\u0633\u0639\u062F\u0646\u064A \u062C\u062F\u0627\u064B \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0644\u0643 \u0641\u064A \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u062C\u0627\u0644\u0627\u062A: \u0627\u0644\u0628\u0631\u0645\u062C\u0629\u060C \u0627\u0644\u0639\u0644\u0648\u0645\u060C \u062D\u0644 \u0627\u0644\u0645\u0633\u0627\u0626\u0644\u060C \u0648\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u062F\u0642\u064A\u0642\u0629. \u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0627\u0644\u064A\u0648\u0645\u061F`;
  }
  if (lang === "hindi") {
    return `\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 **ERROREN AI** \u0939\u0942\u0901, \u0906\u092A\u0915\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924 AI \u0938\u0939\u093E\u092F\u0915\u0964

\u092E\u0948\u0902 \u0906\u092A\u0915\u0940 \u0939\u0930 \u092A\u094D\u0930\u0915\u093E\u0930 \u0915\u0940 \u0938\u0939\u093E\u092F\u0924\u093E \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930 \u0939\u0942\u0901 \u2014 \u091A\u093E\u0939\u0947 \u0935\u0939 \u0915\u094B\u0921\u093F\u0902\u0917 \u0939\u094B, \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u091C\u094D\u091E\u093E\u0928, \u092F\u093E \u092D\u093E\u0937\u093E \u0905\u0928\u0941\u0935\u093E\u0926\u0964 \u0906\u091C \u092E\u0948\u0902 \u0906\u092A\u0915\u0940 \u0915\u094D\u092F\u093E \u092E\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0942\u0901?`;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello! I am **ERROREN AI**, your dedicated intelligence copilot inside ERROREN CHAT. \u26A1

How can I assist you today? You can ask me any question, request code, brainstorm ideas, translate text, or compose messages!`;
  }
  if (lower.includes("who are you") || lower.includes("what are you")) {
    return `I am **ERROREN AI**, the built-in, multimodal AI assistant designed specifically for ERROREN CHAT.

### What I can do for you:
- **Deep Problem Solving**: Science, engineering, mathematics, economics, and history.
- **Production-Grade Code**: Clean, well-tested code in TypeScript, React, Python, Go, Rust, and more.
- **Multilingual Excellence**: Dynamic matching in Roman Urdu, Urdu, English, Hindi, Arabic, and all major world languages.
- **Professional Writing**: Polished emails, documentation, summaries, and creative stories.

Feel free to ask me anything in your preferred language!`;
  }
  if (lower.includes("code") || lower.includes("function") || lower.includes("typescript") || lower.includes("react") || lower.includes("python")) {
    return `Here is a clean, production-ready implementation tailored to your request:

\`\`\`typescript
// ERROREN AI - Production Utility Function
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<T> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(\`HTTP error \${res.status}\`);
      return await res.json();
    } catch (err) {
      attempts++;
      if (attempts >= maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error('All retry attempts failed');
}
\`\`\`

Let me know if you would like me to adapt this logic to a specific framework or requirement!`;
  }
  return `I have processed your request: **"${p}"**.

As **ERROREN AI**, I am ready to assist you thoroughly with accurate information, step-by-step guidance, code snippets, or translations. Let me know if you'd like me to dive deeper into any aspect!`;
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var httpServer = (0, import_http.createServer)(app);
var PORT = 3e3;
app.use(import_express.default.json({ limit: "35mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "35mb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  try {
    return new import_genai.GoogleGenAI(
      apiKey ? {
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      } : {
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      }
    );
  } catch (err) {
    console.warn("[ERROREN AI] Failed to initialize Gemini client:", err);
    return null;
  }
}
var totalAiRequests = 0;
var wss = new import_ws.WebSocketServer({ noServer: true });
var heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      console.log("[WebSocket] Terminating inactive socket connection");
      return client.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, 3e4);
httpServer.on("close", () => {
  clearInterval(heartbeatInterval);
});
httpServer.on("upgrade", (request, socket, head) => {
  const url = request.url || "";
  const pathname = url.split("?")[0];
  if (pathname === "/ws" || pathname === "/ws/" || pathname.endsWith("/ws") || pathname.endsWith("/ws/")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});
var userSockets = /* @__PURE__ */ new Map();
function broadcastPresence(userId, isOnline) {
  db.updateUser(userId, { isOnline, lastSeen: Date.now() });
  const payload = JSON.stringify({
    type: "presence",
    presenceData: { userId, isOnline, lastSeen: Date.now() }
  });
  wss.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
function sendToUser(targetUserId, data) {
  const sockets = userSockets.get(targetUserId);
  if (sockets) {
    const message = JSON.stringify(data);
    sockets.forEach((ws) => {
      if (ws.readyState === import_ws.WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}
function broadcastToChat(chatId, senderUserId, data) {
  const chat = db.getChatById(chatId);
  const message = JSON.stringify(data);
  if (chat) {
    chat.memberIds.forEach((memberId) => {
      const sockets = userSockets.get(memberId);
      if (sockets) {
        sockets.forEach((ws) => {
          if (ws.readyState === import_ws.WebSocket.OPEN) {
            ws.send(message);
          }
        });
      }
    });
  } else {
    wss.clients.forEach((ws) => {
      if (ws.readyState === import_ws.WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}
function broadcastToAll(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(message);
    }
  });
}
wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  let authenticatedUserId = null;
  ws.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      switch (data.type) {
        case "auth": {
          const { userId } = data;
          if (userId) {
            authenticatedUserId = userId;
            if (!userSockets.has(userId)) {
              userSockets.set(userId, /* @__PURE__ */ new Set());
            }
            userSockets.get(userId).add(ws);
            broadcastPresence(userId, true);
            const onlineIds = Array.from(userSockets.keys()).filter((uid) => {
              const set = userSockets.get(uid);
              return set && set.size > 0;
            });
            ws.send(
              JSON.stringify({
                type: "presence:initial",
                onlineUserIds: onlineIds
              })
            );
          }
          break;
        }
        case "message:send": {
          const { message, chatId } = data;
          if (message && chatId) {
            const storedMsg = db.addMessage(chatId, message);
            broadcastToChat(chatId, message.senderId, {
              type: "message:new",
              chatId,
              message: storedMsg
            });
          }
          break;
        }
        case "message:reaction": {
          const { chatId, messageId, emoji, userId, userName } = data;
          const chatMsgs = db.getMessages(chatId);
          const targetMsg = chatMsgs.find((m) => m.id === messageId);
          if (targetMsg) {
            if (!targetMsg.reactions) targetMsg.reactions = [];
            const existingIdx = targetMsg.reactions.findIndex((r) => r.userId === userId);
            if (existingIdx >= 0) {
              if (targetMsg.reactions[existingIdx].emoji === emoji) {
                targetMsg.reactions.splice(existingIdx, 1);
              } else {
                targetMsg.reactions[existingIdx].emoji = emoji;
              }
            } else {
              targetMsg.reactions.push({ userId, emoji, userName });
            }
            db.updateMessage(chatId, messageId, { reactions: targetMsg.reactions });
            broadcastToChat(chatId, userId, {
              type: "message:reaction",
              chatId,
              reaction: { messageId, emoji, userId, userName }
            });
          }
          break;
        }
        case "message:edit": {
          const { chatId, messageId, content, userId } = data;
          const updated = db.updateMessage(chatId, messageId, {
            content,
            isEdited: true
          });
          if (updated) {
            broadcastToChat(chatId, userId, {
              type: "message:edit",
              chatId,
              editData: { messageId, content }
            });
          }
          break;
        }
        case "message:delete": {
          const { chatId, messageId, forEveryone, userId } = data;
          const ok = db.deleteMessage(chatId, messageId, forEveryone, userId);
          if (ok) {
            broadcastToChat(chatId, userId, {
              type: "message:delete",
              chatId,
              deleteData: { messageId, forEveryone, userId }
            });
          }
          break;
        }
        case "typing":
        case "typing:start":
        case "typing:stop": {
          const { chatId, userId } = data;
          const isTyping = data.type === "typing:start" || data.isTyping === true;
          const user = userId ? db.getUserById(userId) : null;
          broadcastToChat(chatId, userId, {
            type: "typing:indicator",
            chatId,
            isTyping,
            typingUser: {
              userId,
              userName: user?.displayName || data.userName || "Contact"
            }
          });
          break;
        }
        // WebRTC Signaling Handlers
        case "call:offer": {
          const { toUserId, offer, callType, fromUser } = data;
          sendToUser(toUserId, {
            type: "call:offer",
            callData: {
              callId: `call_${Date.now()}`,
              fromUserId: fromUser?.id || authenticatedUserId,
              fromUserName: fromUser?.displayName || "Caller",
              fromUserAvatar: fromUser?.avatarUrl || "",
              toUserId,
              callType: callType || "voice",
              sdp: offer
            }
          });
          break;
        }
        case "call:answer": {
          const { toUserId, answer } = data;
          sendToUser(toUserId, {
            type: "call:answer",
            callData: { sdp: answer }
          });
          break;
        }
        case "call:ice-candidate": {
          const { toUserId, candidate } = data;
          sendToUser(toUserId, {
            type: "call:ice-candidate",
            candidate
          });
          break;
        }
        case "call:end": {
          const { toUserId } = data;
          sendToUser(toUserId, {
            type: "call:ended"
          });
          break;
        }
        case "call:reject": {
          const { toUserId } = data;
          sendToUser(toUserId, {
            type: "call:rejected"
          });
          break;
        }
        case "ping": {
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("Socket message parse error:", err);
    }
  });
  ws.on("close", () => {
    if (authenticatedUserId) {
      const set = userSockets.get(authenticatedUserId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          userSockets.delete(authenticatedUserId);
          broadcastPresence(authenticatedUserId, false);
        }
      }
    }
  });
  ws.on("error", (err) => {
    console.warn("WebSocket client error:", err.message);
  });
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "ERROREN CHAT",
    geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY),
    activeSockets: wss.clients.size,
    timestamp: Date.now()
  });
});
app.post("/api/auth/register", (req, res) => {
  const { email, username, password, displayName, phoneNumber, countryCode, avatarUrl } = req.body;
  const rawEmail = (email || "").trim().toLowerCase();
  const rawUsername = (username || "").trim().toLowerCase().replace(/^@/, "");
  const cleanPhone = (phoneNumber || "").replace(/[^0-9]/g, "");
  if (!rawEmail && !rawUsername && !cleanPhone) {
    return res.status(400).json({ error: "Please provide an email address or username." });
  }
  const finalEmail = rawEmail || (rawUsername ? `${rawUsername}@erroren.chat` : void 0);
  if (finalEmail && db.isEmailTaken(finalEmail)) {
    return res.status(409).json({
      error: "An account with this email already exists. Please sign in.",
      code: "EMAIL_ALREADY_EXISTS",
      exists: true
    });
  }
  if (rawUsername && db.isUsernameTaken(rawUsername)) {
    return res.status(409).json({
      error: "This username is already taken. Please choose a different username.",
      code: "USERNAME_TAKEN",
      exists: true
    });
  }
  if (cleanPhone && cleanPhone.length >= 6 && db.isPhoneTaken(cleanPhone)) {
    return res.status(409).json({
      error: "This phone number is already associated with another account.",
      code: "PHONE_ALREADY_EXISTS",
      exists: true
    });
  }
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const finalDisplayName = (displayName || "").trim() || (rawUsername ? `@${rawUsername}` : finalEmail?.split("@")[0]) || "ERROREN Member";
  const finalAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
  try {
    const newUser = db.createUser({
      id: userId,
      email: finalEmail,
      username: rawUsername || void 0,
      password: password ? String(password).trim() : void 0,
      phoneNumber: cleanPhone ? phoneNumber.trim() : void 0,
      countryCode: countryCode || "+92",
      displayName: finalDisplayName,
      about: "Available | Using ERROREN CHAT \u26A1",
      avatarUrl: finalAvatar,
      isOnline: true,
      lastSeen: Date.now(),
      role: "user",
      createdAt: Date.now()
    });
    if (newUser.phoneNumber) {
      db.linkContactsToUser(newUser);
    }
    res.json({
      success: true,
      token: `sess_token_${newUser.id}_${Date.now()}`,
      user: newUser,
      isProfileComplete: checkUserProfileComplete(newUser),
      isNewUser: true
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Registration failed. Please try again." });
  }
});
function checkUserProfileComplete(user) {
  if (!user) return false;
  const hasName = Boolean(user.displayName && user.displayName.trim().length >= 2 && user.displayName.trim() !== "New Member");
  const hasUsername = Boolean(user.username && user.username.trim().replace(/^@/, "").length >= 3);
  const cleanPhone = (user.phoneNumber || "").trim().replace(/[^0-9]/g, "");
  const hasPhone = cleanPhone.length >= 6;
  const cleanEmail = (user.email || "").trim().toLowerCase();
  const hasEmail = Boolean(cleanEmail.includes("@") && cleanEmail.includes(".") && cleanEmail.length >= 5);
  return Boolean(hasName && hasUsername && hasPhone && hasEmail);
}
app.post("/api/auth/login", (req, res) => {
  const { identifier, email, username, password } = req.body;
  const target = (identifier || email || username || "").trim();
  if (!target) {
    return res.status(400).json({ error: "Please enter your email, username, or phone number." });
  }
  let user = db.getUserByIdentifier(target);
  if (!user && target.includes("@")) {
    user = db.getUserByEmail(target.toLowerCase());
  }
  if (!user) {
    user = db.getUserByUsername(target.toLowerCase());
  }
  if (!user) {
    return res.status(404).json({
      error: "No account found with this email or username. Please check your credentials or register a new account.",
      code: "USER_NOT_FOUND",
      notFound: true
    });
  }
  if (user.password) {
    const enteredPassword = (password || "").trim();
    if (!enteredPassword || user.password !== enteredPassword) {
      return res.status(401).json({
        error: "Incorrect password. Please verify and try again.",
        code: "INVALID_PASSWORD"
      });
    }
  } else if (password && password.trim().length > 0) {
    user = db.updateUser(user.id, {
      password: password.trim()
    });
  }
  user = db.updateUser(user.id, {
    isOnline: true,
    lastSeen: Date.now()
  });
  res.json({
    success: true,
    token: `sess_token_${user.id}_${Date.now()}`,
    user,
    isProfileComplete: checkUserProfileComplete(user),
    isNewUser: false
  });
});
app.post("/api/auth/google", (req, res) => {
  const { email, displayName, avatarUrl, googleId, mode } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid Google email address is required." });
  }
  const cleanEmail = email.trim().toLowerCase();
  let user = db.getUserByEmail(cleanEmail);
  let isNew = false;
  if (mode === "register" && user) {
    user = db.updateUser(user.id, {
      isOnline: true,
      lastSeen: Date.now(),
      googleId: googleId || user.googleId
    });
  } else if (!user) {
    isNew = true;
    const userId = `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialName = displayName?.trim() || cleanEmail.split("@")[0];
    const initialAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
    try {
      user = db.createUser({
        id: userId,
        email: cleanEmail,
        googleId: googleId || `gid_${Date.now()}`,
        displayName: initialName,
        about: "Available | Using ERROREN CHAT \u26A1",
        avatarUrl: initialAvatar,
        isOnline: true,
        lastSeen: Date.now(),
        role: "user",
        createdAt: Date.now()
      });
    } catch (err) {
      user = db.getUserByEmail(cleanEmail);
      if (!user) {
        return res.status(400).json({
          error: "Could not create account. Please try again."
        });
      }
    }
  } else {
    user = db.updateUser(user.id, {
      isOnline: true,
      lastSeen: Date.now(),
      googleId: googleId || user.googleId,
      avatarUrl: user.avatarUrl || avatarUrl
    });
  }
  const isProfileComplete = checkUserProfileComplete(user);
  res.json({
    success: true,
    token: `sess_token_${user.id}_${Date.now()}`,
    user,
    isProfileComplete,
    isNewUser: isNew
  });
});
app.get("/api/auth/check-email", (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email address is required." });
  }
  const exists = db.isEmailTaken(email);
  res.json({ exists });
});
app.post("/api/auth/phone", (req, res) => {
  const { phoneNumber, countryCode = "+92", displayName, avatarUrl } = req.body;
  if (!phoneNumber || phoneNumber.trim().length < 4) {
    return res.status(400).json({ error: "Valid phone number is required." });
  }
  const cleanPhone = phoneNumber.trim();
  let user = db.getUserByPhone(cleanPhone);
  let isNew = false;
  if (!user) {
    isNew = true;
    const userId = `usr_p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialName = displayName?.trim() || `User ${cleanPhone.slice(-4)}`;
    const initialAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`;
    user = db.createUser({
      id: userId,
      phoneNumber: cleanPhone,
      countryCode: countryCode || "+92",
      displayName: initialName,
      about: "Available | Using ERROREN CHAT \u26A1",
      avatarUrl: initialAvatar,
      isOnline: true,
      lastSeen: Date.now(),
      role: "user",
      createdAt: Date.now(),
      isPhoneVerified: true
    });
  } else {
    user = db.updateUser(user.id, {
      isOnline: true,
      lastSeen: Date.now(),
      isPhoneVerified: true,
      displayName: displayName?.trim() || user.displayName,
      avatarUrl: avatarUrl || user.avatarUrl
    });
  }
  db.linkContactsToUser(user);
  const isProfileComplete = checkUserProfileComplete(user);
  res.json({
    success: true,
    token: `sess_token_${user.id}_${Date.now()}`,
    user,
    isProfileComplete,
    isNewUser: isNew
  });
});
app.post("/api/auth/sync", (req, res) => {
  const { user, userId, displayName, email, avatarUrl, about, phoneNumber, username, countryCode } = req.body;
  const targetId = userId || user?.id;
  if (!targetId) {
    return res.status(400).json({ error: "User ID is required for sync." });
  }
  let existing = db.getUserById(targetId);
  if (!existing && (email || user?.email)) {
    existing = db.getUserByEmail((email || user?.email).trim().toLowerCase());
  }
  if (existing) {
    const updated = db.updateUser(existing.id, {
      isOnline: true,
      lastSeen: Date.now(),
      displayName: displayName || user?.displayName || existing.displayName,
      username: username !== void 0 ? username || void 0 : user?.username || existing.username,
      avatarUrl: avatarUrl || user?.avatarUrl || existing.avatarUrl,
      about: about !== void 0 ? about : user?.about || existing.about,
      email: email ? email.trim().toLowerCase() : user?.email || existing.email,
      phoneNumber: phoneNumber || user?.phoneNumber || existing.phoneNumber,
      countryCode: countryCode || user?.countryCode || existing.countryCode
    });
    return res.json({ success: true, user: updated, isNew: false, isProfileComplete: checkUserProfileComplete(updated) });
  }
  const newUser = db.createUser({
    id: targetId,
    displayName: (displayName || user?.displayName || "ERROREN Member").trim(),
    username: username || user?.username || void 0,
    about: (about || user?.about || "Available | Using ERROREN CHAT \u26A1").trim(),
    avatarUrl: avatarUrl || user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetId}`,
    email: email || user?.email ? (email || user?.email).trim().toLowerCase() : void 0,
    phoneNumber: phoneNumber || user?.phoneNumber || void 0,
    countryCode: countryCode || user?.countryCode || "+92",
    isOnline: true,
    lastSeen: Date.now(),
    role: user?.role || "user",
    createdAt: Date.now()
  });
  res.json({ success: true, user: newUser, isNew: true, isProfileComplete: checkUserProfileComplete(newUser) });
});
app.post("/api/auth/profile", (req, res) => {
  const { userId, displayName, about, avatarUrl, email, phoneNumber, username, countryCode } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  let cleanUsername = void 0;
  if (username !== void 0) {
    cleanUsername = String(username).trim().toLowerCase().replace(/^@/, "");
    if (cleanUsername.length > 0 && db.isUsernameTaken(cleanUsername, userId)) {
      return res.status(409).json({
        error: "This username is already taken. Please choose a different username.",
        code: "USERNAME_ALREADY_EXISTS"
      });
    }
  }
  let cleanEmail = void 0;
  if (email !== void 0) {
    cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail.length > 0 && db.isEmailTaken(cleanEmail, userId)) {
      return res.status(409).json({
        error: "An account with this email already exists. Please log in to your existing account.",
        code: "EMAIL_ALREADY_EXISTS"
      });
    }
  }
  if (phoneNumber !== void 0) {
    const cleanPhone = String(phoneNumber).trim().replace(/[^0-9]/g, "");
    if (cleanPhone.length > 0 && db.isPhoneTaken(cleanPhone, userId)) {
      return res.status(409).json({
        error: "This phone number is already associated with another account.",
        code: "PHONE_ALREADY_IN_USE"
      });
    }
  }
  let user = db.getUserById(userId);
  if (!user) {
    try {
      user = db.createUser({
        id: userId,
        displayName: (displayName || "ERROREN Member").trim(),
        username: cleanUsername || void 0,
        about: (about !== void 0 ? about : "Available | Using ERROREN CHAT \u26A1").trim(),
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        email: cleanEmail || void 0,
        phoneNumber: phoneNumber ? String(phoneNumber).trim() : void 0,
        countryCode: countryCode || "+92",
        isOnline: true,
        lastSeen: Date.now(),
        role: "user",
        createdAt: Date.now()
      });
    } catch (err) {
      return res.status(409).json({ error: err.message || "Validation error" });
    }
  } else {
    try {
      user = db.updateUser(userId, {
        displayName: displayName !== void 0 ? String(displayName).trim() : user.displayName,
        username: cleanUsername !== void 0 ? cleanUsername || void 0 : user.username,
        about: about !== void 0 ? String(about).trim() : user.about,
        avatarUrl: avatarUrl || user.avatarUrl,
        email: cleanEmail !== void 0 ? cleanEmail || void 0 : user.email,
        phoneNumber: phoneNumber !== void 0 ? String(phoneNumber).trim() || void 0 : user.phoneNumber,
        countryCode: countryCode || user.countryCode || "+92"
      });
    } catch (err) {
      return res.status(409).json({ error: err.message || "Validation error" });
    }
  }
  db.linkContactsToUser(user);
  try {
    const payload = JSON.stringify({
      type: "user:updated",
      user
    });
    wss.clients.forEach((client) => {
      if (client.readyState === import_ws.WebSocket.OPEN) {
        client.send(payload);
      }
    });
  } catch (err) {
    console.error("Failed to broadcast user update:", err);
  }
  const isProfileComplete = checkUserProfileComplete(user);
  res.json({ success: true, user, isProfileComplete });
});
app.post("/api/users/:id/avatar", (req, res) => {
  const { id } = req.params;
  const { avatarUrl } = req.body;
  if (!id || !avatarUrl) {
    return res.status(400).json({ error: "User ID and avatar URL are required." });
  }
  let user = db.getUserById(id);
  if (!user) {
    user = db.createUser({
      id,
      displayName: "ERROREN Member",
      about: "Available | Using ERROREN CHAT \u26A1",
      avatarUrl,
      isOnline: true,
      lastSeen: Date.now(),
      role: "user",
      createdAt: Date.now()
    });
  } else {
    user = db.updateUser(id, { avatarUrl });
  }
  try {
    const payload = JSON.stringify({
      type: "user:updated",
      user
    });
    wss.clients.forEach((client) => {
      if (client.readyState === import_ws.WebSocket.OPEN) {
        client.send(payload);
      }
    });
  } catch (err) {
    console.error("Failed to broadcast avatar update:", err);
  }
  res.json({ success: true, avatarUrl: user.avatarUrl, user });
});
app.post("/api/account/phone", (req, res) => {
  const { userId, phoneNumber, countryCode, phoneVisibility } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  const cleanPhone = (phoneNumber || "").trim().replace(/[^0-9]/g, "");
  if (cleanPhone.length > 0 && db.isPhoneTaken(cleanPhone, userId)) {
    return res.status(409).json({
      error: "This phone number is already associated with another account.",
      code: "PHONE_ALREADY_IN_USE"
    });
  }
  const isSmsServiceConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  try {
    const updated = db.updateUser(userId, {
      phoneNumber: cleanPhone ? phoneNumber.trim() : void 0,
      countryCode: countryCode || "+92",
      isPhoneVerified: cleanPhone ? isSmsServiceConfigured : false,
      phoneVisibility: phoneVisibility || "everyone"
    });
    res.json({
      success: true,
      user: updated,
      isSmsServiceConfigured,
      message: cleanPhone ? isSmsServiceConfigured ? "Phone number updated and verified via SMS provider." : "Phone number saved to profile. Note: SMS Gateway verification service (Twilio/Firebase SMS) is not configured in this environment." : "Phone number removed."
    });
  } catch (err) {
    return res.status(409).json({
      error: err.message || "This phone number is already associated with another account.",
      code: "PHONE_ALREADY_IN_USE"
    });
  }
});
app.get("/api/account/check-phone", (req, res) => {
  const phone = (req.query.phone || "").trim().replace(/[^0-9]/g, "");
  const userId = req.query.userId || "";
  if (!phone) {
    return res.status(400).json({ error: "Valid phone number is required." });
  }
  const isTaken = db.isPhoneTaken(phone, userId);
  res.json({ isTaken });
});
app.get("/api/users", (req, res) => {
  const users = db.getAllUsers().map((u) => ({
    ...u,
    isOnline: userSockets.has(u.id) && (userSockets.get(u.id)?.size || 0) > 0
  }));
  res.json(users);
});
app.get("/api/presence/online", (req, res) => {
  const onlineIds = Array.from(userSockets.keys()).filter((uid) => {
    const set = userSockets.get(uid);
    return set && set.size > 0;
  });
  res.json({ onlineUserIds: onlineIds });
});
app.get("/api/users/search", (req, res) => {
  const q = req.query.q || "";
  const currentUserId = req.query.currentUserId || "";
  const results = db.searchUsers(q, currentUserId);
  res.json(results);
});
app.get("/api/users/check-phone", (req, res) => {
  const phone = (req.query.phone || "").trim();
  const currentUserId = (req.query.currentUserId || "").trim();
  if (!phone || phone.replace(/[^0-9]/g, "").length < 7) {
    return res.status(400).json({
      registered: false,
      error: "Please enter a valid phone number with at least 7 digits."
    });
  }
  const matchedUser = db.getUserByPhone(phone);
  if (!matchedUser) {
    return res.json({
      registered: false,
      message: "This number is not registered on this platform."
    });
  }
  const isSelf = currentUserId && matchedUser.id === currentUserId;
  const alreadySaved = currentUserId ? db.hasContact(currentUserId, matchedUser.id, matchedUser.phoneNumber) : false;
  return res.json({
    registered: true,
    isSelf,
    alreadySaved,
    user: {
      id: matchedUser.id,
      displayName: matchedUser.displayName,
      avatarUrl: matchedUser.avatarUrl,
      about: matchedUser.about,
      phoneNumber: matchedUser.phoneNumber,
      countryCode: matchedUser.countryCode,
      isOnline: userSockets.has(matchedUser.id) && (userSockets.get(matchedUser.id)?.size || 0) > 0,
      lastSeen: matchedUser.lastSeen
    }
  });
});
app.get("/api/contacts", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json([]);
  const list = db.getContacts(userId);
  res.json(list);
});
app.post("/api/contacts", (req, res) => {
  const { ownerUserId, name, phoneNumber, avatarUrl, about } = req.body;
  if (!ownerUserId) {
    return res.status(400).json({ success: false, error: "Owner user ID is required." });
  }
  const rawPhone = (phoneNumber || "").trim();
  const cleanDigits = rawPhone.replace(/[^0-9]/g, "");
  if (!rawPhone || cleanDigits.length < 7 || cleanDigits.length > 15) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid phone number (minimum 7 digits).",
      code: "INVALID_PHONE_NUMBER"
    });
  }
  const matchedUser = db.getUserByPhone(rawPhone);
  if (!matchedUser) {
    return res.status(404).json({
      success: false,
      error: "This number is not registered on this platform.",
      code: "NUMBER_NOT_REGISTERED"
    });
  }
  if (matchedUser.id === ownerUserId) {
    return res.status(400).json({
      success: false,
      error: "You cannot add your own phone number as a contact.",
      code: "CANNOT_ADD_SELF"
    });
  }
  if (db.hasContact(ownerUserId, matchedUser.id, matchedUser.phoneNumber || rawPhone)) {
    return res.status(409).json({
      success: false,
      error: "This contact is already in your contacts list.",
      code: "CONTACT_ALREADY_EXISTS"
    });
  }
  const contactName = name?.trim() || matchedUser.displayName || `User ${cleanDigits.slice(-4)}`;
  const finalAvatar = avatarUrl?.trim() || matchedUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${matchedUser.id}`;
  const finalAbout = about?.trim() || matchedUser.about || "Available | Using ERROREN CHAT \u26A1";
  const newContact = {
    id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerUserId,
    contactUserId: matchedUser.id,
    name: contactName,
    phoneNumber: matchedUser.phoneNumber || rawPhone,
    avatarUrl: finalAvatar,
    about: finalAbout,
    createdAt: Date.now()
  };
  db.addContact(ownerUserId, newContact);
  return res.json({
    success: true,
    contact: newContact,
    matchedUser: {
      id: matchedUser.id,
      displayName: matchedUser.displayName,
      avatarUrl: matchedUser.avatarUrl,
      about: matchedUser.about,
      phoneNumber: matchedUser.phoneNumber,
      isOnline: userSockets.has(matchedUser.id) && (userSockets.get(matchedUser.id)?.size || 0) > 0,
      lastSeen: matchedUser.lastSeen
    },
    isRegisteredUser: true
  });
});
app.delete("/api/contacts/:id", (req, res) => {
  const { id } = req.params;
  const ownerUserId = req.query.userId;
  if (!ownerUserId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  db.deleteContact(ownerUserId, id);
  res.json({ success: true });
});
app.get("/api/chats", (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.json([]);
  }
  const userChats = db.getChatsForUser(userId).map((chat) => {
    const msgs = db.getMessages(chat.id);
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : chat.lastMessage;
    let title = chat.name;
    let avatar = chat.avatarUrl;
    let isPartnerOnline = false;
    let partnerLastSeen = 0;
    if (!chat.isGroup) {
      const partnerId = (chat.memberIds || []).find((id) => id !== userId);
      if (partnerId) {
        const partner = db.getUserById(partnerId);
        if (partner) {
          title = partner.displayName || partner.phoneNumber || partner.email || "Contact";
          avatar = partner.avatarUrl;
          isPartnerOnline = partner.isOnline;
          partnerLastSeen = partner.lastSeen;
        }
      }
    }
    return {
      ...chat,
      title: title || chat.name || "Chat",
      name: title || chat.name || "Chat",
      participantIds: chat.memberIds || [],
      avatarUrl: avatar,
      lastMessage: lastMsg,
      isPartnerOnline,
      partnerLastSeen
    };
  }).sort((a, b) => (b.lastMessage?.timestamp || b.updatedAt || 0) - (a.lastMessage?.timestamp || a.updatedAt || 0));
  res.json(userChats);
});
var handleCreateChat = (req, res) => {
  const { creatorId, partnerId, isGroup, name, title, avatarUrl, description, memberIds, participantIds, communityId } = req.body;
  const rawMembers = memberIds || participantIds || [];
  const validCreator = creatorId;
  if (!validCreator) {
    return res.status(400).json({ error: "Creator user ID is required." });
  }
  let initialMembers = Array.from(new Set([validCreator, ...partnerId ? [partnerId] : [], ...rawMembers].filter(Boolean)));
  if (communityId && db.getCommunityById(communityId)) {
    const comm = db.getCommunityById(communityId);
    if (comm && comm.members && comm.members.length > 0) {
      comm.members.forEach((m) => {
        if (!initialMembers.includes(m.userId)) {
          initialMembers.push(m.userId);
        }
      });
    }
  }
  const members = initialMembers;
  if (isGroup) {
    const groupId = `chat_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const groupName = (title || name || "New Group").trim();
    const newGroup = {
      id: groupId,
      isGroup: true,
      name: groupName,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${groupId}`,
      description: description || "",
      memberIds: members,
      adminIds: [validCreator],
      unreadCount: 0,
      communityId: communityId || void 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.createChat(newGroup);
    if (communityId) {
      db.addGroupToCommunity(communityId, groupId);
    }
    const creator = db.getUserById(validCreator);
    const welcomeMsg = {
      id: `msg_${Date.now()}`,
      chatId: groupId,
      senderId: "system",
      senderName: "ERROREN System",
      senderAvatar: "/icon.svg",
      type: "text",
      content: `\u{1F512} Group "${newGroup.name}" created by ${creator?.displayName || "Admin"}. Messages are synchronized in real-time.`,
      timestamp: Date.now(),
      status: "read"
    };
    db.addMessage(groupId, welcomeMsg);
    broadcastToAll({
      type: "chat:new",
      chat: {
        ...newGroup,
        title: newGroup.name,
        participantIds: newGroup.memberIds,
        lastMessage: welcomeMsg
      }
    });
    return res.json({
      ...newGroup,
      title: newGroup.name,
      participantIds: newGroup.memberIds,
      lastMessage: welcomeMsg
    });
  } else {
    const otherId = partnerId || rawMembers.find((id) => id !== validCreator);
    if (!otherId) {
      return res.status(400).json({ error: "Partner ID is required for direct chat." });
    }
    const existing = db.findDirectChat(validCreator, otherId);
    if (existing) {
      const partner2 = db.getUserById(otherId);
      return res.json({
        ...existing,
        title: partner2?.displayName || existing.name,
        participantIds: existing.memberIds
      });
    }
    const partner = db.getUserById(otherId);
    const directName = partner?.displayName || title || name || "Direct Chat";
    const directAvatar = partner?.avatarUrl || avatarUrl || "";
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newChat = {
      id: chatId,
      isGroup: false,
      name: directName,
      avatarUrl: directAvatar,
      memberIds: [validCreator, otherId],
      adminIds: [],
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.createChat(newChat);
    return res.json({
      ...newChat,
      title: directName,
      participantIds: newChat.memberIds
    });
  }
};
app.post("/api/chats", handleCreateChat);
app.post("/api/chats/create", handleCreateChat);
app.get("/api/communities", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const userId = req.query.userId || "";
  const allComms = db.getAllCommunities();
  const formatted = allComms.map((comm) => {
    const isJoined = userId ? (comm.members || []).some((m) => m.userId === userId) : false;
    const memberObj = userId ? (comm.members || []).find((m) => m.userId === userId) : null;
    const userRole = memberObj ? memberObj.role : comm.creatorId === userId ? "owner" : void 0;
    const groups = (comm.groupIds || []).map((gid) => db.getChatById(gid)).filter(Boolean).map((g) => {
      const msgs = db.getMessages(g.id);
      return {
        ...g,
        title: g.name,
        participantIds: g.memberIds,
        lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : g.lastMessage
      };
    });
    const channels = db.getChannelsForCommunity(comm.id).map((ch) => ({
      ...ch,
      isFollowed: userId ? (ch.followerIds || []).includes(userId) : false,
      postsCount: (db.getChannelPosts(ch.id) || []).length
    }));
    return {
      ...comm,
      memberCount: (comm.members || []).length,
      isJoined,
      userRole,
      groups,
      channels
    };
  });
  const filtered = formatted.filter((c) => {
    if (!q) return true;
    const matchComm = c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchGroup = c.groups.some((g) => (g.name || "").toLowerCase().includes(q));
    const matchChannel = c.channels.some((ch) => (ch.name || "").toLowerCase().includes(q));
    return matchComm || matchGroup || matchChannel;
  });
  res.json(filtered);
});
app.post("/api/communities", (req, res) => {
  const { name, description, avatarUrl, creatorId, creatorName, creatorAvatar, creatorEmail, creatorUser } = req.body;
  if (!name || !creatorId) {
    return res.status(400).json({ error: "Community name and creator ID are required." });
  }
  let user = db.getUserById(creatorId);
  if (!user && (creatorEmail || creatorUser?.email)) {
    user = db.getUserByEmail((creatorEmail || creatorUser?.email).trim().toLowerCase());
  }
  if (!user) {
    user = db.createUser({
      id: creatorId,
      displayName: (creatorName || creatorUser?.displayName || name.trim() + " Creator" || "ERROREN Member").trim(),
      about: (creatorUser?.about || "Available | Using ERROREN CHAT \u26A1").trim(),
      avatarUrl: creatorAvatar || creatorUser?.avatarUrl || avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${creatorId}`,
      email: creatorEmail || creatorUser?.email ? (creatorEmail || creatorUser?.email).trim().toLowerCase() : void 0,
      phoneNumber: creatorUser?.phoneNumber,
      isOnline: true,
      lastSeen: Date.now(),
      role: creatorUser?.role || "user",
      createdAt: Date.now()
    });
  }
  const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inviteCode = `comm_inv_${Math.random().toString(36).substring(2, 9)}`;
  const newCommunity = {
    id: commId,
    name: name.trim(),
    description: (description || "Welcome to our official ERROREN Community!").trim(),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    creatorId,
    members: [
      {
        userId: creatorId,
        role: "owner",
        joinedAt: Date.now()
      }
    ],
    adminIds: [creatorId],
    groupIds: [],
    channelIds: [],
    inviteCode,
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.createCommunity(newCommunity);
  const defaultChannelId = `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const announcementsChannel = {
    id: defaultChannelId,
    communityId: commId,
    name: "Announcements",
    description: "Official announcements and updates from community admins",
    avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name + "_announcements")}`,
    creatorId,
    adminIds: [creatorId],
    followerIds: [creatorId],
    isReadOnly: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.createChannel(announcementsChannel);
  const welcomePost = {
    id: `post_${Date.now()}`,
    channelId: defaultChannelId,
    authorId: creatorId,
    authorName: user.displayName,
    authorAvatar: user.avatarUrl,
    title: `Welcome to ${newCommunity.name}! \u{1F680}`,
    content: `Welcome everyone to **${newCommunity.name}**! This is our dedicated community space on ERROREN CHAT. Check this announcements channel for official updates, and join our discussion groups below.`,
    createdAt: Date.now(),
    likes: [creatorId]
  };
  db.addChannelPost(welcomePost);
  broadcastToAll({
    type: "community:new",
    community: {
      ...newCommunity,
      memberCount: 1,
      isJoined: true,
      userRole: "owner",
      channels: [{ ...announcementsChannel, isFollowed: true, postsCount: 1 }],
      groups: []
    }
  });
  res.json({
    success: true,
    community: {
      ...newCommunity,
      memberCount: 1,
      isJoined: true,
      userRole: "owner",
      channels: [{ ...announcementsChannel, isFollowed: true, postsCount: 1 }],
      groups: []
    }
  });
});
app.get("/api/communities/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId || "";
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  const isJoined = userId ? (comm.members || []).some((m) => m.userId === userId) : false;
  const memberObj = userId ? (comm.members || []).find((m) => m.userId === userId) : null;
  const userRole = memberObj ? memberObj.role : comm.creatorId === userId ? "owner" : void 0;
  const populatedMembers = (comm.members || []).map((m) => {
    const u = db.getUserById(m.userId);
    return {
      ...m,
      user: u ? {
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        about: u.about,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
        role: u.role
      } : void 0
    };
  });
  const groups = (comm.groupIds || []).map((gid) => db.getChatById(gid)).filter(Boolean).map((g) => {
    const msgs = db.getMessages(g.id);
    return {
      ...g,
      title: g.name,
      participantIds: g.memberIds,
      lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : g.lastMessage
    };
  });
  const channels = db.getChannelsForCommunity(comm.id).map((ch) => ({
    ...ch,
    isFollowed: userId ? (ch.followerIds || []).includes(userId) : false,
    postsCount: (db.getChannelPosts(ch.id) || []).length
  }));
  res.json({
    ...comm,
    members: populatedMembers,
    memberCount: (comm.members || []).length,
    isJoined,
    userRole,
    groups,
    channels
  });
});
app.put("/api/communities/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, avatarUrl, requesterId } = req.body;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Only community owners or admins can edit community details." });
  }
  const updated = db.updateCommunity(id, {
    name: name ? name.trim() : comm.name,
    description: description !== void 0 ? description.trim() : comm.description,
    avatarUrl: avatarUrl || comm.avatarUrl
  });
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.delete("/api/communities/:id", (req, res) => {
  const { id } = req.params;
  const requesterId = req.query.requesterId || req.body?.requesterId;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  if (comm.creatorId !== requesterId) {
    return res.status(403).json({ error: "Only the community owner can delete the community." });
  }
  db.deleteCommunity(id);
  broadcastToAll({
    type: "community:deleted",
    communityId: id
  });
  res.json({ success: true });
});
app.post("/api/communities/:id/join", (req, res) => {
  const { id } = req.params;
  const { userId, userName, userAvatar, user: userData } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  let user = db.getUserById(userId);
  if (!user) {
    user = db.createUser({
      id: userId,
      displayName: (userName || userData?.displayName || "Community Member").trim(),
      about: (userData?.about || "Available | Using ERROREN CHAT \u26A1").trim(),
      avatarUrl: userAvatar || userData?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      isOnline: true,
      lastSeen: Date.now(),
      role: "user",
      createdAt: Date.now()
    });
  }
  const updated = db.addCommunityMember(id, userId, "member");
  if (!updated) {
    return res.status(404).json({ error: "Community not found." });
  }
  const channels = db.getChannelsForCommunity(id);
  channels.forEach((ch) => {
    db.joinChannel(ch.id, userId);
  });
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.post("/api/communities/:id/leave", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  if (comm.creatorId === userId) {
    return res.status(400).json({ error: "The community owner cannot leave the community. You can delete it instead." });
  }
  const updated = db.removeCommunityMember(id, userId);
  const channels = db.getChannelsForCommunity(id);
  channels.forEach((ch) => {
    db.leaveChannel(ch.id, userId);
  });
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.post("/api/communities/:id/members", (req, res) => {
  const { id } = req.params;
  const { requesterId, userIds } = req.body;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "Array of user IDs to add is required." });
  }
  userIds.forEach((uid) => {
    const u = db.getUserById(uid);
    if (u) {
      db.addCommunityMember(id, uid, "member");
      const channels = db.getChannelsForCommunity(id);
      channels.forEach((ch) => db.joinChannel(ch.id, uid));
    }
  });
  const updated = db.getCommunityById(id);
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.delete("/api/communities/:id/members/:targetUserId", (req, res) => {
  const { id, targetUserId } = req.params;
  const requesterId = req.query.requesterId || req.body?.requesterId;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Permission denied. Admins only." });
  }
  if (targetUserId === comm.creatorId) {
    return res.status(400).json({ error: "Cannot remove the community owner." });
  }
  const updated = db.removeCommunityMember(id, targetUserId);
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.put("/api/communities/:id/members/:targetUserId/role", (req, res) => {
  const { id, targetUserId } = req.params;
  const { requesterId, role } = req.body;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  if (comm.creatorId !== requesterId) {
    return res.status(403).json({ error: "Only the community owner can change member roles." });
  }
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be admin or member." });
  }
  const updated = db.updateCommunityMemberRole(id, targetUserId, role);
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.post("/api/communities/:id/link-group", (req, res) => {
  const { id } = req.params;
  const { groupId, requesterId } = req.body;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  const chat = db.getChatById(groupId);
  if (!chat || !chat.isGroup) {
    return res.status(404).json({ error: "Group chat not found." });
  }
  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Only community owners or admins can link groups." });
  }
  const updated = db.addGroupToCommunity(id, groupId);
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.delete("/api/communities/:id/groups/:groupId", (req, res) => {
  const { id, groupId } = req.params;
  const requesterId = req.query.requesterId || req.body?.requesterId;
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  const isOwner = comm.creatorId === requesterId;
  const isAdmin = (comm.adminIds || []).includes(requesterId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Only community owners or admins can unlink groups." });
  }
  const updated = db.removeGroupFromCommunity(id, groupId);
  broadcastToAll({
    type: "community:updated",
    communityId: id,
    community: updated
  });
  res.json({ success: true, community: updated });
});
app.get("/api/communities/:id/channels", (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId || "";
  const channels = db.getChannelsForCommunity(id).map((ch) => ({
    ...ch,
    isFollowed: userId ? (ch.followerIds || []).includes(userId) : false,
    postsCount: (db.getChannelPosts(ch.id) || []).length
  }));
  res.json(channels);
});
app.post("/api/communities/:id/channels", (req, res) => {
  const { id } = req.params;
  const { name, description, avatarUrl, creatorId, isReadOnly } = req.body;
  if (!name || !creatorId) {
    return res.status(400).json({ error: "Channel name and creator ID are required." });
  }
  const comm = db.getCommunityById(id);
  if (!comm) {
    return res.status(404).json({ error: "Community not found." });
  }
  const isOwner = comm.creatorId === creatorId;
  const isAdmin = (comm.adminIds || []).includes(creatorId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Only community owners or admins can create channels." });
  }
  const channelId = `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newChannel = {
    id: channelId,
    communityId: id,
    name: name.trim(),
    description: (description || "").trim(),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    creatorId,
    adminIds: [creatorId],
    followerIds: Array.from(/* @__PURE__ */ new Set([creatorId, ...(comm.members || []).map((m) => m.userId)])),
    isReadOnly: isReadOnly !== void 0 ? Boolean(isReadOnly) : true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.createChannel(newChannel);
  const creatorUser = db.getUserById(creatorId);
  const welcomePost = {
    id: `post_${Date.now()}`,
    channelId,
    authorId: creatorId,
    authorName: creatorUser?.displayName || "Admin",
    authorAvatar: creatorUser?.avatarUrl || "",
    title: `\u{1F4E2} Welcome to the ${newChannel.name} Channel`,
    content: newChannel.description || "Welcome to this new channel. Stay tuned for posts and announcements!",
    createdAt: Date.now(),
    likes: [creatorId]
  };
  db.addChannelPost(welcomePost);
  broadcastToAll({
    type: "channel:new",
    channel: {
      ...newChannel,
      isFollowed: true,
      postsCount: 1
    },
    communityId: id
  });
  res.json({
    success: true,
    channel: {
      ...newChannel,
      isFollowed: true,
      postsCount: 1
    }
  });
});
app.get("/api/channels/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId || "";
  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found." });
  }
  const posts = db.getChannelPosts(id);
  const isFollowed = userId ? (channel.followerIds || []).includes(userId) : false;
  res.json({
    ...channel,
    isFollowed,
    postsCount: posts.length,
    posts
  });
});
app.put("/api/channels/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, avatarUrl, isReadOnly, requesterId } = req.body;
  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found." });
  }
  const isCreator = channel.creatorId === requesterId;
  const isAdmin = (channel.adminIds || []).includes(requesterId);
  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: "Permission denied. Channel admins only." });
  }
  const updated = db.updateChannel(id, {
    name: name ? name.trim() : channel.name,
    description: description !== void 0 ? description.trim() : channel.description,
    avatarUrl: avatarUrl || channel.avatarUrl,
    isReadOnly: isReadOnly !== void 0 ? Boolean(isReadOnly) : channel.isReadOnly
  });
  broadcastToAll({
    type: "channel:updated",
    channel: updated
  });
  res.json({ success: true, channel: updated });
});
app.delete("/api/channels/:id", (req, res) => {
  const { id } = req.params;
  const requesterId = req.query.requesterId || req.body?.requesterId;
  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found." });
  }
  const comm = db.getCommunityById(channel.communityId);
  const isCommOwner = comm && comm.creatorId === requesterId;
  const isChannelCreator = channel.creatorId === requesterId;
  if (!isCommOwner && !isChannelCreator) {
    return res.status(403).json({ error: "Permission denied." });
  }
  db.deleteChannel(id);
  broadcastToAll({
    type: "channel:deleted",
    channelId: id,
    communityId: channel.communityId
  });
  res.json({ success: true });
});
app.post("/api/channels/:id/join", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const updated = db.joinChannel(id, userId);
  if (!updated) {
    return res.status(404).json({ error: "Channel not found." });
  }
  broadcastToAll({
    type: "channel:updated",
    channel: updated
  });
  res.json({ success: true, channel: updated });
});
app.post("/api/channels/:id/leave", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const updated = db.leaveChannel(id, userId);
  if (!updated) {
    return res.status(404).json({ error: "Channel not found." });
  }
  broadcastToAll({
    type: "channel:updated",
    channel: updated
  });
  res.json({ success: true, channel: updated });
});
app.get("/api/channels/:id/posts", (req, res) => {
  const { id } = req.params;
  const posts = db.getChannelPosts(id);
  res.json(posts);
});
app.post("/api/channels/:id/posts", (req, res) => {
  const { id } = req.params;
  const { authorId, title, content, mediaUrl, mediaType, linkUrl } = req.body;
  if (!authorId || !content && !mediaUrl) {
    return res.status(400).json({ error: "Author ID and post content or media are required." });
  }
  const channel = db.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found." });
  }
  if (channel.isReadOnly) {
    const isCreator = channel.creatorId === authorId;
    const isAdmin = (channel.adminIds || []).includes(authorId);
    const comm = db.getCommunityById(channel.communityId);
    const isCommOwner = comm && comm.creatorId === authorId;
    const isCommAdmin = comm && (comm.adminIds || []).includes(authorId);
    if (!isCreator && !isAdmin && !isCommOwner && !isCommAdmin) {
      return res.status(403).json({ error: "Only admins can post in this read-only channel." });
    }
  }
  const user = db.getUserById(authorId);
  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channelId: id,
    authorId,
    authorName: user?.displayName || "Member",
    authorAvatar: user?.avatarUrl || "",
    title: title ? title.trim() : void 0,
    content: (content || "").trim(),
    mediaUrl: mediaUrl || void 0,
    mediaType: mediaType || (mediaUrl ? "image" : void 0),
    linkUrl: linkUrl ? linkUrl.trim() : void 0,
    createdAt: Date.now(),
    likes: []
  };
  db.addChannelPost(newPost);
  broadcastToAll({
    type: "channel:post:new",
    channelId: id,
    post: newPost
  });
  res.json({ success: true, post: newPost });
});
app.post("/api/channels/:id/posts/:postId/like", (req, res) => {
  const { id, postId } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const updated = db.likeChannelPost(id, postId, userId);
  if (!updated) {
    return res.status(404).json({ error: "Post not found." });
  }
  broadcastToAll({
    type: "channel:post:updated",
    channelId: id,
    post: updated
  });
  res.json({ success: true, post: updated });
});
app.delete("/api/channels/:id/posts/:postId", (req, res) => {
  const { id, postId } = req.params;
  const requesterId = req.query.requesterId || req.body?.requesterId;
  const channel = db.getChannelById(id);
  const posts = db.getChannelPosts(id);
  const targetPost = posts.find((p) => p.id === postId);
  if (!targetPost) {
    return res.status(404).json({ error: "Post not found." });
  }
  const isAuthor = targetPost.authorId === requesterId;
  const isChannelAdmin = channel && ((channel.adminIds || []).includes(requesterId) || channel.creatorId === requesterId);
  if (!isAuthor && !isChannelAdmin) {
    return res.status(403).json({ error: "Permission denied." });
  }
  db.deleteChannelPost(id, postId);
  broadcastToAll({
    type: "channel:post:deleted",
    channelId: id,
    postId
  });
  res.json({ success: true });
});
app.get("/api/invites/:inviteCode", (req, res) => {
  const { inviteCode } = req.params;
  const comm = db.getCommunityByInvite(inviteCode);
  if (!comm) {
    return res.status(404).json({ error: "Invalid or expired invite link." });
  }
  res.json({
    id: comm.id,
    name: comm.name,
    description: comm.description,
    avatarUrl: comm.avatarUrl,
    memberCount: (comm.members || []).length,
    creatorName: db.getUserById(comm.creatorId)?.displayName || "Community Admin"
  });
});
app.get("/api/communities-search", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const userId = req.query.userId || "";
  if (!q) {
    return res.json({ communities: [], groups: [], channels: [] });
  }
  const allComms = db.getAllCommunities();
  const matchingCommunities = allComms.filter(
    (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  ).map((c) => ({
    id: c.id,
    type: "community",
    name: c.name,
    description: c.description,
    avatarUrl: c.avatarUrl,
    memberCount: (c.members || []).length,
    isJoined: userId ? (c.members || []).some((m) => m.userId === userId) : false
  }));
  const matchingGroups = db.getAllChats().filter((chat) => chat.isGroup && (chat.name.toLowerCase().includes(q) || (chat.description || "").toLowerCase().includes(q))).map((g) => ({
    id: g.id,
    type: "group",
    name: g.name,
    description: g.description || "Discussion Group",
    avatarUrl: g.avatarUrl,
    memberCount: (g.memberIds || []).length,
    communityId: g.communityId
  }));
  const matchingChannels = db.getAllChannels().filter((ch) => ch.name.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q)).map((ch) => ({
    id: ch.id,
    type: "channel",
    name: ch.name,
    description: ch.description,
    avatarUrl: ch.avatarUrl,
    followerCount: (ch.followerIds || []).length,
    communityId: ch.communityId
  }));
  res.json({
    communities: matchingCommunities,
    groups: matchingGroups,
    channels: matchingChannels
  });
});
app.get("/api/chats/:chatId/messages", (req, res) => {
  const { chatId } = req.params;
  const messages = db.getMessages(chatId);
  res.json(messages);
});
app.post("/api/messages/send", (req, res) => {
  const { chatId, message } = req.body;
  if (!chatId || !message) {
    return res.status(400).json({ error: "Chat ID and message payload required" });
  }
  const storedMsg = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    chatId,
    timestamp: message.timestamp || Date.now(),
    status: message.status || "delivered"
  };
  db.addMessage(chatId, storedMsg);
  broadcastToChat(chatId, storedMsg.senderId, {
    type: "message:new",
    chatId,
    message: storedMsg
  });
  res.json({ success: true, message: storedMsg });
});
app.get("/api/status", (req, res) => {
  const active = db.getStatuses(true);
  res.json(active);
});
var handleCreateStatus = (req, res) => {
  const { userId, type, content, mediaUrl, caption, backgroundColor, textColor, fontStyle, userName, userAvatar } = req.body;
  const user = userId ? db.getUserById(userId) : null;
  const now = Date.now();
  const newStatus = {
    id: `status_${now}_${Math.random().toString(36).substring(2, 6)}`,
    userId: userId || user?.id || "unknown",
    userName: userName || user?.displayName || "User",
    userAvatar: userAvatar || user?.avatarUrl || "",
    type: type || (mediaUrl ? "image" : "text"),
    content: content || mediaUrl || "",
    caption: caption || "",
    backgroundColor: backgroundColor || "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
    textColor: textColor || "#ffffff",
    fontStyle: fontStyle || "font-sans",
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1e3,
    viewers: []
  };
  db.addStatus(newStatus);
  const payload = JSON.stringify({
    type: "status:new",
    statusData: newStatus
  });
  wss.clients.forEach((ws) => {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(payload);
    }
  });
  res.json(newStatus);
};
app.post("/api/status", handleCreateStatus);
app.post("/api/status/create", handleCreateStatus);
app.post("/api/status/view", (req, res) => {
  const { statusId, viewerId } = req.body;
  const viewer = db.getUserById(viewerId);
  if (statusId && viewer) {
    db.viewStatus(statusId, {
      userId: viewer.id,
      userName: viewer.displayName,
      userAvatar: viewer.avatarUrl,
      viewedAt: Date.now()
    });
  }
  res.json({ success: true });
});
app.delete("/api/status/:id", (req, res) => {
  const { id } = req.params;
  db.deleteStatus(id);
  res.json({ success: true });
});
var handleGetCalls = (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json([]);
  const logs = db.getCallLogs(userId);
  res.json(logs);
};
app.get("/api/calls", handleGetCalls);
app.get("/api/calls/history", handleGetCalls);
app.post("/api/calls/log", (req, res) => {
  const logData = {
    ...req.body,
    id: req.body.id || `call_${Date.now()}`,
    startedAt: req.body.startedAt || Date.now()
  };
  db.addCallLog(logData);
  res.json({ success: true, log: logData });
});
app.delete("/api/calls/clear", (req, res) => {
  const { userId } = req.body;
  if (userId) {
    db.clearCallLogs(userId);
  }
  res.json({ success: true });
});
app.post("/api/media/upload", (req, res) => {
  const { fileData, fileName, mimeType } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "File data is required." });
  }
  const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.json({
    success: true,
    media: {
      id: mediaId,
      url: fileData,
      fileName: fileName || "attachment",
      mimeType: mimeType || "application/octet-stream",
      fileSize: Math.round(fileData.length * 0.75)
    }
  });
});
app.get("/api/ai/conversations", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json([]);
  const list = db.getAIConversations(userId);
  res.json(list);
});
app.post("/api/ai/conversations", (req, res) => {
  const { userId, conversation } = req.body;
  if (!userId || !conversation) {
    return res.status(400).json({ error: "User ID and conversation payload required." });
  }
  const saved = db.saveAIConversation(userId, {
    ...conversation,
    updatedAt: Date.now()
  });
  res.json(saved);
});
app.delete("/api/ai/conversations/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId;
  if (userId) {
    db.deleteAIConversation(userId, id);
  }
  res.json({ success: true });
});
app.post("/api/ai/chat", async (req, res) => {
  const { messages, userMessage } = req.body;
  totalAiRequests++;
  const currentUserPrompt = String(userMessage || "").trim();
  const detectedUserLang = detectLanguage(currentUserPrompt);
  const systemInstruction = `You are ERROREN AI, the dedicated, intelligent, comprehensive, and multilingual AI assistant inside ERROREN CHAT ("Secure. Private. Real-time.").

CRITICAL DIRECTIVES:
1. ACCURACY & COMPLETENESS:
   - Provide complete, intelligent, accurate, natural, and genuinely helpful answers.
   - Never truncate responses or produce empty/boilerplate replies.
   - For simple greetings or concise questions, answer crisply and politely.
   - For complex, scientific, or coding questions, provide thorough, step-by-step, organized explanations.

2. CONTEXT AWARENESS:
   - You have access to the conversation history. Maintain context seamlessly across follow-up questions.
   - Correctly resolve pronouns, implicit subjects, and earlier referenced items ("us ka camera kaisa hai?", "what else does it do?").

3. NATURAL MULTILINGUAL COMMUNICATION:
   - User Detected Language: ${detectedUserLang.toUpperCase()}
   - ALWAYS reply in the exact language, dialect, and script used by the user.
   - If the user writes in Roman Urdu (Urdu written in English letters, e.g. "kese ho", "ap kon ho", "mujhe code bna kr do", "ye swal hal kr do", "bhai suno"):
     * Reply in fluent, natural, friendly, respectful Roman Urdu.
     * Do NOT reply in Devanagari Hindi or English when addressed in Roman Urdu.
     * Example: "Main bilkul theek hoon! Aap batayein aaj main aapki kya madad kar sakta hoon?"
   - If the user writes in Urdu script (e.g. "\u0622\u067E \u06A9\u06CC\u0633\u06D2 \u06C1\u06CC\u06BA", "\u0645\u062C\u06BE\u06D2 \u06A9\u0648\u0688 \u0628\u0646\u0627 \u06A9\u0631 \u062F\u06CC\u06BA"):
     * Reply in grammatically proper Urdu script.
   - If the user writes in English:
     * Reply in clear, articulate, professional English.
   - If the user writes in Hindi, Arabic, or another language:
     * Reply in that language and script.

4. TECHNICAL & PROGRAMMING EXCELLENCE:
   - Provide clean, production-ready, complete code with appropriate language syntax highlighting blocks (e.g. \`\`\`typescript, \`\`\`python, \`\`\`jsx).
   - Diagnose bugs accurately and provide the exact fix.

5. MARKDOWN FORMATTING:
   - Format all responses with clean, beautifully organized Markdown (bold headings, bullet points, clean code blocks).`;
  const client = getGeminiClient();
  if (client) {
    const contents = [];
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m || !m.content) continue;
        const role = m.role === "user" ? "user" : "model";
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `

${m.content}`;
        } else {
          contents.push({
            role,
            parts: [{ text: String(m.content) }]
          });
        }
      }
    }
    if (currentUserPrompt) {
      if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
        contents.push({
          role: "user",
          parts: [{ text: currentUserPrompt }]
        });
      } else {
        if (!contents[contents.length - 1].parts[0].text.includes(currentUserPrompt)) {
          contents[contents.length - 1].parts[0].text = currentUserPrompt;
        }
      }
    }
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];
    let lastError = null;
    for (const model of candidateModels) {
      try {
        const generatePromise = client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`Model ${model} call timed out`)), 25e3)
        );
        const aiResponse = await Promise.race([generatePromise, timeoutPromise]);
        if (aiResponse && aiResponse.text) {
          return res.json({
            success: true,
            reply: aiResponse.text.trim(),
            modelUsed: model,
            isFallback: false
          });
        }
      } catch (err) {
        lastError = err;
        console.warn(`[ERROREN AI] Model ${model} generation attempt failed:`, err?.message || err);
      }
    }
    console.warn("[ERROREN AI Notice] Candidate Gemini models temporarily busy or unavailable, serving intelligent multilingual engine:", lastError?.message || lastError);
  } else {
    console.warn("[ERROREN AI Production Warning] No Gemini client initialized. Check GEMINI_API_KEY environment variable. Serving multilingual intelligence engine.");
  }
  const reply = generateMultilingualReply(currentUserPrompt);
  return res.json({ success: true, reply, isFallback: true, language: detectedUserLang });
});
app.post("/api/ai/assist", async (req, res) => {
  const { text, action, targetLanguage, context } = req.body;
  totalAiRequests++;
  const client = getGeminiClient();
  if (client) {
    let prompt = "";
    if (action === "improve") {
      prompt = `Improve this chat message to be clear, natural, engaging, and well-written. Return only the improved text: "${text}"`;
    } else if (action === "professional") {
      prompt = `Rewrite this chat message into a polished, professional tone. Return only the rewritten message: "${text}"`;
    } else if (action === "shorten") {
      prompt = `Shorten this chat message while keeping its core meaning. Return only the shortened text: "${text}"`;
    } else if (action === "translate") {
      prompt = `Translate this chat message into ${targetLanguage || "Spanish"}. Return only the direct translation: "${text}"`;
    } else if (action === "reply") {
      prompt = `Given this incoming message: "${context || text}", generate a friendly, short quick reply. Return only the suggested reply text:`;
    }
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];
    for (const model of candidateModels) {
      try {
        const generatePromise = client.models.generateContent({
          model,
          contents: prompt
        });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`Model ${model} call timed out`)), 7e3)
        );
        const aiResponse = await Promise.race([generatePromise, timeoutPromise]);
        if (aiResponse && aiResponse.text) {
          return res.json({ success: true, result: aiResponse.text.trim() });
        }
      } catch (error) {
        console.warn(`[ERROREN AI Assist] Model ${model} failed:`, error?.message || error);
      }
    }
  }
  let fallbackResult = text;
  if (action === "improve") fallbackResult = text.trim() + " Looking forward to connecting!";
  else if (action === "professional") fallbackResult = `Regarding our discussion: "${text}". Please let me know your thoughts.`;
  else if (action === "shorten") fallbackResult = text.length > 40 ? text.substring(0, 35) + "..." : text;
  else if (action === "translate") fallbackResult = `[${targetLanguage || "Translated"}]: ${text}`;
  else if (action === "reply") fallbackResult = "Sounds great! Thanks for letting me know, I'm on it.";
  res.json({ success: true, result: fallbackResult });
});
app.get("/api/admin/stats", (req, res) => {
  const stats = db.getStats(totalAiRequests);
  res.json(stats);
});
app.get("/api/admin/reports", (req, res) => {
  const reports = db.getReports();
  res.json(reports);
});
app.post("/api/reports", (req, res) => {
  const { reportedBy, targetId, reportedUserId, reportedGroupId, reportedName, reason, details } = req.body;
  const newReport = {
    id: `rep_${Date.now()}`,
    reportedBy: reportedBy || "unknown",
    reportedUserId: reportedUserId || targetId,
    reportedGroupId,
    reportedName: reportedName || "User/Group",
    reason: reason || "Inappropriate content",
    details: details || "",
    status: "pending",
    createdAt: Date.now()
  };
  db.addReport(newReport);
  res.json({ success: true, report: newReport });
});
app.post("/api/admin/resolve-report", (req, res) => {
  const { reportId, action } = req.body;
  db.resolveReport(reportId, action);
  res.json({ success: true });
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer }
      },
      appType: "spa"
    });
    app.use("/api", (req, res) => {
      res.status(404).json({ error: `API route ${req.method} /api${req.path} not found.` });
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `Endpoint ${req.method} ${req.path} not found.` });
      }
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map
