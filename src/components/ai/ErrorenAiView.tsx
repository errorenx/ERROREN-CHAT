import React, { useState, useRef, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  RotateCcw, 
  Loader2, 
  User as UserIcon,
  Code,
  BookOpen,
  Languages,
  PenTool,
  Lightbulb,
  FileText,
  Plus,
  Compass,
  ArrowDown,
  Palette,
  ArrowLeft
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { WallpaperModal, WALLPAPER_PRESETS } from '../settings/WallpaperModal';
import { apiFetch } from '../../utils/api';

function getLocalFallbackAiReply(prompt: string): string {
  const p = prompt.trim().toLowerCase();
  
  // Roman Urdu & Hindi checks
  if (p.includes('kese ho') || p.includes('kaisa hai') || p.includes('kese he') || p.includes('kaise ho') || p.includes('kia hal') || p.includes('kya hal')) {
    return "Main bilkul theek hoon, shukriya! Main **ERROREN AI** hoon, aapka personal assistant. Aaj main aapki kya madad kar sakta hoon?";
  }
  if (p.includes('ap kon ho') || p.includes('tum kon ho') || p.includes('kaun ho') || p.includes('kon ho') || p.includes('kon h')) {
    return "Main **ERROREN AI** hoon, ERROREN CHAT ka intelligent personal assistant. Main aapke har swal ka jwab, coding, translation, aur har qisam ki madad ke liye tayyar hoon.";
  }
  if (p.includes('kya kr skte ho') || p.includes('kya kar sakte ho') || p.includes('kya krte ho') || p.includes('features')) {
    return "Main har zuban samajhta hoon aur aapki har cheez mein madad kar sakta hoon:\n- **Har swal ka durust jwab**: Science, tareekh, general knowledge, maths, aur facts\n- **Coding & Tech**: TypeScript, React, Python, web development, debugging\n- **Language Translation**: Roman Urdu, Urdu, English, Hindi, Arabic, Spanish, etc.\n- **Writing & Drafting**: Messages, professional emails, essays aur summaries\n\nAap jis zuban mein bhi baat karein, main usi zuban mein accurate jwab dunga!";
  }
  if (p.includes('salam') || p.includes('assalam') || p.includes('slm')) {
    return "Wa Alaikum Assalam! Khush aamdeed. Main **ERROREN AI** hoon. Farmayein, main aapki kya khidmat kar sakta hoon?";
  }

  // Urdu Script checks
  if (/[\u0600-\u06FF]/.test(prompt)) {
    if (prompt.includes('سلام') || prompt.includes('کیسے')) {
      return "وعلیکم السلام! میں **ERROREN AI** ہوں۔ میں بالکل ٹھیک ہوں۔ بتائیے میں آج آپ کی کس طرح مدد کر سکتا ہوں؟";
    }
    if (prompt.includes('کون ہو') || prompt.includes('کیا کرتے ہو')) {
      return "میں **ERROREN AI** ہوں، ERROREN CHAT کا ذاتی ذہین اسسٹنٹ۔ میں آپ کے تمام سوالات کے درست جوابات، ترجمہ، کوڈنگ، اور تحریری مدد فراہم کر سکتا ہوں۔";
    }
    return `آپ کے سوال کا شکریہ! میں **ERROREN AI** ہوں اور آپ کی مدد کے لیے مکمل حاضر ہوں۔ آپ بلا جھجھک کوئی بھی سوال پوچھ سکتے ہیں۔`;
  }

  // English & general inquiries
  if (p.includes('hello') || p.includes('hi') || p.includes('hey')) {
    return "Hello! I am **ERROREN AI**, your built-in intelligent assistant on ERROREN CHAT. How can I help you today?";
  }
  if (p.includes('who are you') || p.includes('what can you do')) {
    return "I am **ERROREN AI**, the intelligent assistant built into ERROREN CHAT. I can answer questions, write code, solve problems, translate between any languages, and assist you with anything you need in real-time!";
  }
  if (p.includes('call') || p.includes('video') || p.includes('audio')) {
    return "In **ERROREN CHAT**, you can make voice and video calls with any registered user by tapping the phone or video icon in the chat header.";
  }
  if (p.includes('contact') || p.includes('add contact')) {
    return "To add a contact, open the **+** (New Chat) dialog, choose **Add Contact**, and input their registered phone number. The platform verifies their registration in real time.";
  }
  return `Thank you! I received your request: "${prompt}".\n\nI am **ERROREN AI**, ready to assist you with accurate answers, translations, coding, or drafting in whatever language you prefer. How else can I help?`;
}

interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface ErrorenAiViewProps {
  currentUser?: User;
  onBack?: () => void;
}

const quickPromptsList = [
  { 
    icon: PenTool, 
    label: 'Write a message', 
    prompt: 'Write a polite and professional message to reschedule a meeting to tomorrow afternoon.' 
  },
  { 
    icon: Languages, 
    label: 'Translate', 
    prompt: 'Translate this message into Urdu, Spanish, and Arabic: "Thank you for your assistance. Let me know when you are free to chat."' 
  },
  { 
    icon: FileText, 
    label: 'Summarize', 
    prompt: 'Summarize the key differences between synchronous and asynchronous communication in 3 bullet points.' 
  },
  { 
    icon: Lightbulb, 
    label: 'Give me ideas', 
    prompt: 'Give me 5 creative and modern startup product ideas utilizing real-time communications.' 
  },
  { 
    icon: BookOpen, 
    label: 'Help me study', 
    prompt: 'Explain how public-key cryptography and end-to-end encryption work in simple, understandable terms.' 
  },
  { 
    icon: Code, 
    label: 'Help with code', 
    prompt: 'Write a clean TypeScript function that formats a timestamp into relative time like "Just now", "5m ago", or "2h ago".' 
  },
];

const INITIAL_WELCOME: AiChatMessage = {
  id: 'msg_welcome_init',
  sender: 'ai',
  text: 'Hello! How can I help you today?\n\nI am **ERROREN AI**, your intelligent personal assistant. You can ask me any question, brainstorm ideas, request code, translate text, or compose messages.',
  timestamp: Date.now(),
};

const STORAGE_KEY = 'erroren_ai_conversation_history';

export const ErrorenAiView: React.FC<ErrorenAiViewProps> = ({ currentUser, onBack }) => {
  const userStorageKey = currentUser?.id ? `${STORAGE_KEY}_${currentUser.id}` : STORAGE_KEY;

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read saved AI conversation:', e);
    }
    return [INITIAL_WELCOME];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const { currentAccent, isDark, getEffectiveWallpaper } = useTheme();
  const { isConnected, onlineUserIds } = useSocket();

  const isNetOnline = typeof navigator !== 'undefined' ? navigator.onLine : isConnected;
  const isUserOnline = currentUser?.id ? onlineUserIds.has(currentUser.id) : isNetOnline;
  const isAiOnline = isNetOnline && (isUserOnline || isConnected);

  const currentWallpaper = getEffectiveWallpaper('ai_chat');

  const getWallpaperStyles = (): React.CSSProperties | undefined => {
    if (currentWallpaper.startsWith('data:image') || currentWallpaper.startsWith('http')) {
      return {
        backgroundImage: `url(${currentWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return undefined;
  };

  const getWallpaperClass = () => {
    if (currentWallpaper.startsWith('data:image') || currentWallpaper.startsWith('http')) {
      return 'bg-slate-950';
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === currentWallpaper);
    return preset?.className || '';
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Save messages to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not persist AI messages:', e);
    }
  }, [messages, userStorageKey]);

  // Auto-scroll on new message or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt.trim();
    if (!textToSend || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setShowAttachMenu(false);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const formattedHistory = newHistory.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: textToSend,
          messages: formattedHistory,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const replyText = data.reply || (data.success ? data.message : null) || getLocalFallbackAiReply(textToSend);

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'ai',
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('[ERROREN AI Network/Client Error]:', err);
      const errorMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: getLocalFallbackAiReply(textToSend),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length < 2) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.sender === 'user');
    if (lastUserIndex === -1) return;

    const targetIndex = messages.length - 1 - lastUserIndex;
    const lastUserPrompt = messages[targetIndex].text;

    const trimmed = messages.slice(0, targetIndex + 1);
    setMessages(trimmed);
    setIsLoading(true);

    try {
      const formattedHistory = trimmed.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: lastUserPrompt,
          messages: formattedHistory,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const replyText = data.reply || (data.success ? data.message : null) || getLocalFallbackAiReply(lastUserPrompt);

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'ai',
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('[ERROREN AI Network/Client Error]:', err);
      const errorMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: getLocalFallbackAiReply(lastUserPrompt),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    const freshMessages: AiChatMessage[] = [
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: 'Hello! How can I help you today?\n\nFeel free to ask any question or choose a quick shortcut below.',
        timestamp: Date.now(),
      },
    ];
    setMessages(freshMessages);
    localStorage.removeItem(userStorageKey);
  };

  const selectQuickPrompt = (promptText: string) => {
    setInputPrompt(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
      }, 50);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOnlyGreeting = messages.length <= 1;

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden relative select-text transition-colors duration-200 ${
      isDark ? 'bg-[#080B11] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Subtle Background Glows matching current accent */}
      <div 
        className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-300"
        style={{ 
          backgroundColor: currentAccent.hex, 
          opacity: isDark ? 0.12 : 0.08 
        }} 
      />
      <div 
        className="absolute bottom-20 left-10 w-80 h-80 rounded-full blur-[140px] pointer-events-none transition-all duration-300"
        style={{ 
          backgroundColor: currentAccent.hex, 
          opacity: isDark ? 0.08 : 0.05 
        }} 
      />

      {/* Top Header */}
      <header 
        className={`h-16 px-4 sm:px-6 backdrop-blur-xl flex items-center justify-between z-20 flex-shrink-0 border-b transition-colors duration-200 ${
          isDark ? 'bg-slate-950/85 border-slate-800/80' : 'bg-white/90 border-slate-200/90 shadow-sm'
        }`}
        style={{ borderBottomColor: currentAccent.border }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`p-2 -ml-2 rounded-xl transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Back to conversations"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Logo size="sm" variant="ai" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-sm sm:text-base font-bold tracking-wide ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                ERROREN AI
              </span>
            </div>
            <span 
              className={`text-[11px] font-medium flex items-center gap-1.5 ${
                isAiOnline ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <span 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isAiOnline 
                    ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)] ring-1 ring-emerald-400/50' 
                    : 'bg-slate-400 shadow-none'
                }`}
                title={isAiOnline ? 'Online' : 'Offline'}
              />
              {isAiOnline ? 'Online • Ready to assist' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWallpaperModal(true)}
            className={`p-2 rounded-xl border transition ${
              isDark 
                ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
            }`}
            style={{ color: currentAccent.textColor }}
            title="AI Chat Wallpaper"
          >
            <Palette className="w-4 h-4" />
          </button>

          {messages.length > 2 && (
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition disabled:opacity-40 ${
                isDark 
                  ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Regenerate Last Answer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Regenerate</span>
            </button>
          )}

          <button
            onClick={handleClear}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition ${
              isDark 
                ? 'bg-slate-900/90 hover:bg-rose-950/40 border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400' 
                : 'bg-slate-100 hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600'
            }`}
            title="Start New Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={getWallpaperStyles()}
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full relative ${getWallpaperClass()}`}
      >
        {/* Messages List */}
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3.5 ${isAi ? 'items-start' : 'items-start justify-end'}`}
            >
              {isAi && (
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border transition-all"
                  style={{
                    backgroundColor: currentAccent.softBg,
                    borderColor: currentAccent.border,
                    color: currentAccent.textColor
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative group max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 shadow-md transition-all ${
                  isAi
                    ? isDark 
                      ? 'bg-slate-900/95 text-slate-200 rounded-tl-sm' 
                      : 'bg-white text-slate-800 rounded-tl-sm shadow-sm'
                    : 'text-white rounded-tr-sm'
                }`}
                style={
                  isAi
                    ? {
                        border: `1px solid ${currentAccent.border}`,
                        boxShadow: isDark ? `0 0 15px ${currentAccent.hex}15` : '0 2px 8px rgba(0,0,0,0.06)',
                      }
                    : {
                        backgroundColor: currentAccent.hex,
                        color: currentAccent.foreground,
                        boxShadow: currentAccent.glowShadow,
                      }
                }
              >
                {/* Message Header for AI */}
                {isAi && (
                  <div className={`flex items-center justify-between pb-2 mb-2 border-b text-[11px] ${
                    isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}>
                    <div 
                      className="flex items-center gap-1.5 font-bold"
                      style={{ color: currentAccent.textColor }}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>ERROREN AI</span>
                    </div>
                    <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm leading-relaxed break-words markdown-content">
                  {isAi ? (
                    <div className={`space-y-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>

                {/* User Timestamp */}
                {!isAi && (
                  <div className="mt-1.5 text-right text-[10px] opacity-80 font-mono">
                    {formatTimestamp(msg.timestamp)}
                  </div>
                )}

                {/* AI Message Footer Actions */}
                {isAi && (
                  <div className={`mt-3 pt-2 border-t flex items-center justify-end text-[11px] ${
                    isDark ? 'border-slate-800/70 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}>
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition ${
                        isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'
                      }`}
                      style={{ color: currentAccent.textColor }}
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!isAi && (
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 border transition-all"
                  style={{
                    backgroundColor: currentAccent.softBg,
                    borderColor: currentAccent.border,
                    color: currentAccent.textColor
                  }}
                >
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* AI Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 sm:gap-3.5 items-start">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse border"
              style={{
                backgroundColor: currentAccent.softBg,
                borderColor: currentAccent.border,
                color: currentAccent.textColor
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div 
              className={`rounded-3xl rounded-tl-sm p-4 flex items-center gap-2.5 text-xs shadow-md border ${
                isDark ? 'bg-slate-900/95 text-slate-200' : 'bg-white text-slate-800'
              }`}
              style={{
                borderColor: currentAccent.border,
              }}
            >
              <Loader2 
                className="w-4 h-4 animate-spin" 
                style={{ color: currentAccent.hex }}
              />
              <span 
                className="font-medium animate-pulse"
                style={{ color: currentAccent.textColor }}
              >
                ERROREN AI is thinking...
              </span>
            </div>
          </div>
        )}

        {/* Quick Prompts Section in Empty / Initial State */}
        {isOnlyGreeting && (
          <div className="pt-2 pb-4">
            <div 
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: currentAccent.textColor }}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Quick Shortcuts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {quickPromptsList.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={i}
                    onClick={() => selectQuickPrompt(cat.prompt)}
                    className={`text-left p-3.5 rounded-2xl border text-xs transition group flex flex-col gap-1.5 shadow-sm ${
                      isDark 
                        ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 text-slate-200' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-2 font-bold transition"
                      style={{ color: currentAccent.textColor }}
                    >
                      <div 
                        className="w-6 h-6 rounded-lg flex items-center justify-center border"
                        style={{
                          backgroundColor: currentAccent.softBg,
                          borderColor: currentAccent.border,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span>{cat.label}</span>
                    </div>
                    <span className={`text-[11px] line-clamp-2 leading-relaxed ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {cat.prompt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 p-2.5 rounded-full text-white shadow-lg transition hover:scale-110 z-30"
          style={{
            backgroundColor: currentAccent.hex,
            boxShadow: currentAccent.glowShadow,
            color: currentAccent.foreground
          }}
          title="Scroll to latest"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Quick Prompts Scrollable Bar when conversation has history */}
      {!isOnlyGreeting && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-1 pb-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            <span 
              className="text-[10px] uppercase font-bold whitespace-nowrap mr-1 flex items-center gap-1"
              style={{ color: currentAccent.textColor }}
            >
              <Sparkles className="w-3 h-3" /> Shortcuts:
            </span>
            {quickPromptsList.map((cat, i) => (
              <button
                key={i}
                onClick={() => selectQuickPrompt(cat.prompt)}
                className={`whitespace-nowrap px-3 py-1 rounded-full border text-[11px] transition ${
                  isDark 
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300' 
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                style={{ borderColor: currentAccent.border }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom Message Composer */}
      <div 
        className={`p-3 sm:p-4 backdrop-blur-xl max-w-4xl mx-auto w-full flex-shrink-0 z-30 border-t transition-colors duration-200 ${
          isDark ? 'bg-slate-950/95 border-slate-800/90' : 'bg-white/95 border-slate-200'
        }`}
        style={{ borderTopColor: currentAccent.border }}
      >
        {/* Attachment & Shortcut Menu */}
        {showAttachMenu && (
          <div 
            className={`mb-2 p-2 rounded-2xl border shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
            style={{ borderColor: currentAccent.border }}
          >
            {quickPromptsList.slice(0, 4).map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    selectQuickPrompt(item.prompt);
                    setShowAttachMenu(false);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left transition text-xs ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon 
                    className="w-3.5 h-3.5" 
                    style={{ color: currentAccent.textColor }}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          {/* Plus / Attachment Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu((prev) => !prev)}
            className={`p-3 rounded-2xl border transition flex-shrink-0 ${
              showAttachMenu
                ? 'text-white'
                : isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            style={
              showAttachMenu
                ? {
                    backgroundColor: currentAccent.hex,
                    borderColor: currentAccent.hex,
                    color: currentAccent.foreground,
                  }
                : undefined
            }
            title="Shortcuts & Templates"
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Textarea Input Container */}
          <div 
            className={`flex-1 min-h-[46px] rounded-2xl px-3.5 py-2.5 transition flex items-center shadow-inner border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}
            style={{ borderColor: currentAccent.border }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputPrompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a message in any language..."
              className={`w-full bg-transparent text-sm focus:outline-none resize-none max-h-28 overflow-y-auto leading-relaxed ${
                isDark 
                  ? 'text-slate-100 placeholder:text-slate-500' 
                  : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none flex-shrink-0 flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: currentAccent.hex,
              color: currentAccent.foreground,
              boxShadow: currentAccent.glowShadow,
            }}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
      {/* Wallpaper Picker Modal for AI Chat */}
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        targetChatId="ai_chat"
        targetChatTitle="ERROREN AI"
      />
    </div>
  );
};
