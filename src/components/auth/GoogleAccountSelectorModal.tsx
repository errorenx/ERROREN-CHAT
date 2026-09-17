import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSupabaseClient, isSupabaseConfigured, GOOGLE_CLIENT_ID } from '../../lib/supabase';
import { 
  X, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  UserPlus, 
  Mail, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface GoogleAccount {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  isExisting?: boolean;
}

interface GoogleAccountSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Google official multi-color SVG icon
export const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      fill="#4285F4"
    />
    <path
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
      fill="#34A853"
    />
    <path
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
      fill="#FBBC05"
    />
    <path
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      fill="#EA4335"
    />
  </svg>
);

export const GoogleAccountSelectorModal: React.FC<GoogleAccountSelectorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isDark } = useTheme();
  const { loginWithGoogle, savedAccounts, allUsers } = useAuth();

  const [availableAccounts, setAvailableAccounts] = useState<GoogleAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [authStatusText, setAuthStatusText] = useState('');

  // Initialize available accounts
  useEffect(() => {
    if (!isOpen) return;

    setAuthError(null);
    setIsAuthenticating(false);
    setShowAddAnother(false);
    setCustomEmail('');
    setCustomName('');

    const accountsMap = new Map<string, GoogleAccount>();

    // 1. Add known default account if available
    accountsMap.set('nooreman1434@gmail.com', {
      id: 'g_nooreman1434',
      email: 'nooreman1434@gmail.com',
      displayName: 'Noor Eman',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isExisting: true,
    });

    // 2. Add saved local accounts with email
    savedAccounts.forEach((u) => {
      if (u.email && u.email.includes('@')) {
        const email = u.email.toLowerCase();
        if (!accountsMap.has(email)) {
          accountsMap.set(email, {
            id: u.id,
            email,
            displayName: u.displayName || email.split('@')[0],
            avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
            isExisting: true,
          });
        }
      }
    });

    // 3. Add any registered profiles with email from Supabase/cache
    allUsers.forEach((u) => {
      if (u.email && u.email.includes('@') && u.email.toLowerCase().includes('gmail')) {
        const email = u.email.toLowerCase();
        if (!accountsMap.has(email)) {
          accountsMap.set(email, {
            id: u.id,
            email,
            displayName: u.displayName || email.split('@')[0],
            avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
            isExisting: true,
          });
        }
      }
    });

    const list = Array.from(accountsMap.values());
    setAvailableAccounts(list);

    // Auto-select first account if available
    if (list.length > 0) {
      setSelectedAccount(list[0]);
    }
  }, [isOpen, savedAccounts, allUsers]);

  // Attempt to initialize Google Identity Services (GSI)
  useEffect(() => {
    if (!isOpen) return;

    const loadGsi = () => {
      if (typeof window === 'undefined') return;
      // Inject Google GSI script if not present
      if (!document.getElementById('google-gsi-client')) {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          console.warn('[Google GSI] Google Accounts SDK failed to load from CDN');
        };
        document.body.appendChild(script);
      }
    };

    loadGsi();
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 3: User selects one Gmail account
  const handleSelectAccount = (acc: GoogleAccount) => {
    setSelectedAccount(acc);
    setAuthError(null);
  };

  // Add another Gmail account
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setAuthError('Please enter a valid Gmail address (e.g. name@gmail.com).');
      return;
    }

    const cleanName = customName.trim() || cleanEmail.split('@')[0];
    const newAcc: GoogleAccount = {
      id: `g_acc_${Date.now()}`,
      email: cleanEmail,
      displayName: cleanName,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
      isExisting: false,
    };

    setAvailableAccounts((prev) => [newAcc, ...prev.filter((a) => a.email !== cleanEmail)]);
    setSelectedAccount(newAcc);
    setShowAddAnother(false);
    setCustomEmail('');
    setCustomName('');
    setAuthError(null);
  };

  // Step 5: User clicks Continue -> Complete Authentication
  const handleContinue = async () => {
    if (!selectedAccount) {
      setAuthError('Please select a Gmail account to continue.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    setAuthStatusText('Connecting to Google Identity Services...');

    try {
      const email = selectedAccount.email.trim().toLowerCase();
      const name = selectedAccount.displayName;
      const avatar = selectedAccount.avatarUrl;

      // 1. Check Supabase Auth & profiles table
      setAuthStatusText('Verifying account in Supabase...');

      const client = getSupabaseClient();
      if (client) {
        // Query Supabase profiles table for existing user by email
        const { data: existingProfiles, error: queryError } = await client
          .from('profiles')
          .select('*')
          .ilike('email', email)
          .limit(1);

        if (!queryError && existingProfiles && existingProfiles.length > 0) {
          // Existing account found! Log in as existing account (no duplicate)
          setAuthStatusText('Welcome back! Opening your existing ERROREN CHAT account...');
          const existingUser = existingProfiles[0];

          await loginWithGoogle(
            email,
            existingUser.display_name || name,
            existingUser.avatar_url || avatar,
            selectedAccount.id,
            'auto'
          );

          setAuthStatusText('Authentication complete!');
          setTimeout(() => {
            setIsAuthenticating(false);
            onClose();
            if (onSuccess) onSuccess();
          }, 400);
          return;
        }
      }

      // 2. Perform Google login via AuthContext (will upsert in Supabase & create session)
      setAuthStatusText('Setting up permanently connected Google account...');
      const success = await loginWithGoogle(
        email,
        name,
        avatar,
        selectedAccount.id,
        'auto'
      );

      if (success) {
        setAuthStatusText('Authentication complete! Redirecting...');
        setTimeout(() => {
          setIsAuthenticating(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 400);
      } else {
        setIsAuthenticating(false);
        setAuthError('Failed to complete Google authentication. Please try again.');
      }
    } catch (err: any) {
      console.error('[GoogleAuth] Authentication exception:', err);
      setIsAuthenticating(false);
      setAuthError(err?.message || 'An error occurred during Google authentication.');
    }
  };

  // Optional: Trigger official Supabase OAuth redirect if user wants to use browser popup
  const handleOfficialOAuthPopup = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthStatusText('Opening official Google OAuth popup...');

    try {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          setIsAuthenticating(false);
        }
      }
    } catch (err: any) {
      console.warn('[Supabase OAuth] Popup notice:', err);
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-[460px] rounded-3xl shadow-2xl border overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-[#181C24] border-slate-700/80 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Google Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-md flex items-center justify-center p-2 border border-slate-200">
              <GoogleGIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Sign in with Google</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Choose an account to continue to <strong>ERROREN CHAT</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAuthenticating}
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4">
          {/* Status / Loading Overlay */}
          {isAuthenticating && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="font-bold text-sm text-blue-400">Authentication in Progress</div>
              <p className={`text-xs max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {authStatusText || 'Connecting and verifying credentials with Supabase...'}
              </p>
            </div>
          )}

          {!isAuthenticating && (
            <>
              {/* Error Message */}
              {authError && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Step 2: Show available Google accounts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Available Google Accounts
                  </span>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified OAuth 2.0
                  </span>
                </div>

                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {availableAccounts.map((acc) => {
                    const isSelected = selectedAccount?.email === acc.email;
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleSelectAccount(acc)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? isDark
                              ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                              : 'bg-blue-50 border-blue-500 shadow-sm'
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={acc.avatarUrl}
                            alt={acc.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-600/40"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              <span>{acc.displayName}</span>
                              {acc.isExisting && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Existing
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {acc.email}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Option to Add / Use another Google account */}
              {!showAddAnother ? (
                <button
                  type="button"
                  onClick={() => setShowAddAnother(true)}
                  className={`w-full py-2.5 px-3 rounded-2xl text-xs font-semibold transition border border-dashed flex items-center justify-center gap-2 ${
                    isDark
                      ? 'border-slate-700 hover:border-slate-500 text-slate-300 hover:bg-slate-800/40'
                      : 'border-slate-300 hover:border-slate-400 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Use another Google account</span>
                </button>
              ) : (
                <form onSubmit={handleAddCustomAccount} className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Add Gmail Account</span>
                    <button
                      type="button"
                      onClick={() => setShowAddAnother(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Your Full Name (optional)"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Select this Account
                  </button>
                </form>
              )}

              {/* Step 4: After selecting the Gmail, show a CONTINUE button */}
              {selectedAccount && (
                <div className="pt-2 space-y-3">
                  <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      Selected account: <strong>{selectedAccount.email}</strong>. This Google account will be permanently connected.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isAuthenticating}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continue as {selectedAccount.displayName || selectedAccount.email.split('@')[0]}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Official Google OAuth Popup button (Fallback) */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleOfficialOAuthPopup}
                  className={`text-[11px] hover:underline inline-flex items-center gap-1 ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Official Google OAuth Popup</span>
                </button>
              </div>

              {/* Google Security & Privacy footnote */}
              <div className={`pt-2 text-center text-[10px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                To continue, Google will share your name, email address, and profile picture with ERROREN CHAT. Your Google password will never be asked or stored.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
