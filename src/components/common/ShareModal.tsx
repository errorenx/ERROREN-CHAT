import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Send, 
  Facebook, 
  Twitter, 
  Mail, 
  Smartphone,
  ExternalLink,
  Sparkles,
  QrCode
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { isDark, currentAccent } = useTheme();
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  // Resolve shareable URL
  const getShareUrl = () => {
    if (typeof window === 'undefined') return 'https://erroren.chat';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const base = origin + pathname;
    const cleanBase = base.endsWith('/') ? base : base + '/';
    if (currentUser?.username) {
      return `${cleanBase}?invite=@${currentUser.username}`;
    }
    return cleanBase;
  };

  const shareUrl = getShareUrl();
  const shareTitle = 'ERROREN CHAT - Fast, Secure & Private Messaging';
  const shareText = `Join me on ERROREN CHAT! Real-time messaging, status updates, calls, and AI assistant.${
    currentUser?.username ? ` My username is @${currentUser.username}.` : ''
  }\n${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Join me on ERROREN CHAT! Fast, secure real-time messaging.`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-400 text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Join me on ERROREN CHAT!')}`,
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'bg-slate-800 hover:bg-slate-700 text-white',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on ERROREN CHAT! ' + shareUrl)}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-500 text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-amber-600 hover:bg-amber-500 text-white',
      url: `mailto:?subject=${encodeURIComponent('Join ERROREN CHAT')}&body=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'SMS',
      icon: Smartphone,
      color: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      url: `sms:?body=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all transform animate-scale-up ${
          isDark 
            ? 'bg-slate-950 border-slate-800 text-slate-100 shadow-emerald-950/20' 
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/80'
        }`}
        id="modal-share-website"
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: `${currentAccent.hex}25`,
                color: currentAccent.hex,
              }}
            >
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Share Website</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Invite friends and share this link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Active User Card preview */}
          {currentUser && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{
                    backgroundColor: currentAccent.softBg,
                    color: currentAccent.textColor,
                  }}
                >
                  {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold">{currentUser.displayName}</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    @{currentUser.username || 'user'}
                  </div>
                </div>
              </div>
              <span 
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: currentAccent.softBg,
                  color: currentAccent.textColor,
                  borderColor: currentAccent.border,
                }}
              >
                Your Link
              </span>
            </div>
          )}

          {/* Copy Link Input Bar */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Website Link
            </label>
            <div className={`flex items-center gap-2 p-2 rounded-2xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs font-mono outline-none px-2 select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                  copied 
                    ? 'shadow-md' 
                    : isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                    : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                }`}
                style={
                  copied
                    ? {
                        backgroundColor: currentAccent.hex,
                        color: currentAccent.foreground,
                      }
                    : undefined
                }
                id="btn-copy-share-url"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Native Share button (if supported) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl font-bold text-xs transition shadow-lg"
              style={{
                backgroundColor: currentAccent.hex,
                color: currentAccent.foreground,
                boxShadow: currentAccent.glowShadow,
              }}
              id="btn-native-share"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via Device (WhatsApp, Insta, etc.)</span>
            </button>
          )}

          {/* Quick Social Share Buttons */}
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Quick Share To
            </div>
            <div className="grid grid-cols-3 gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-semibold transition ${social.color} shadow-sm`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{social.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* QR Code toggle */}
          <div className="pt-1">
            <button
              onClick={() => setShowQr(!showQr)}
              className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQr ? 'Hide QR Code' : 'Show QR Code'}</span>
            </button>

            {showQr && (
              <div className={`mt-2 p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
                  alt="QR Code for ERROREN CHAT"
                  className="w-40 h-40 rounded-xl bg-white p-2 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Scan with camera to open on mobile
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
