import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../common/Logo';
import { GoogleAccountSelectorModal, GoogleGIcon } from './GoogleAccountSelectorModal';
import { 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  User as UserIcon, 
  Mail, 
  LogIn, 
  UserPlus, 
  Lock, 
  Eye, 
  EyeOff, 
  AtSign
} from 'lucide-react';

export const GoogleLoginScreen: React.FC = () => {
  const { 
    setAuthStep, 
    loginWithCredentials,
    isLoading, 
    error, 
    initialAuthMode
  } = useAuth();
  const { isDark } = useTheme();

  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Mode: Only 'register' | 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>(
    initialAuthMode === 'login' ? 'login' : 'register'
  );

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  // Status & Errors
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<boolean>(false);
  const [emailNotFound, setEmailNotFound] = useState<boolean>(false);

  // Sync initial mode
  useEffect(() => {
    if (initialAuthMode === 'login' || initialAuthMode === 'register') {
      setAuthMode(initialAuthMode);
    }
  }, [initialAuthMode]);

  // Reset errors when mode or inputs change
  useEffect(() => {
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);
  }, [authMode, identifier, email, password, username]);

  // Direct Create Account (No email confirmation!)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);

    const cleanName = displayName.trim();
    if (!cleanName) {
      setLocalError('Please enter your full name.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      setLocalError('Username must be at least 3 characters.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.indexOf('@') === 0 || cleanEmail.endsWith('@')) {
      setLocalError('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }

    if (!password || password.length < 4) {
      setLocalError('Password must be at least 4 characters.');
      return;
    }

    const res = await loginWithCredentials(
      cleanEmail,
      password,
      'register',
      cleanName,
      undefined
    );

    if (!res.success) {
      if (
        res.error?.toLowerCase().includes('already exists') ||
        res.error?.toLowerCase().includes('already registered')
      ) {
        setEmailAlreadyExists(true);
      }
      setLocalError(res.error || 'Registration failed. Please try again.');
    }
  };

  // Direct Sign In (No email confirmation!)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setEmailAlreadyExists(false);
    setEmailNotFound(false);

    const cleanTarget = identifier.trim();
    if (!cleanTarget) {
      setLocalError('Please enter your email or username.');
      return;
    }

    if (!password || password.length < 4) {
      setLocalError('Please enter your password (minimum 4 characters).');
      return;
    }

    const res = await loginWithCredentials(cleanTarget, password, 'login');
    if (!res.success) {
      if (res.error?.toLowerCase().includes('no account found')) {
        setEmailNotFound(true);
      }
      setLocalError(res.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-center items-center p-4 relative overflow-hidden select-none transition-colors duration-200 ${
      isDark ? 'bg-[#070A0F] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Card Container */}
      <div className={`relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl border transition-colors duration-200 ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800/90 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setAuthStep('welcome')}
          className={`flex items-center gap-1.5 text-xs transition mb-5 ${
            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Brand & Header */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" />

          <h2 className={`mt-3 text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {authMode === 'register' ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {authMode === 'register' 
              ? 'Register with email confirmation & instant Supabase sync.'
              : 'Sign in to access your chats, calls, and communities.'}
          </p>
        </div>

        {/* Continue with Google Action */}
        <div className="mt-5 w-full">
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition shadow-md border active:scale-95 ${
              isDark 
                ? 'bg-white hover:bg-slate-100 text-slate-900 border-white/20' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300 shadow-sm'
            }`}
          >
            <GoogleGIcon className="w-5 h-5 shrink-0" />
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full my-4">
          <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">or email / username</span>
          <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        </div>

        {/* Auth Mode Toggle Tabs (Register vs Login only) */}
        <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setLocalError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setLocalError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
        </div>

        {/* Account Already Exists Alert */}
        {emailAlreadyExists && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2.5 animate-in fade-in zoom-in-95 shadow-lg">
            <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>An account with this email or username already exists. Please login.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setIdentifier(email || username);
                setEmailAlreadyExists(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Switch to Login</span>
            </button>
          </div>
        )}

        {/* Account Not Found Alert */}
        {emailNotFound && (
          <div className="mt-4 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 space-y-2.5 animate-in fade-in zoom-in-95 shadow-lg">
            <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>No account found with these credentials. Please register.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                if (identifier.includes('@')) setEmail(identifier);
                else setUsername(identifier);
                setEmailNotFound(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-sky-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Switch to Register</span>
            </button>
          </div>
        )}

        {/* General Error Alert */}
        {!emailAlreadyExists && !emailNotFound && (error || localError) && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{localError || error}</span>
          </div>
        )}

        {/* ==================== TAB 1: REGISTER ==================== */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
            <div className="space-y-3">
              {/* Full Name */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Username
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. johndoe"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Email / Gmail */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@gmail.com"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Direct "Create Account" Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ==================== TAB 2: LOGIN ==================== */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div className="space-y-3">
              {/* Identifier (Email / Username) */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or username"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Action */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Google Account Selector Modal */}
      <GoogleAccountSelectorModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </div>
  );
};
