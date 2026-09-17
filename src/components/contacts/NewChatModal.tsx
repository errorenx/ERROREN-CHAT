import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { findUserByUsername } from '../../services/supabaseChat';
import { isTestUser } from '../../utils/testFilter';
import {
  X,
  Search,
  UserPlus,
  Users,
  MessageSquare,
  Check,
  CheckCircle2,
  Loader2,
  AlertCircle,
  AtSign,
  Phone,
  Video,
  Bookmark
} from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onCreateGroup?: () => void;
  onStartCall?: (user: User, type: 'voice' | 'video') => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onCreateGroup,
  onStartCall,
}) => {
  const { currentUser, allUsers, contacts, addContact, refreshUsers } = useAuth();

  // Active view tab: 'add_connect' | 'all_users'
  const [activeTab, setActiveTab] = useState<'add_connect' | 'all_users'>('add_connect');

  // Add Connect Form: strictly ONLY username and save
  const [usernameInput, setUsernameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Live username detection state
  const [userCheckStatus, setUserCheckStatus] = useState<{
    checking: boolean;
    registered?: boolean;
    message?: string;
    matchedUser?: User;
  }>({ checking: false });

  // Search query for All Users list
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh user list from server / DB on modal open
  useEffect(() => {
    if (isOpen) {
      refreshUsers();
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Real-time lookup as user types username in Add Connect
  useEffect(() => {
    const raw = usernameInput.trim().toLowerCase().replace(/^@/, '');
    if (raw.length < 3) {
      setUserCheckStatus({ checking: false });
      setStatusMessage(null);
      return;
    }

    let isCancelled = false;
    setUserCheckStatus({ checking: true });

    const timer = setTimeout(async () => {
      try {
        const res = await findUserByUsername(raw, currentUser?.id);
        if (isCancelled) return;

        if (res.registered && res.user && !isTestUser(res.user)) {
          setUserCheckStatus({
            checking: false,
            registered: true,
            message: res.isSelf
              ? 'This is your own username.'
              : `Account found: @${res.user.username || raw}`,
            matchedUser: res.user,
          });
        } else {
          setUserCheckStatus({
            checking: false,
            registered: false,
            message: 'Available nhi hy (Is username pr koi account nhi bna huwa).',
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setUserCheckStatus({
            checking: false,
            registered: false,
            message: 'Available nhi hy (No account found on this website).',
          });
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [usernameInput, currentUser?.id]);

  // Handle Save button in Add Connect (Only username and Save!)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanUsername = usernameInput.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a username with at least 3 characters.',
      });
      return;
    }

    if (userCheckStatus.checking) return;

    if (userCheckStatus.registered === false) {
      setStatusMessage({
        type: 'error',
        text: 'Available nhi hy (Is username pr koi account nhi bna huwa).',
      });
      return;
    }

    const matched = userCheckStatus.matchedUser;
    if (!matched) {
      setStatusMessage({
        type: 'error',
        text: 'Account not found with this username.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const res = await addContact(
        matched.displayName || cleanUsername,
        cleanUsername,
        matched.avatarUrl || undefined,
        matched.about || undefined
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Contact @${cleanUsername} saved successfully! Opening chat...`,
        });
        setTimeout(() => {
          setIsSaving(false);
          setUsernameInput('');
          onSelectUser(matched);
          onClose();
        }, 500);
      } else {
        setIsSaving(false);
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to save contact.',
        });
      }
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error saving contact.',
      });
    }
  };

  // Direct Chat with any user
  const handleOpenChatWithUser = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  // List of all registered users on this website (excluding current user and test users)
  const registeredUsers = useMemo(() => {
    return allUsers.filter((u) => u && u.id && u.id !== currentUser?.id && !isTestUser(u));
  }, [allUsers, currentUser?.id]);

  // Filtered list based on search bar
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return registeredUsers;
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
    return registeredUsers.filter((u) => {
      const uName = (u.username || '').toLowerCase();
      const dName = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return uName.includes(q) || dName.includes(q) || email.includes(q);
    });
  }, [registeredUsers, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E131F] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Add Connect</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {registeredUsers.length} Users
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Find by username or connect directly with registered members
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080B12] p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('add_connect')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'add_connect'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Connect (Search & Save)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_users')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'all_users'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Registered Users ({registeredUsers.length})</span>
          </button>
        </div>

        {/* ===================== TAB 1: ADD CONNECT ===================== */}
        {activeTab === 'add_connect' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* ONLY 2 OPTIONS: Username Input and Save Button */}
            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    User Name
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Search username on this website
                  </span>
                </div>

                {/* Option 1: Username Input */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter username (e.g. johndoe)"
                    value={usernameInput}
                    onChange={(e) =>
                      setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    className="w-full pl-9 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {userCheckStatus.checking && (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Option 2: Save Button */}
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !usernameInput.trim() ||
                    userCheckStatus.checking ||
                    userCheckStatus.registered === false
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Contact...</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* LIVE DETECTION: If account exists, show user card with CHAT button */}
            {usernameInput.trim().replace(/^@/, '').length >= 3 && !userCheckStatus.checking && (
              <div>
                {userCheckStatus.registered && userCheckStatus.matchedUser ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Account Found on Website!
                      </span>
                      {userCheckStatus.matchedUser.isOnline ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Registered</span>
                      )}
                    </div>

                    {/* Matched User Details */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="relative shrink-0">
                        <img
                          src={
                            userCheckStatus.matchedUser.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${userCheckStatus.matchedUser.id}`
                          }
                          alt={userCheckStatus.matchedUser.displayName}
                          className="w-12 h-12 rounded-full object-cover bg-slate-950 border border-slate-700"
                        />
                        {userCheckStatus.matchedUser.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {userCheckStatus.matchedUser.displayName}
                        </div>
                        <div className="text-xs font-mono text-emerald-400 font-semibold truncate">
                          @{userCheckStatus.matchedUser.username || usernameInput}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {userCheckStatus.matchedUser.about || 'Using ERROREN CHAT ⚡'}
                        </div>
                      </div>

                      {/* THE REQUESTED "CHAT" BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleOpenChatWithUser(userCheckStatus.matchedUser!)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-95 cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>CHAT</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* User Not Found Warning */
                  <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Available nhi hy</span>
                    </div>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed pl-6">
                      Is username (<span className="font-mono font-bold text-rose-200">@{usernameInput.replace(/^@/, '')}</span>) pr koi account nhi bna huwa ERROREN CHAT website pr.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Registered Users Preview directly on Add Connect view */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Website Users ({registeredUsers.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Click CHAT to start conversation
                </span>
              </div>

              {registeredUsers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                  No other users registered yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {registeredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full object-cover bg-slate-950 border border-slate-700"
                          />
                          {user.isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {user.displayName}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400 font-semibold truncate">
                            @{user.username || user.email?.split('@')[0] || 'user'}
                          </div>
                        </div>
                      </div>

                      {/* Prominent CHAT Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenChatWithUser(user)}
                        className="ml-2 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>CHAT</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 2: ALL USERS LIST ===================== */}
        {activeTab === 'all_users' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Real-time search filter */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-[#080B12]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* List of registered users */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery ? `No user found matching "${searchQuery}".` : 'No users registered yet.'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition group"
                  >
                    <div
                      onClick={() => handleOpenChatWithUser(user)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                          alt={user.displayName}
                          className="w-11 h-11 rounded-full object-cover bg-slate-950 border border-slate-700"
                        />
                        {user.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition truncate">
                            {user.displayName}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-emerald-400 font-semibold truncate mt-0.5">
                          @{user.username || user.email?.split('@')[0] || 'user'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {user.about || 'Registered Member on ERROREN CHAT'}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pl-2 shrink-0">
                      {onStartCall && (
                        <>
                          <button
                            title="Voice Call"
                            onClick={() => {
                              onClose();
                              onStartCall(user, 'voice');
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Video Call"
                            onClick={() => {
                              onClose();
                              onStartCall(user, 'video');
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* The requested "CHAT" Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenChatWithUser(user)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>CHAT</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
