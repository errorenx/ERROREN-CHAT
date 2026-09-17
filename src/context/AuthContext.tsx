import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Contact, UserSettings } from '../types';
import { safeStorage } from '../utils/safeStorage';
import { apiFetch } from '../utils/api';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  findUserByPhone,
  findUserByUsername,
  addContactToSupabase,
  deleteContactFromSupabase,
  getContactsFromSupabase,
  upsertUserProfile,
  updateOnlineStatus,
  fetchAllRegisteredProfiles,
  fetchProfileById,
} from '../services/supabaseChat';

export type AuthStep = 'welcome' | 'google_login' | 'profile' | 'authenticated';

export interface ProfileCompletionDetails {
  hasName: boolean;
  hasUsername: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  isComplete: boolean;
  missingFields: string[];
}

interface AuthContextType {
  currentUser: User | null;
  authStep: AuthStep;
  setAuthStep: (step: AuthStep) => void;
  isProfileComplete: boolean;
  profileCompletionDetails: ProfileCompletionDetails;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  isLoading: boolean;
  error: string | null;
  loginWithCredentials: (
    identifier: string,
    password?: string,
    mode?: 'login' | 'register',
    displayName?: string,
    avatarUrl?: string,
    phoneNumber?: string
  ) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  loginWithGoogle: (email: string, displayName?: string, avatarUrl?: string, googleId?: string, mode?: 'login' | 'register' | 'auto') => Promise<boolean>;
  loginWithPhone: (phoneNumber: string, displayName?: string, countryCode?: string, avatarUrl?: string) => Promise<boolean>;
  initialAuthMode: 'login' | 'register';
  setInitialAuthMode: (mode: 'login' | 'register') => void;
  updateProfile: (
    displayName: string, 
    about: string, 
    avatarUrl: string, 
    username?: string, 
    phoneNumber?: string, 
    countryCode?: string,
    email?: string
  ) => Promise<boolean>;
  savePhoneNumber: (phoneNumber: string, countryCode: string, phoneVisibility?: 'everyone' | 'contacts' | 'nobody') => Promise<{ success: boolean; isSmsConfigured: boolean; message: string }>;
  contacts: Contact[];
  refreshContacts: () => Promise<void>;
  addContact: (name: string, phoneNumber: string, avatarUrl?: string, about?: string) => Promise<{ success: boolean; isRegisteredUser: boolean; contact?: Contact; matchedUser?: User; error?: string }>;
  deleteContact: (contactId: string) => Promise<boolean>;
  logout: () => void;
  deleteAccount: () => Promise<boolean>;
  allUsers: User[];
  refreshUsers: () => Promise<void>;
  userSettings: UserSettings;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  savedAccounts: User[];
  switchAccount: (userId: string) => Promise<boolean>;
  removeSavedAccount: (userId: string) => void;
  startAddAccount: () => void;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  wallpaper: 'cyber-mesh',
  privacy: {
    lastSeenVisibility: 'everyone',
    onlineVisibility: 'everyone',
    profilePhotoVisibility: 'everyone',
    aboutVisibility: 'everyone',
    statusPrivacy: 'everyone',
    phoneVisibility: 'everyone',
    readReceipts: true,
    disappearingMessagesDefault: 0,
    blockedUserIds: [],
  },
  notifications: {
    messageNotifications: true,
    groupNotifications: true,
    callNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    previewMessage: true,
  },
  security: {
    twoFactorEnabled: false,
    fingerprintLock: false,
    activeSessions: [
      {
        id: 'sess_current',
        device: 'ERROREN Web Client (Browser)',
        browser: 'Web App',
        location: 'Current Active Session',
        lastActive: Date.now(),
        isCurrent: true,
      },
    ],
  },
  aiPreferences: {
    autoSuggestReplies: true,
    tone: 'friendly',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const parsed = safeStorage.getJSON<User | null>('erroren_user', null);
    return parsed && parsed.id ? parsed : null;
  });

  const [authStep, setAuthStep] = useState<AuthStep>(() => {
    const parsed = safeStorage.getJSON<User | null>('erroren_user', null);
    if (parsed && parsed.id) {
      if (!parsed.displayName || parsed.displayName === 'New Member') {
        return 'profile';
      }
      return 'authenticated';
    }
    return 'welcome';
  });

  const [savedAccounts, setSavedAccounts] = useState<User[]>(() => {
    const saved = safeStorage.getJSON<User[]>('erroren_saved_accounts', []);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    const current = safeStorage.getJSON<User | null>('erroren_user', null);
    if (current && current.id) return [current];
    return [];
  });

  const saveToAccountList = (user: User) => {
    setSavedAccounts((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id);
      const next = [user, ...filtered];
      safeStorage.setJSON('erroren_saved_accounts', next);
      return next;
    });
  };

  const switchAccount = async (userId: string): Promise<boolean> => {
    let target = savedAccounts.find((u) => u.id === userId);
    if (isSupabaseConfigured()) {
      try {
        const fresh = await fetchProfileById(userId);
        if (fresh) {
          target = target ? { ...target, ...fresh } : fresh;
        }
      } catch (e) {
        console.warn('[AuthContext] switchAccount fetch profile error:', e);
      }
    }

    if (!target) return false;

    setCurrentUser(target);
    safeStorage.setJSON('erroren_user', target);
    saveToAccountList(target);
    setAuthStep('authenticated');
    await refreshUsers();
    await refreshContacts();
    return true;
  };

  const removeSavedAccount = (userId: string) => {
    setSavedAccounts((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      safeStorage.setJSON('erroren_saved_accounts', next);
      return next;
    });
    if (currentUser?.id === userId) {
      logout();
    }
  };

  const startAddAccount = () => {
    setAuthStep('google_login');
  };

  const [initialAuthMode, setInitialAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  // 0. Email/Username/Password Credentials Login & Registration Handler
  // Uses Supabase Auth for real accounts. Username login resolves the username to
  // its profile email first, then authenticates through Supabase Auth.
  const loginWithCredentials = async (
    identifier: string,
    password?: string,
    mode: 'login' | 'register' = 'login',
    displayName?: string,
    avatarUrl?: string,
    phoneNumber?: string
  ): Promise<{ success: boolean; error?: string; isNewUser?: boolean }> => {
    setIsLoading(true);
    setError(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password?.trim() || '';

    try {
      if (!isSupabaseConfigured()) {
        const msg = 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';
        setError(msg);
        return { success: false, error: msg };
      }

      const client = getSupabaseClient();
      if (!client) {
        const msg = 'Unable to initialize Supabase. Please check your Supabase configuration.';
        setError(msg);
        return { success: false, error: msg };
      }

      if (!cleanIdentifier || !cleanPassword) {
        const msg = 'Please enter your email/username and password.';
        setError(msg);
        return { success: false, error: msg };
      }

      let email = cleanIdentifier.toLowerCase();

      // Allow the existing UI to accept either email or username.
      if (!email.includes('@')) {
        const username = cleanIdentifier.replace(/^@/, '').toLowerCase();
        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('email')
          .eq('username', username)
          .maybeSingle();

        if (profileError || !profile?.email) {
          const msg = 'No account found with this username. Please use your registered email.';
          setError(msg);
          return { success: false, error: msg };
        }
        email = String(profile.email).trim().toLowerCase();
      }

      if (mode === 'register') {
        let createdUser: User | null = null;
        const cleanUName = (!cleanIdentifier.includes('@')
          ? cleanIdentifier.replace(/^@/, '').toLowerCase()
          : email.split('@')[0].toLowerCase());
        const cleanDName = displayName?.trim() || cleanUName || email.split('@')[0];

        // 1. Try Supabase Auth SignUp
        try {
          const { data, error: signUpError } = await client.auth.signUp({
            email,
            password: cleanPassword,
            options: {
              data: {
                display_name: cleanDName,
                username: cleanUName,
                phone: phoneNumber?.trim() || null,
                avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUName}`,
              },
            },
          });

          if (data?.user) {
            const user: User = {
              id: data.user.id,
              email: data.user.email || email,
              username: cleanUName,
              displayName: cleanDName,
              about: 'Available | Using ERROREN CHAT ⚡',
              avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUName}`,
              phoneNumber: phoneNumber?.trim() || undefined,
              isOnline: true,
              lastSeen: Date.now(),
              role: 'user',
              isProfileComplete: true,
              profileCompleted: true,
              createdAt: Date.now(),
            };

            const savedProfile = await upsertUserProfile(user);
            createdUser = savedProfile ? { ...user, ...savedProfile } : user;
          } else if (signUpError) {
            if (
              signUpError.message?.toLowerCase().includes('already registered') ||
              signUpError.message?.toLowerCase().includes('already exists')
            ) {
              const msg = 'An account with this email already exists. Please sign in.';
              setError(msg);
              return { success: false, error: msg };
            }
          }
        } catch (sbErr) {
          console.warn('[AuthContext] Supabase register error:', sbErr);
        }

        // 2. Server API fallback if Supabase didn't complete
        if (!createdUser) {
          try {
            const regRes = await apiFetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                username: cleanUName,
                password: cleanPassword,
                displayName: cleanDName,
                avatarUrl,
              }),
            });
            if (regRes.ok) {
              const regData = await regRes.json();
              if (regData.user) {
                createdUser = regData.user;
              }
            } else {
              const errData = await regRes.json().catch(() => ({}));
              if (errData.error) {
                setError(errData.error);
                return { success: false, error: errData.error };
              }
            }
          } catch (serverErr) {
            console.warn('[AuthContext] Server register fallback error:', serverErr);
          }
        }

        // 3. Local direct creation if both were offline/unavailable
        if (!createdUser) {
          createdUser = {
            id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            email,
            username: cleanUName,
            displayName: cleanDName,
            about: 'Available | Using ERROREN CHAT ⚡',
            avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUName}`,
            phoneNumber: phoneNumber?.trim() || undefined,
            isOnline: true,
            lastSeen: Date.now(),
            role: 'user',
            isProfileComplete: true,
            profileCompleted: true,
            createdAt: Date.now(),
          };
        }

        const finalUser = createdUser;
        setCurrentUser(finalUser);
        safeStorage.setJSON('erroren_user', finalUser);
        saveToAccountList(finalUser);
        setAuthStep('authenticated');

        // Store user in all registered users cache so they appear immediately
        setAllUsers((prev) => {
          const filtered = prev.filter((u) => u.id !== finalUser.id && u.username !== finalUser.username);
          const next = [finalUser, ...filtered];
          safeStorage.setJSON('erroren_all_users', next);
          return next;
        });

        await refreshUsers();
        await refreshContacts();

        return { success: true, isNewUser: true };
      }

      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password: cleanPassword,
      });

      if (signInError || !data.user) {
        const msg = signInError?.message || 'Login failed. Please check your email and password.';
        setError(msg);
        return { success: false, error: msg };
      }

      const profile = await fetchProfileById(data.user.id);
      const finalUser: User = profile || {
        id: data.user.id,
        email: data.user.email || email,
        username: data.user.user_metadata?.username || email.split('@')[0].toLowerCase(),
        displayName: data.user.user_metadata?.display_name || email.split('@')[0],
        about: data.user.user_metadata?.about || 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        isProfileComplete: false,
        profileCompleted: false,
        createdAt: new Date(data.user.created_at).getTime() || Date.now(),
      };

      setCurrentUser(finalUser);
      safeStorage.setJSON('erroren_user', finalUser);
      saveToAccountList(finalUser);
      setAuthStep(finalUser.displayName && finalUser.displayName !== 'New Member' ? 'authenticated' : 'profile');
      await upsertUserProfile({ ...finalUser, isOnline: true });
      await refreshUsers();
      await refreshContacts();

      return { success: true, isNewUser: false };
    } catch (err: any) {
      const msg = err?.message || 'Authentication error. Please try again.';
      console.error('[AuthContext] Supabase credentials auth error:', err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const hasName = Boolean(
    currentUser?.displayName && 
    currentUser.displayName.trim().length >= 2 && 
    currentUser.displayName !== 'New Member'
  );
  const hasUsername = Boolean(
    currentUser?.username && 
    currentUser.username.trim().replace(/^@/, '').length >= 3
  );
  const cleanPhone = (currentUser?.phoneNumber || '').trim().replace(/[^0-9]/g, '');
  const hasPhone = true; // Phone number requirement removed per user specification
  const cleanEmail = (currentUser?.email || '').trim().toLowerCase();
  const hasEmail = Boolean(cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5);

  const isProfileComplete = Boolean(currentUser && hasName && hasUsername && hasEmail);

  const missingFields: string[] = [];
  if (!hasName) missingFields.push('Full Name');
  if (!hasUsername) missingFields.push('Username');
  if (!hasEmail) missingFields.push('Gmail / Email');

  const profileCompletionDetails: ProfileCompletionDetails = {
    hasName,
    hasUsername,
    hasPhone,
    hasEmail,
    isComplete: isProfileComplete,
    missingFields,
  };

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    return safeStorage.getJSON<UserSettings>('erroren_settings', defaultSettings);
  });

  const refreshUsers = async () => {
    let collectedUsers: User[] = [];

    // 1. Supabase first
    if (isSupabaseConfigured()) {
      try {
        const sbUsers = await fetchAllRegisteredProfiles();
        if (sbUsers && sbUsers.length > 0) {
          collectedUsers = [...collectedUsers, ...sbUsers];
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase refreshUsers error:', err);
      }
    }

    // 2. Server API fallback
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          collectedUsers = [...collectedUsers, ...list];
        }
      }
    } catch (err) {
      console.warn('Failed to fetch server users:', err);
    }

    // 3. Local cached users
    try {
      const localUsers = safeStorage.getJSON<User[]>('erroren_all_users', []);
      if (Array.isArray(localUsers) && localUsers.length > 0) {
        collectedUsers = [...collectedUsers, ...localUsers];
      }
    } catch {}

    // 4. Saved accounts on this device
    try {
      const saved = safeStorage.getJSON<User[]>('erroren_saved_accounts', []);
      if (Array.isArray(saved) && saved.length > 0) {
        collectedUsers = [...collectedUsers, ...saved];
      }
    } catch {}

    // Deduplicate by ID and username
    const uniqueMap = new Map<string, User>();
    for (const u of collectedUsers) {
      if (!u || !u.id) continue;
      const key = (u.username || u.id).toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, u);
      }
    }

    const merged = Array.from(uniqueMap.values());
    if (merged.length > 0) {
      setAllUsers(merged);
      safeStorage.setJSON('erroren_all_users', merged);
    }
  };

  const refreshContacts = async () => {
    if (!currentUser?.id) return;

    // 1. Supabase first
    if (isSupabaseConfigured()) {
      try {
        const sbContacts = await getContactsFromSupabase(currentUser.id);
        if (sbContacts && Array.isArray(sbContacts)) {
          setContacts(sbContacts);
          safeStorage.setJSON(`erroren_contacts_${currentUser.id}`, sbContacts);
          return;
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase refreshContacts error:', err);
      }
    }

    // 2. Server API fallback
    try {
      const res = await apiFetch(`/api/contacts?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setContacts(list);
          safeStorage.setJSON(`erroren_contacts_${currentUser.id}`, list);
        }
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, [currentUser?.id]);

  useEffect(() => {
    const handleUserUpdated = (e: any) => {
      const updatedUser: User | undefined = e?.detail;
      if (!updatedUser) return;

      setCurrentUser((prev) => {
        if (prev && prev.id === updatedUser.id) {
          const merged = { ...prev, ...updatedUser };
          safeStorage.setJSON('erroren_user', merged);
          return merged;
        }
        return prev;
      });

      setAllUsers((prev) => {
        const index = prev.findIndex((u) => u.id === updatedUser.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...updatedUser };
          return next;
        }
        return [...prev, updatedUser];
      });
    };

    window.addEventListener('erroren:user_updated', handleUserUpdated);
    return () => {
      window.removeEventListener('erroren:user_updated', handleUserUpdated);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      refreshContacts();
    }
  }, [currentUser?.id]);

  // Google Login Authentication Handler
  const loginWithGoogle = async (
    email: string,
    displayName?: string,
    avatarUrl?: string,
    googleId?: string,
    mode: 'login' | 'register' | 'auto' = 'auto'
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Check Supabase profiles first
      if (isSupabaseConfigured()) {
        const client = getSupabaseClient();
        if (client) {
          const { data: matchedProfiles, error: queryError } = await client
            .from('profiles')
            .select('*')
            .ilike('email', cleanEmail)
            .limit(1);

          if (!queryError && matchedProfiles && matchedProfiles.length > 0) {
            // Existing Google account found: open existing account (no duplicates)
            const rawProfile = matchedProfiles[0];
            const existingUser: User = {
              id: rawProfile.id,
              email: cleanEmail,
              googleEmail: cleanEmail,
              isGoogleAuth: true,
              googleId: googleId || rawProfile.id,
              username: rawProfile.username || cleanEmail.split('@')[0],
              displayName: rawProfile.display_name || displayName || cleanEmail.split('@')[0],
              about: rawProfile.bio || 'Available | Using ERROREN CHAT ⚡',
              avatarUrl: rawProfile.avatar_url || avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
              phoneNumber: rawProfile.phone || undefined,
              countryCode: rawProfile.country_code || '+92',
              isOnline: true,
              lastSeen: Date.now(),
              role: (rawProfile.role as 'user' | 'admin') || 'user',
              isProfileComplete: true,
              profileCompleted: true,
              createdAt: rawProfile.created_at ? new Date(rawProfile.created_at).getTime() : Date.now(),
            };

            // Update presence in Supabase
            await updateOnlineStatus(existingUser.id, true);

            setCurrentUser(existingUser);
            safeStorage.setJSON('erroren_user', existingUser);
            saveToAccountList(existingUser);
            setAuthStep('authenticated');
            await refreshUsers();
            await refreshContacts();
            return true;
          }

          // Not found in Supabase: create new user profile permanently bound to Google account
          let baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
          if (baseUsername.length < 3) baseUsername = 'user_' + baseUsername;

          // Check if username is taken
          const { data: userCheck } = await client
            .from('profiles')
            .select('id')
            .ilike('username', baseUsername)
            .limit(1);

          if (userCheck && userCheck.length > 0) {
            baseUsername = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
          }

          const newGoogleUser: User = {
            id: crypto.randomUUID ? crypto.randomUUID() : `usr_g_${Date.now()}`,
            email: cleanEmail,
            googleEmail: cleanEmail,
            isGoogleAuth: true,
            googleId: googleId || `gid_${Date.now()}`,
            username: baseUsername,
            displayName: displayName?.trim() || cleanEmail.split('@')[0],
            about: 'Available | Using ERROREN CHAT ⚡',
            avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
            isOnline: true,
            lastSeen: Date.now(),
            role: 'user',
            isProfileComplete: true,
            profileCompleted: true,
            createdAt: Date.now(),
          };

          const savedProfile = await upsertUserProfile(newGoogleUser);
          const finalUser = savedProfile ? { ...newGoogleUser, ...savedProfile, isGoogleAuth: true, googleEmail: cleanEmail } : newGoogleUser;

          setCurrentUser(finalUser);
          safeStorage.setJSON('erroren_user', finalUser);
          saveToAccountList(finalUser);
          setAuthStep('authenticated');
          await refreshUsers();
          await refreshContacts();
          return true;
        }
      }

      // 2. Fallback to local accounts & cache
      const existingKnownUser = allUsers.find(
        (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
      ) || savedAccounts.find(
        (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
      );

      const targetUser: User = existingKnownUser
        ? { ...existingKnownUser, isGoogleAuth: true, googleEmail: cleanEmail, isOnline: true }
        : {
            id: `usr_g_${Date.now()}`,
            email: cleanEmail,
            googleEmail: cleanEmail,
            isGoogleAuth: true,
            googleId: googleId || `gid_${Date.now()}`,
            displayName: displayName?.trim() || cleanEmail.split('@')[0],
            username: cleanEmail.split('@')[0].toLowerCase(),
            about: 'Available | Using ERROREN CHAT ⚡',
            avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
            isOnline: true,
            lastSeen: Date.now(),
            role: 'user',
            isProfileComplete: true,
            profileCompleted: true,
            createdAt: Date.now(),
          };

      setCurrentUser(targetUser);
      safeStorage.setJSON('erroren_user', targetUser);
      saveToAccountList(targetUser);
      setAuthStep('authenticated');
      return true;
    } catch (err: any) {
      console.error('[AuthContext] Google auth exception:', err);
      const fallbackUser: User = {
        id: `usr_g_${Date.now()}`,
        email: cleanEmail,
        googleEmail: cleanEmail,
        isGoogleAuth: true,
        googleId: googleId || `gid_${Date.now()}`,
        displayName: displayName?.trim() || cleanEmail.split('@')[0],
        username: cleanEmail.split('@')[0].toLowerCase(),
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        isProfileComplete: true,
        profileCompleted: true,
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // Phone Login Authentication Handler (e.g. 03399951515)
  const loginWithPhone = async (
    phoneNumber: string,
    displayName?: string,
    countryCode: string = '+92',
    avatarUrl?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const cleanPhone = phoneNumber.trim();
    try {
      const res = await apiFetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          countryCode,
          displayName,
          avatarUrl,
        }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setCurrentUser(data.user);
        safeStorage.setJSON('erroren_user', data.user);
        saveToAccountList(data.user);

        if (data.isNewUser || !data.isProfileComplete) {
          setAuthStep('profile');
        } else {
          setAuthStep('authenticated');
        }

        await refreshUsers();
        await refreshContacts();
        return true;
      }

      // Offline / Static fallback (e.g. GitHub Pages)
      const fallbackUser: User = {
        id: `usr_p_${cleanPhone.replace(/[^0-9]/g, '') || Date.now()}`,
        phoneNumber: cleanPhone,
        countryCode,
        displayName: displayName?.trim() || `User ${cleanPhone.slice(-4)}`,
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        isPhoneVerified: true,
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } catch (err: any) {
      const fallbackUser: User = {
        id: `usr_p_${cleanPhone.replace(/[^0-9]/g, '') || Date.now()}`,
        phoneNumber: cleanPhone,
        countryCode,
        displayName: displayName?.trim() || `User ${cleanPhone.slice(-4)}`,
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        isPhoneVerified: true,
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (
    displayName: string, 
    about: string, 
    avatarUrl: string, 
    username?: string, 
    phoneNumber?: string, 
    countryCode?: string, 
    email?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;
    setIsLoading(true); 
    setError(null);

    const cleanUsername = username !== undefined ? username.trim().toLowerCase().replace(/^@/, '') : currentUser.username;
    const cleanEmail = email !== undefined ? email.trim().toLowerCase() : currentUser.email;
    const cleanPhone = phoneNumber !== undefined ? phoneNumber.trim().replace(/[^0-9]/g, '') : (currentUser.phoneNumber || '').replace(/[^0-9]/g, '');

    try {
      // 1. If Supabase is configured, check for handle & phone conflicts
      if (isSupabaseConfigured()) {
        const client = getSupabaseClient();
        if (client) {
          if (cleanUsername) {
            try {
              const { data, error } = await client
                .from('profiles')
                .select('id')
                .eq('username', cleanUsername)
                .neq('id', currentUser.id)
                .limit(1);
              if (!error && data && data.length > 0) {
                setError('This username is already taken. Please choose a different username.');
                setIsLoading(false);
                return false;
              }
            } catch (e) {
              console.warn('[AuthContext] Supabase username check error:', e);
            }
          }

          if (cleanPhone) {
            try {
              const { data, error } = await client
                .from('profiles')
                .select('id')
                .eq('phone_normalized', cleanPhone)
                .neq('id', currentUser.id)
                .limit(1);
              if (!error && data && data.length > 0) {
                setError('This phone number is already associated with another account.');
                setIsLoading(false);
                return false;
              }
            } catch (e) {
              console.warn('[AuthContext] Supabase phone check error:', e);
            }
          }
        }
      }

      // 2. Sync with backend /api/auth/profile if server is available
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            displayName: displayName?.trim() || currentUser.displayName,
            username: cleanUsername || undefined,
            about: about?.trim() || '',
            avatarUrl: avatarUrl || currentUser.avatarUrl,
            phoneNumber: cleanPhone || undefined,
            countryCode: countryCode || currentUser.countryCode || '+92',
            email: cleanEmail || currentUser.email,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData?.error) {
            setError(errData.error);
            setIsLoading(false);
            return false;
          }
        }
      } catch (backendErr) {
        console.warn('[AuthContext] /api/auth/profile network attempt notice:', backendErr);
      }

      // 3. Prepare updated user object
      const updated: User = { 
        ...currentUser, 
        displayName: displayName?.trim() || currentUser.displayName, 
        username: cleanUsername || undefined, 
        about: about?.trim() || '', 
        avatarUrl: avatarUrl || currentUser.avatarUrl, 
        phoneNumber: cleanPhone || undefined, 
        countryCode: countryCode || currentUser.countryCode || '+92', 
        email: cleanEmail || currentUser.email, 
        isProfileComplete: true, 
        profileCompleted: true 
      };

      // 4. Try syncing to Supabase profiles (graceful fallback if RLS or network issue)
      let saved: User | null = null;
      if (isSupabaseConfigured()) {
        try {
          saved = await upsertUserProfile(updated);
        } catch (supabaseErr) {
          console.warn('[AuthContext] Supabase profile upsert warning (fallback used):', supabaseErr);
        }
      }

      const finalUser: User = { 
        ...updated, 
        ...(saved || {}), 
        isProfileComplete: true, 
        profileCompleted: true 
      };

      setCurrentUser(finalUser); 
      safeStorage.setJSON('erroren_user', finalUser); 
      saveToAccountList(finalUser); 
      setAuthStep('authenticated');
      
      try {
        await refreshUsers();
      } catch {}

      return true;
    } catch (err: any) { 
      console.error('[AuthContext] Profile update error:', err); 
      setError(err?.message || 'Failed to update profile.'); 
      return false; 
    } finally { 
      setIsLoading(false); 
    }
  };

  // Optional Phone Number Addition
  const savePhoneNumber = async (
    phoneNumber: string, 
    countryCode: string, 
    phoneVisibility: 'everyone' | 'contacts' | 'nobody' = 'everyone'
  ): Promise<{ success: boolean; isSmsConfigured: boolean; message: string }> => {
    if (!currentUser) return { success: false, isSmsConfigured: false, message: 'User not logged in' };
    const cleanDigits = (phoneNumber || '').trim().replace(/[^0-9]/g, '');
    if (cleanDigits.length < 6) return { success: false, isSmsConfigured: false, message: 'Please enter a valid phone number.' };
    
    try {
      if (isSupabaseConfigured()) {
        const client = getSupabaseClient(); 
        if (client) {
          try {
            const { data } = await client
              .from('profiles')
              .select('id')
              .eq('phone_normalized', cleanDigits)
              .neq('id', currentUser.id)
              .limit(1);
            if (data?.length) {
              return { success: false, isSmsConfigured: false, message: 'This phone number is already associated with another account.' };
            }
          } catch {}
        }
      }

      const updated: User = { 
        ...currentUser, 
        phoneNumber: cleanDigits, 
        countryCode: countryCode || currentUser.countryCode || '+92' 
      };

      if (isSupabaseConfigured()) {
        try {
          await upsertUserProfile(updated);
        } catch {}
      }

      // Sync with server
      try {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            phoneNumber: cleanDigits,
            countryCode: countryCode || currentUser.countryCode || '+92',
          }),
        });
      } catch {}

      setCurrentUser(updated); 
      safeStorage.setJSON('erroren_user', updated); 
      saveToAccountList(updated); 
      try { await refreshUsers(); } catch {}

      return { success: true, isSmsConfigured: false, message: 'Phone number saved successfully.' };
    } catch (err: any) { 
      console.error('[AuthContext] Phone save error:', err); 
      return { success: false, isSmsConfigured: false, message: err?.message || 'Failed to save phone number.' }; 
    }
  };

  // Sync user profile & presence with Supabase on login
  useEffect(() => {
    if (currentUser?.id && isSupabaseConfigured()) {
      upsertUserProfile(currentUser).catch((err) => {
        console.warn('[AuthContext] Supabase sync user profile error:', err);
      });
      updateOnlineStatus(currentUser.id, true).catch(() => {});

      const handleBeforeUnload = () => {
        updateOnlineStatus(currentUser.id, false).catch(() => {});
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentUser?.id]);

  // Add Contact - Verifies that the username or phone belongs to a registered user on ERROREN CHAT
  const addContact = async (
    name: string,
    usernameOrPhone: string,
    avatarUrl?: string,
    about?: string
  ): Promise<{ success: boolean; isRegisteredUser: boolean; contact?: Contact; matchedUser?: User; error?: string }> => {
    if (!currentUser) return { success: false, isRegisteredUser: false, error: 'User not logged in' };
    const raw = (usernameOrPhone || '').trim();
    if (!raw) {
      return {
        success: false,
        isRegisteredUser: false,
        error: 'Please enter a registered username.',
      };
    }

    const isUsername = raw.startsWith('@') || /[a-zA-Z_]/.test(raw) || raw.replace(/[^0-9]/g, '').length < 7;

    // 1. Username Lookup & Save
    if (isUsername) {
      const cleanUsername = raw.toLowerCase().replace(/^@/, '');
      if (currentUser.username && currentUser.username.toLowerCase().replace(/^@/, '') === cleanUsername) {
        return {
          success: false,
          isRegisteredUser: false,
          error: 'You cannot add your own username as a contact.',
        };
      }

      const lookupRes = await findUserByUsername(cleanUsername, currentUser.id);
      if (!lookupRes.registered || !lookupRes.user) {
        return {
          success: false,
          isRegisteredUser: false,
          error: 'Available not found (No user exists with this username on ERROREN CHAT).',
        };
      }

      const matchedUser = lookupRes.user;
      const alreadySaved = contacts.some(
        (c) => c.contactUserId === matchedUser.id || (c.name && c.name.toLowerCase() === matchedUser.displayName.toLowerCase())
      );
      if (alreadySaved) {
        return {
          success: false,
          isRegisteredUser: true,
          error: 'This contact is already in your contacts list.',
        };
      }

      const addRes = await addContactToSupabase(
        currentUser.id,
        matchedUser,
        name.trim() || matchedUser.displayName,
        avatarUrl || matchedUser.avatarUrl,
        about || matchedUser.about
      );

      if (addRes.success && addRes.contact) {
        const newContact = addRes.contact;
        setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
        safeStorage.setJSON(`erroren_contacts_${currentUser.id}`, [
          newContact,
          ...contacts.filter((c) => c.id !== newContact.id),
        ]);
        return {
          success: true,
          isRegisteredUser: true,
          contact: newContact,
          matchedUser,
        };
      }

      return {
        success: false,
        isRegisteredUser: true,
        error: addRes.error || 'Failed to save contact.',
      };
    }

    // 2. Phone Lookup & Save (fallback for phone numbers)
    const cleanPhone = raw;
    const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');

    // Check Supabase first
    if (isSupabaseConfigured()) {
      try {
        const sbSearch = await findUserByPhone(cleanPhone, currentUser.id);
        if (sbSearch.isSelf) {
          return {
            success: false,
            isRegisteredUser: false,
            error: 'You cannot add your own phone number as a contact.',
          };
        }

        if (sbSearch.registered && sbSearch.user) {
          const matchedUser = sbSearch.user;
          const alreadySaved = contacts.some(
            (c) =>
              c.contactUserId === matchedUser.id ||
              (c.phoneNumber && c.phoneNumber.replace(/[^0-9]/g, '') === cleanDigits)
          );
          if (alreadySaved) {
            return {
              success: false,
              isRegisteredUser: true,
              error: 'This contact is already in your contacts list.',
            };
          }

          const addRes = await addContactToSupabase(
            currentUser.id,
            matchedUser,
            name.trim() || matchedUser.displayName,
            avatarUrl || matchedUser.avatarUrl,
            about || matchedUser.about
          );

          if (addRes.success && addRes.contact) {
            const newContact = addRes.contact;
            setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
            safeStorage.setJSON(`erroren_contacts_${currentUser.id}`, [
              newContact,
              ...contacts.filter((c) => c.id !== newContact.id),
            ]);

            return {
              success: true,
              isRegisteredUser: true,
              contact: newContact,
              matchedUser,
            };
          } else if (addRes.error) {
            return {
              success: false,
              isRegisteredUser: true,
              error: addRes.error,
            };
          }
        }
      } catch (err: any) {
        console.warn('[AuthContext] Supabase addContact error:', err);
      }
    }

    // 2. Server / Local fallback
    const localMatchedUser = allUsers.find((u) => {
      const uDigits = (u.phoneNumber || '').replace(/[^0-9]/g, '');
      return (
        uDigits.length >= 7 &&
        (uDigits === cleanDigits || uDigits.endsWith(cleanDigits) || cleanDigits.endsWith(uDigits))
      );
    });

    try {
      const res = await apiFetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUserId: currentUser.id,
          name: name.trim(),
          phoneNumber: cleanPhone,
          avatarUrl,
          about,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        await refreshContacts();
        await refreshUsers();
        return {
          success: true,
          isRegisteredUser: true,
          contact: data.contact,
          matchedUser: data.matchedUser,
        };
      }

      if (res.status === 404 || data.error?.includes('not registered')) {
        return {
          success: false,
          isRegisteredUser: false,
          error: 'This number is not registered on this platform.',
        };
      }

      // If server could not be reached (503 / network error) or is offline:
      if (!localMatchedUser) {
        return {
          success: false,
          isRegisteredUser: false,
          error: data.error || 'This number is not registered on this platform.',
        };
      }

      if (localMatchedUser.id === currentUser.id) {
        return {
          success: false,
          isRegisteredUser: false,
          error: 'You cannot add your own phone number as a contact.',
        };
      }

      const alreadySaved = contacts.some(
        (c) =>
          c.contactUserId === localMatchedUser.id ||
          (c.phoneNumber && c.phoneNumber.replace(/[^0-9]/g, '') === cleanDigits)
      );
      if (alreadySaved) {
        return {
          success: false,
          isRegisteredUser: false,
          error: 'This contact is already in your contacts list.',
        };
      }

      const newContact: Contact = {
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ownerUserId: currentUser.id,
        name: name.trim() || localMatchedUser.displayName || `User ${cleanDigits.slice(-4)}`,
        phoneNumber: localMatchedUser.phoneNumber || cleanPhone,
        avatarUrl: avatarUrl || localMatchedUser.avatarUrl,
        about: about || localMatchedUser.about || 'Available | Using ERROREN CHAT ⚡',
        contactUserId: localMatchedUser.id,
        createdAt: Date.now(),
      };

      const updated = [...contacts, newContact];
      setContacts(updated);
      try {
        localStorage.setItem(`erroren_contacts_${currentUser.id}`, JSON.stringify(updated));
      } catch {}

      return {
        success: true,
        isRegisteredUser: true,
        contact: newContact,
        matchedUser: localMatchedUser,
      };
    } catch (err: any) {
      if (!localMatchedUser) {
        return {
          success: false,
          isRegisteredUser: false,
          error: 'This number is not registered on this platform.',
        };
      }
      return {
        success: false,
        isRegisteredUser: false,
        error: err.message || 'Unable to connect to server to verify contact.',
      };
    }
  };

  // Delete Contact
  const deleteContact = async (contactId: string): Promise<boolean> => {
    if (!currentUser) return false;

    if (isSupabaseConfigured()) {
      deleteContactFromSupabase(currentUser.id, contactId).catch((err) => {
        console.warn('[AuthContext] Supabase deleteContact error:', err);
      });
    }

    try {
      const res = await apiFetch(`/api/contacts/${contactId}?userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshContacts();
        return true;
      }
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      return true;
    } catch {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      return true;
    }
  };

  const logout = () => {
    const userId = currentUser?.id;
    if (userId && isSupabaseConfigured()) {
      updateOnlineStatus(userId, false).catch(() => {});
      getSupabaseClient()?.auth.signOut().catch((err) => {
        console.warn('[AuthContext] Supabase signOut error:', err);
      });
    }
    setCurrentUser(null);
    safeStorage.removeItem('erroren_user');
    setAuthStep('welcome');
  };

  const deleteAccount = async (): Promise<boolean> => {
    logout();
    return true;
  };

  const updateUserSettings = (updates: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const next = { ...prev, ...updates };
      safeStorage.setJSON('erroren_settings', next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authStep,
        setAuthStep,
        isProfileComplete,
        profileCompletionDetails,
        isProfileModalOpen,
        setIsProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        isLoading,
        error,
        loginWithCredentials,
        loginWithGoogle,
        loginWithPhone,
        initialAuthMode,
        setInitialAuthMode,
        updateProfile,
        savePhoneNumber,
        contacts,
        refreshContacts,
        addContact,
        deleteContact,
        logout,
        deleteAccount,
        allUsers,
        refreshUsers,
        userSettings,
        updateUserSettings,
        savedAccounts,
        switchAccount,
        removeSavedAccount,
        startAddAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

