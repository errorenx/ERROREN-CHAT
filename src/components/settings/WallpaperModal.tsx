import React, { useState, useRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { toast } from '../common/Toast';
import { POPULAR_WALLPAPERS_200, WallpaperItem } from '../../data/wallpapers';
import { 
  X, 
  Check, 
  Image as ImageIcon, 
  Upload, 
  RotateCcw, 
  Palette, 
  Sparkles,
  Layers,
  Lock,
  Eye,
  Search
} from 'lucide-react';

export interface WallpaperOption {
  id: string;
  name: string;
  category: string;
  className?: string;
  style?: React.CSSProperties;
  previewBg: string;
}

export const WALLPAPER_PRESETS = POPULAR_WALLPAPERS_200;

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetChatId?: string;
  targetChatTitle?: string;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  targetChatId,
  targetChatTitle,
}) => {
  const { 
    wallpaper, 
    setWallpaper, 
    customGalleryWallpaper, 
    setCustomGalleryWallpaper,
    setChatWallpaper,
    resetChatWallpaper,
    getEffectiveWallpaper,
    isDark
  } = useTheme();

  const currentActive = targetChatId ? getEffectiveWallpaper(targetChatId) : wallpaper;

  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(currentActive);
  const [activeCategory, setActiveCategory] = useState<'all' | 'whatsapp' | 'amoled' | 'cyberpunk' | 'nature' | 'abstract' | 'gallery'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewGalleryImage, setPreviewGalleryImage] = useState<string | null>(customGalleryWallpaper);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredWallpapers = useMemo(() => {
    return POPULAR_WALLPAPERS_200.filter((w) => {
      const matchCat = activeCategory === 'all' || w.category === activeCategory;
      const matchSearch = !searchQuery.trim() || w.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreviewGalleryImage(result);
        setSelectedWallpaper(`custom_gallery_${Date.now()}`);
        setActiveCategory('gallery');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = (scope: 'chat' | 'global') => {
    let finalValue = selectedWallpaper;

    if (selectedWallpaper.startsWith('custom_gallery_') && previewGalleryImage) {
      finalValue = previewGalleryImage;
      setCustomGalleryWallpaper(previewGalleryImage);
    }

    if (scope === 'chat' && targetChatId) {
      setChatWallpaper(targetChatId, finalValue);
    } else {
      setWallpaper(finalValue);
    }

    onClose();
  };

  const handleReset = () => {
    if (targetChatId) {
      resetChatWallpaper(targetChatId);
    } else {
      setWallpaper('cyber-mesh');
      setCustomGalleryWallpaper(null);
    }
    setSelectedWallpaper('cyber-mesh');
    onClose();
  };

  // Helper to render background for live preview box
  const getPreviewStyles = () => {
    if (selectedWallpaper.startsWith('custom_gallery_') && previewGalleryImage) {
      return {
        backgroundImage: `url(${previewGalleryImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (selectedWallpaper.startsWith('data:image')) {
      return {
        backgroundImage: `url(${selectedWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === selectedWallpaper);
    return preset ? undefined : undefined;
  };

  const getPreviewClassName = () => {
    if (selectedWallpaper.startsWith('custom_gallery_') || selectedWallpaper.startsWith('data:image')) {
      return '';
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === selectedWallpaper);
    return preset?.className || 'bg-[#070A0F]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0C1017] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Chat Wallpaper</h3>
              <p className="text-xs text-slate-400">
                {targetChatTitle ? `Setting wallpaper for "${targetChatTitle}"` : 'Customize your chat message background'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Live Preview & Selection Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Live Message Preview (5 cols on md) */}
          <div className="md:col-span-5 flex flex-col">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" /> Live Preview
            </span>

            <div
              className={`flex-1 min-h-[260px] rounded-2xl border border-slate-700/80 p-3.5 flex flex-col justify-between shadow-inner relative overflow-hidden transition-all duration-300 ${getPreviewClassName()}`}
              style={getPreviewStyles()}
            >
              {/* Optional Readability Overlay */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />

              {/* Encryption Banner Mock */}
              <div className="relative z-10 flex justify-center">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-black/60 border border-slate-700/60 text-slate-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" /> End-to-end encrypted
                </span>
              </div>

              {/* Mock Chat Bubbles */}
              <div className="relative z-10 space-y-2.5 my-auto">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-2.5 bg-slate-900/90 text-slate-200 border border-slate-800/80 text-xs shadow-md">
                    <p>Hey there! How does this wallpaper look?</p>
                    <span className="text-[9px] text-slate-400 block text-right mt-1">10:42 AM</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs p-2.5 bg-gradient-to-tr from-emerald-800 to-teal-800 text-white border border-emerald-500/30 text-xs shadow-md">
                    <p>It looks crystal clear and perfectly readable!</p>
                    <span className="text-[9px] text-emerald-200 block text-right mt-1">10:43 AM ✓✓</span>
                  </div>
                </div>
              </div>

              {/* Bottom composer mock */}
              <div className="relative z-10 bg-slate-950/80 border border-slate-800/80 rounded-xl p-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Write a message...</span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[10px]">Send</span>
              </div>
            </div>
          </div>

          {/* Right Column: Wallpaper Selector Tabs & Grid (7 cols on md) */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            {/* Search Input for 200 Wallpapers */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 200 popular wallpapers (e.g. WhatsApp, AMOLED, Neon)..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs overflow-x-auto no-scrollbar">
              {[
                { id: 'all' as const, label: `All (200)` },
                { id: 'whatsapp' as const, label: 'WhatsApp' },
                { id: 'amoled' as const, label: 'AMOLED' },
                { id: 'cyberpunk' as const, label: 'Cyber' },
                { id: 'nature' as const, label: 'Nature' },
                { id: 'abstract' as const, label: 'Luxe' },
                { id: 'gallery' as const, label: 'Upload' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap text-[11px] transition ${
                    activeCategory === cat.id
                      ? 'bg-slate-800 text-emerald-400 shadow font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 200 Popular Wallpapers Grid */}
            {activeCategory !== 'gallery' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Showing {filteredWallpapers.length} popular wallpapers</span>
                  <span className="text-emerald-400 font-mono">200 Total Library</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {filteredWallpapers.map((preset) => {
                    const isSelected = selectedWallpaper === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedWallpaper(preset.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 text-xs text-center transition group ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-full h-12 rounded-lg border flex items-center justify-center transition ${preset.previewBg} ${
                            isSelected ? 'shadow-md shadow-emerald-500/20' : ''
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <span className="font-medium text-[10px] truncate w-full">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gallery Upload View */}
            {activeCategory === 'gallery' && (
              <div className="space-y-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div className="text-xs text-slate-300">
                  Select any high-resolution photo or background from your local phone or computer storage.
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-2xl bg-slate-950/50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-white transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Choose Photo from Device / Gallery</span>
                  <span className="text-[10px] text-slate-500">Supports PNG, JPG, WebP up to 5MB</span>
                </button>

                {previewGalleryImage && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <img
                      src={previewGalleryImage}
                      alt="Selected wallpaper"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">Custom Photo Loaded</p>
                      <p className="text-[10px] text-emerald-400">Active in preview</p>
                    </div>
                    <button
                      onClick={() => {
                        setPreviewGalleryImage(null);
                        setSelectedWallpaper('cyber-mesh');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>

            {targetChatId && (
              <button
                onClick={() => handleApply('chat')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-bold transition"
              >
                Apply for This Chat
              </button>
            )}

            <button
              onClick={() => handleApply('global')}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Apply Wallpaper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
