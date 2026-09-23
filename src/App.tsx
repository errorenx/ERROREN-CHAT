import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { GoogleLoginScreen } from './components/auth/GoogleLoginScreen';
import { ProfileSetupScreen } from './components/auth/ProfileSetupScreen';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { BottomNav, MainTab } from './components/common/BottomNav';
import { ChatList } from './components/chats/ChatList';
import { ChatConversation } from './components/chats/ChatConversation';
import { StatusList } from './components/status/StatusList';
import { CreateStatusModal } from './components/status/CreateStatusModal';
import { StatusViewerModal } from './components/status/StatusViewerModal';
import { CallsView } from './components/calls/CallsView';
import { ActiveCallModal, IncomingCallNotification } from './components/calls/ActiveCallModal';
import { ErrorenAiView } from './components/ai/ErrorenAiView';
import { CommunitiesView } from './components/communities/CommunitiesView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { NewGroupModal } from './components/groups/NewGroupModal';
import { GroupInfoDrawer } from './components/groups/GroupInfoDrawer';
import { NewChatModal } from './components/contacts/NewChatModal';
import { EditProfileModal } from './components/settings/EditProfileModal';
import { ShareModal } from './components/common/ShareModal';
import { Chat, Message, MessageType, ReplyToMessage, StatusStory, CallLog, User } from './types';
import { ToastContainer } from './components/common/Toast';
import { MessageSquare, Plus } from 'lucide-react';
import { isTestChat, isTestUser } from './utils/testFilter';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchUserChatsFromSupabase,
  fetchChatMessagesFromSupabase,
  sendMessageToSupabase,
  getOrCreateDirectChatInSupabase,
  createGroupInSupabase,
  subscribeToChatMessages,
  subscribeToPresence,
  saveStatusToSupabase,
  fetchActiveStatusesFromSupabase,
  fetchCallLogsFromSupabase,
  subscribeToCallLogs,
  updateMessageInSupabase,
  deleteMessageInSupabase,
  deleteStatusFromSupabase,
  submitReportToSupabase,
} from './services/supabaseChat';

const MainAppContent: React.FC = () => {
  const { currentUser, authStep, allUsers, refreshUsers, isProfileModalOpen, closeProfileModal } = useAuth();
  const { 
    sendMessage, 
    sendReaction, 
    sendEdit, 
    sendDelete, 
    setOnMessageReceived, 
    setOnStatusReceived,
    startCall
  } = useSocket();
  const { isDark } = useTheme();

  // Navigation state
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Application Data States
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMessages, setChatMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [statuses, setStatuses] = useState<StatusStory[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Modals & Drawers
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [activeViewingStory, setActiveViewingStory] = useState<StatusStory | null>(null);
  const [showGroupInfoDrawer, setShowGroupInfoDrawer] = useState(false);

  // Helper to filter test chats and ensure user self chat & ERROREN AI chat exist by default
  const sanitizeChatsList = (rawChats: Chat[], user: User): Chat[] => {
    const selfChatId = `chat_self_${user.id}`;
    const aiChatId = 'chat_erroren_ai';
    const userHandle = user.username ? `@${user.username}` : (user.displayName || 'user');

    // Remove any test chats or mock artifacts using strict filter and membership validation
    const filtered = (rawChats || []).filter((c) => {
      if (isTestChat(c, user.id)) return false;
      const members = c.memberIds || c.participantIds || [];
      // Chat must include the current user to prevent cross-account chat leaks
      if (members.length > 0 && !members.includes(user.id) && c.id !== aiChatId) return false;
      return true;
    });

    // 1. Ensure ERROREN AI official chat is present and pinned
    const hasAiChat = filtered.some((c) => c.id === aiChatId);
    if (!hasAiChat) {
      const aiChat: Chat = {
        id: aiChatId,
        name: 'ERROREN AI',
        title: 'ERROREN AI',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=erroren_ai_chat',
        memberIds: [user.id, 'user_ai_assistant'],
        participantIds: [user.id, 'user_ai_assistant'],
        isGroup: false,
        isPinned: true,
        unreadCount: 0,
        createdAt: 1700000000000,
        updatedAt: Date.now(),
        lastMessage: {
          id: 'msg_ai_welcome_initial',
          chatId: aiChatId,
          senderId: 'user_ai_assistant',
          senderName: 'ERROREN AI',
          content: 'Assalam-o-Alaikum! How can I help you today? Ask me anything in any language.',
          type: 'text',
          timestamp: Date.now(),
          status: 'read',
        },
      };
      filtered.unshift(aiChat);
    } else {
      filtered.forEach((c) => {
        if (c.id === aiChatId) {
          c.name = 'ERROREN AI';
          c.title = 'ERROREN AI';
          c.isPinned = true;
          c.avatarUrl = 'https://api.dicebear.com/7.x/bottts/svg?seed=erroren_ai_chat';
        }
      });
    }

    // 2. Check if user's own username chat exists
    const hasSelfChat = filtered.some((c) => c.id === selfChatId || (!c.isGroup && c.memberIds?.length === 1 && c.memberIds[0] === user.id));
    if (!hasSelfChat) {
      const selfChat: Chat = {
        id: selfChatId,
        name: `${userHandle} (You)`,
        title: `${userHandle} (You)`,
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
        memberIds: [user.id],
        participantIds: [user.id],
        isGroup: false,
        isPinned: true,
        unreadCount: 0,
        createdAt: user.createdAt || Date.now(),
        updatedAt: Date.now(),
        lastMessage: {
          id: `msg_self_${user.id}`,
          chatId: selfChatId,
          senderId: user.id,
          senderName: user.displayName || 'You',
          content: 'Your personal space for notes, saved links, and thoughts.',
          type: 'text',
          timestamp: Date.now(),
          status: 'read',
        },
      };
      filtered.unshift(selfChat);
    } else {
      filtered.forEach((c) => {
        if (c.id === selfChatId || (!c.isGroup && c.memberIds?.length === 1 && c.memberIds[0] === user.id)) {
          c.name = `${userHandle} (You)`;
          c.title = `${userHandle} (You)`;
          c.isPinned = true;
        }
      });
    }

    return filtered;
  };

  // Fetch initial chats, statuses, and calls from Supabase
  const loadInitialData = async () => {
    if (!currentUser) return;

    try {
      // 1. Supabase Chats
      if (isSupabaseConfigured()) {
        const sbChats = await fetchUserChatsFromSupabase(currentUser.id);
        if (sbChats && sbChats.length > 0) {
          const sanitized = sanitizeChatsList(sbChats, currentUser);
          setChats(sanitized);
          if (!selectedChatId && sanitized.length > 0) {
            setSelectedChatId(sanitized[0].id);
          }
        } else {
          setChats((prev) => sanitizeChatsList(prev, currentUser));
        }
      } else {
        setChats((prev) => sanitizeChatsList(prev, currentUser));
      }

      // 2. Fetch Status Stories from Supabase
      if (isSupabaseConfigured()) {
        const sbStatuses = await fetchActiveStatusesFromSupabase();
        if (sbStatuses && sbStatuses.length > 0) {
          setStatuses(sbStatuses.filter((s) => s.expiresAt > Date.now()));
        }
      }

      // 3. Fetch Call Logs from Supabase
      if (isSupabaseConfigured()) {
        const logs = await fetchCallLogsFromSupabase(currentUser.id);
        if (Array.isArray(logs)) {
          setCallLogs(logs);
        }
      }
    } catch (err) {
      console.error('Failed to load initial Supabase state:', err);
      setChats((prev) => sanitizeChatsList(prev, currentUser));
    }
  };

  useEffect(() => {
    // When account changes or a new profile is created, reset all memory caches so no old chats/files bleed over
    setSelectedChatId(null);
    setChats([]);
    setChatMessages({});
    setStatuses([]);
    setCallLogs([]);
    if (currentUser?.id) {
      loadInitialData();

      // Subscribe to real-time call log updates
      const unsubCalls = subscribeToCallLogs(currentUser.id, async () => {
        const logs = await fetchCallLogsFromSupabase(currentUser.id);
        if (Array.isArray(logs)) {
          setCallLogs(logs);
        }
      });

      return () => {
        unsubCalls();
      };
    }
  }, [currentUser?.id]);

  // Load messages for active chat + Realtime message subscription
  useEffect(() => {
    if (!selectedChatId) return;

    // 1. Load messages from Supabase
    if (isSupabaseConfigured()) {
      fetchChatMessagesFromSupabase(selectedChatId)
        .then((msgs) => {
          if (Array.isArray(msgs)) {
            setChatMessages((prev) => ({
              ...prev,
              [selectedChatId]: msgs,
            }));
          }
        })
        .catch(console.error);
    }

    // 2. Subscribe to Supabase Realtime for this active chat
    if (isSupabaseConfigured()) {
      const unsub = subscribeToChatMessages(
        selectedChatId,
        (incomingMsg) => {
          setChatMessages((prev) => {
            const currentList = prev[incomingMsg.chatId] || [];
            if (currentList.some((m) => m.id === incomingMsg.id)) return prev;
            return {
              ...prev,
              [incomingMsg.chatId]: [...currentList, incomingMsg],
            };
          });

          setChats((prev) =>
            prev.map((c) => {
              if (c.id === incomingMsg.chatId) {
                return {
                  ...c,
                  lastMessage: incomingMsg,
                  updatedAt: incomingMsg.timestamp,
                };
              }
              return c;
            })
          );
        },
        (updatedMsg) => {
          setChatMessages((prev) => {
            const currentList = prev[updatedMsg.chatId] || [];
            return {
              ...prev,
              [updatedMsg.chatId]: currentList.map((m) =>
                m.id === updatedMsg.id ? updatedMsg : m
              ),
            };
          });
        }
      );

      return () => {
        unsub();
      };
    }
  }, [selectedChatId]);

  // Subscribe to presence updates from Supabase Realtime
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubPresence = subscribeToPresence((userId, isOnline, lastSeen) => {
      setChats((prev) =>
        prev.map((c) => {
          if (!c.isGroup && (c.participantIds || []).includes(userId)) {
            return {
              ...c,
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );
    });
    return () => {
      unsubPresence();
    };
  }, []);

  // Register live incoming message listener
  useEffect(() => {
    setOnMessageReceived((newMsg: Message) => {
      setChatMessages((prev) => {
        const currentList = prev[newMsg.chatId] || [];
        if (currentList.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          [newMsg.chatId]: [...currentList, newMsg],
        };
      });

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === newMsg.chatId) {
            return {
              ...c,
              lastMessage: newMsg,
              updatedAt: newMsg.timestamp,
              unreadCount: selectedChatId === c.id ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    });

    setOnStatusReceived((newStatus: StatusStory) => {
      setStatuses((prev) => [newStatus, ...prev.filter((s) => s.id !== newStatus.id)]);
    });
  }, [selectedChatId, setOnMessageReceived, setOnStatusReceived]);

  // Authentication Flow Router
  if (!currentUser || authStep !== 'authenticated') {
    if (authStep === 'google_login') return <GoogleLoginScreen />;
    if (authStep === 'profile') return <ProfileSetupScreen />;
    return <WelcomeScreen />;
  }

  // Active chat object
  const activeChat = chats.find((c) => c.id === selectedChatId);
  const activeMessages = selectedChatId ? chatMessages[selectedChatId] || [] : [];
  const totalUnreadCount = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Send Message Handler
  const handleSendMessage = (
    content: string,
    type: MessageType = 'text',
    mediaUrl?: string,
    replyTo?: any,
    fileName?: string,
    fileSize?: string,
    duration?: number
  ) => {
    if (!selectedChatId || !currentUser) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId: selectedChatId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      content,
      type,
      mediaUrl,
      fileName,
      fileSize,
      duration,
      replyTo,
      timestamp: Date.now(),
      status: 'sent',
      reactions: [],
    };

    setChatMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            lastMessage: newMsg,
            updatedAt: newMsg.timestamp,
          };
        }
        return c;
      })
    );

    // Save to Supabase
    if (isSupabaseConfigured()) {
      sendMessageToSupabase(newMsg)
        .then((persistedMsg) => {
          if (persistedMsg) {
            setChatMessages((prev) => {
              const current = prev[selectedChatId] || [];
              return {
                ...prev,
                [selectedChatId]: current.map((m) => (m.id === newMsg.id ? persistedMsg : m)),
              };
            });
          }
        })
        .catch((err) => {
          console.warn('[App] Supabase sendMessage error:', err);
        });
    }

    sendMessage(selectedChatId, newMsg);
  };

  // Reactions Handler
  const handleReactMessage = (messageId: string, emoji: string) => {
    if (!selectedChatId || !currentUser) return;

    setChatMessages((prev) => {
      const current = prev[selectedChatId] || [];
      const updated = current.map((m) => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          const existingIdx = reactions.findIndex((r) => r.userId === currentUser.id);
          let newReactions = [...reactions];
          if (existingIdx > -1) {
            newReactions[existingIdx] = { emoji, userId: currentUser.id, userName: currentUser.displayName };
          } else {
            newReactions.push({ emoji, userId: currentUser.id, userName: currentUser.displayName });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      });
      return { ...prev, [selectedChatId]: updated };
    });

    sendReaction(selectedChatId, messageId, emoji);
  };

  // Edit Message Handler
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!selectedChatId) return;
    setChatMessages((prev) => {
      const current = prev[selectedChatId] || [];
      const updated = current.map((m) => {
        if (m.id === messageId) {
          return { ...m, content: newContent, isEdited: true };
        }
        return m;
      });
      return { ...prev, [selectedChatId]: updated };
    });

    if (isSupabaseConfigured()) {
      updateMessageInSupabase(messageId, { content: newContent, isEdited: true }).catch(console.error);
    }
    sendEdit(selectedChatId, messageId, newContent);
  };

  // Delete Message Handler
  const handleDeleteMessage = (messageId: string, forEveryone: boolean) => {
    if (!selectedChatId) return;
    setChatMessages((prev) => ({
      ...prev,
      [selectedChatId]: (prev[selectedChatId] || []).filter((m) => m.id !== messageId),
    }));

    if (isSupabaseConfigured()) {
      deleteMessageInSupabase(messageId, forEveryone).catch(console.error);
    }
    sendDelete(selectedChatId, messageId, forEveryone);
  };

  // Star Message
  const handleStarMessage = (messageId: string) => {
    if (!selectedChatId) return;
    setChatMessages((prev) => {
      const current = prev[selectedChatId] || [];
      return {
        ...prev,
        [selectedChatId]: current.map((m) => (m.id === messageId ? { ...m, isStarred: !m.isStarred } : m)),
      };
    });
  };

  // Chat Actions
  const handlePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleMuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const handleArchiveChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isArchived: true } : c))
    );
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }
  };

  const handleMarkUnread = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 1 } : c))
    );
  };

  const handleClearChat = (chatId: string) => {
    setChatMessages((prev) => ({ ...prev, [chatId]: [] }));
  };

  // Start New Chat with User
  const handleStartChatWithUser = async (partner: User) => {
    const existing = chats.find(
      (c) => !c.isGroup && (c.participantIds || c.memberIds || []).includes(partner.id)
    );

    if (existing) {
      setSelectedChatId(existing.id);
      setActiveTab('chats');
      return;
    }

    // 1. Check Supabase first
    if (isSupabaseConfigured()) {
      try {
        const res = await getOrCreateDirectChatInSupabase(currentUser, partner);
        if (res && res.chat) {
          setChats((prev) => [res.chat, ...prev.filter((c) => c.id !== res.chat.id)]);
          setSelectedChatId(res.chat.id);
          setActiveTab('chats');
          return;
        }
      } catch (err) {
        console.warn('[App] Supabase getOrCreateDirectChat error:', err);
      }
    }

    const fallbackChat: Chat = {
      id: `chat_${currentUser.id}_${partner.id}`,
      title: partner.displayName,
      name: partner.displayName,
      isGroup: false,
      participantIds: [currentUser.id, partner.id],
      memberIds: [currentUser.id, partner.id],
      adminIds: [currentUser.id],
      avatarUrl: partner.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${partner.id}`,
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setChats((prev) => [fallbackChat, ...prev.filter((c) => c.id !== fallbackChat.id)]);
    setSelectedChatId(fallbackChat.id);
    setActiveTab('chats');
  };

  // Create New Group
  const handleCreateGroup = async (title: string, description: string, memberIds: string[]) => {
    if (isSupabaseConfigured()) {
      try {
        const createdGroup = await createGroupInSupabase({
          name: title.trim(),
          description: description?.trim() || '',
          creatorId: currentUser.id,
          memberIds,
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`,
        });
        if (createdGroup) {
          setChats((prev) => [createdGroup, ...prev.filter(c => c.id !== createdGroup.id)]);
          setSelectedChatId(createdGroup.id);
          setActiveTab('chats');
          return;
        }
      } catch (err) {
        console.warn('Supabase createGroup error:', err);
      }
    }

    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newGroupObj: Chat = {
      id: groupId,
      title,
      name: title,
      description,
      isGroup: true,
      creatorId: currentUser.id,
      participantIds: [currentUser.id, ...memberIds],
      memberIds: [currentUser.id, ...memberIds],
      adminIds: [currentUser.id],
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`,
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setChats((prev) => [newGroupObj, ...prev.filter(c => c.id !== newGroupObj.id)]);
    setSelectedChatId(newGroupObj.id);
    setActiveTab('chats');
  };

  // Post Status (supports 6, 12, 24 hours timer and Supabase persistence)
  const handlePostStatus = async (
    type: 'text' | 'image',
    content?: string,
    mediaUrl?: string,
    backgroundColor?: string,
    caption?: string,
    durationHours: number = 24
  ) => {
    const expiresAt = Date.now() + durationHours * 3600 * 1000;
    const newStory: StatusStory = {
      id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      type,
      content,
      mediaUrl,
      backgroundColor,
      caption,
      durationHours,
      expiresAt,
      createdAt: Date.now(),
      views: [],
    };

    // 1. Supabase first
    if (isSupabaseConfigured()) {
      try {
        await saveStatusToSupabase(newStory);
      } catch (err) {
        console.warn('[App] Supabase saveStatus error:', err);
      }
    }

    // 2. Local state
    setStatuses((prev) => [newStory, ...prev.filter((s) => s.id !== newStory.id)]);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden antialiased font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#070A0F] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chats') setShowGroupInfoDrawer(false);
        }}
        onOpenShare={() => setShowShareModal(true)}
        unreadCount={totalUnreadCount}
        hasUnseenStatus={statuses.length > 0}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Header Bar (hidden when ERROREN AI has full-screen view) */}
        {activeTab !== 'ai' && (
          <TopBar
            onOpenNewChat={() => setShowNewChatModal(true)}
            onOpenNewGroup={() => setShowNewGroupModal(true)}
            onOpenShare={() => setShowShareModal(true)}
            onOpenAdmin={() => setActiveTab('admin')}
            onOpenSettings={() => setActiveTab('settings')}
            activeTab={activeTab}
            isHiddenOnMobile={!!selectedChatId && activeTab === 'chats'}
          />
        )}

        {/* Dynamic View Body */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Tab: Chats */}
          {activeTab === 'chats' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
              {/* Left Column: Chat List */}
              <div className={`w-full md:w-auto ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                <ChatList
                  chats={chats}
                  selectedChatId={selectedChatId}
                  onSelectChat={(id) => {
                    setSelectedChatId(id);
                    setChats((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
                    );
                  }}
                  currentUserId={currentUser.id}
                  onPinChat={handlePinChat}
                  onMuteChat={handleMuteChat}
                  onArchiveChat={handleArchiveChat}
                  onDeleteChat={handleDeleteChat}
                  onMarkUnread={handleMarkUnread}
                />
              </div>

              {/* Right Column: Active Conversation or ERROREN AI */}
              <div className={`flex-1 flex ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                {selectedChatId === 'chat_erroren_ai' ? (
                  <ErrorenAiView currentUser={currentUser} onBack={() => setSelectedChatId(null)} />
                ) : activeChat ? (
                  <ChatConversation
                    chat={activeChat}
                    messages={activeMessages}
                    currentUserId={currentUser.id}
                    onBack={() => setSelectedChatId(null)}
                    onSendMessage={handleSendMessage}
                    onReactMessage={handleReactMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onStarMessage={handleStarMessage}
                    onClearChat={handleClearChat}
                    onOpenInfo={() => setShowGroupInfoDrawer(true)}
                    allUsers={allUsers}
                  />
                ) : (
                  <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-slate-950/40 text-center select-none">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
                      <MessageSquare className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">ERROREN CHAT</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                      Select a conversation or click <strong>Start New Conversation</strong> to message contacts, make encrypted calls, and collaborate in real-time.
                    </p>
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition hover:scale-105"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Start New Conversation</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Group / Contact Info Drawer */}
              {activeChat && showGroupInfoDrawer && (
                <GroupInfoDrawer
                  isOpen={showGroupInfoDrawer}
                  onClose={() => setShowGroupInfoDrawer(false)}
                  chat={activeChat}
                  allUsers={allUsers}
                  currentUserId={currentUser.id}
                  onLeaveGroup={(chatId) => {
                    handleDeleteChat(chatId);
                    setShowGroupInfoDrawer(false);
                  }}
                  onReport={(targetId, reason) => {
                    submitReportToSupabase(currentUser.id, targetId, reason).catch(console.error);
                  }}
                />
              )}
            </div>
          )}

          {/* Tab: Status Stories / Updates */}
          {activeTab === 'status' && (
            <StatusList
              statuses={statuses}
              currentUserId={currentUser.id}
              currentUser={currentUser}
              onOpenCreateStatus={() => setShowCreateStatusModal(true)}
              onViewStatus={(story) => setActiveViewingStory(story)}
            />
          )}

          {/* Tab: ERROREN AI Assistant */}
          {activeTab === 'ai' && (
            <ErrorenAiView currentUser={currentUser} onBack={() => setActiveTab('chats')} />
          )}

          {/* Tab: Communities */}
          {activeTab === 'communities' && (
            <CommunitiesView
              currentUser={currentUser}
              chats={chats}
              allUsers={allUsers}
              onSelectChat={(chatId) => {
                setSelectedChatId(chatId);
                setActiveTab('chats');
              }}
              onOpenNewGroup={() => setShowNewGroupModal(true)}
            />
          )}

          {/* Tab: Calls */}
          {activeTab === 'calls' && (
            <CallsView
              callLogs={callLogs}
              allUsers={allUsers}
              currentUserId={currentUser.id}
            />
          )}

          {/* Tab: Settings */}
          {activeTab === 'settings' && <SettingsView />}

          {/* Tab: Admin Dashboard */}
          {activeTab === 'admin' && (
            <AdminDashboard allUsers={allUsers} onRefreshUsers={refreshUsers} />
          )}
        </main>

        {/* Mobile Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'chats') setShowGroupInfoDrawer(false);
          }}
          unreadCount={totalUnreadCount}
          hasUnseenStatus={statuses.length > 0}
          isHidden={(!!selectedChatId && activeTab === 'chats') || activeTab === 'ai'}
        />
      </div>

      {/* Global Modals */}
      <IncomingCallNotification />
      <ActiveCallModal />

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleStartChatWithUser}
        onCreateGroup={() => setShowNewGroupModal(true)}
        onStartCall={(user, type) => startCall(user.id, user.displayName, user.avatarUrl, type)}
      />

      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        users={allUsers}
        currentUserId={currentUser.id}
        onCreateGroup={handleCreateGroup}
      />

      <CreateStatusModal
        isOpen={showCreateStatusModal}
        onClose={() => setShowCreateStatusModal(false)}
        onPostStatus={handlePostStatus}
      />

      <StatusViewerModal
        story={activeViewingStory}
        onClose={() => setActiveViewingStory(null)}
        currentUserId={currentUser.id}
        onReplyToStory={(storyUserId, text) => {
          const partner = allUsers.find((u) => u.id === storyUserId);
          if (partner) {
            handleStartChatWithUser(partner);
            setTimeout(() => {
              handleSendMessage(text);
            }, 300);
          }
        }}
      />

      {/* Global Mandatory Profile Completion & Edit Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />

      {/* Website Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastContainer />
          <MainAppContent />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
