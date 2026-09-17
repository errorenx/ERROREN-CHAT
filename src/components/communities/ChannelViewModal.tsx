import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ChannelPost, Community } from '../../types';
import { Avatar } from '../common/Avatar';
import { apiFetch } from '../../utils/api';
import { 
  fetchChannelPostsFromSupabase, 
  createChannelPostInSupabase, 
  isSupabaseConfigured 
} from '../../services/supabaseChat';
import { toast } from '../common/Toast';
import { 
  Megaphone, 
  X, 
  Send, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Heart, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  Lock, 
  Globe, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Share2,
  CheckCircle2,
  Smile,
  ThumbsUp
} from 'lucide-react';

interface ChannelViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  community: Community | null;
  currentUser: User | null;
  onChannelUpdated?: (channel: Channel) => void;
}

const WHATSAPP_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ChannelViewModal: React.FC<ChannelViewModalProps> = ({
  isOpen,
  onClose,
  channel,
  community,
  currentUser,
  onChannelUpdated,
}) => {
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showReactionPickerForPost, setShowReactionPickerForPost] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Check if current user is admin in this channel or community
  const isChannelAdmin = Boolean(
    currentUser && (
      channel?.creatorId === currentUser.id ||
      channel?.adminIds?.includes(currentUser.id) ||
      community?.creatorId === currentUser.id ||
      community?.adminIds?.includes(currentUser.id)
    )
  );

  const canPost = !channel?.isReadOnly || isChannelAdmin;

  useEffect(() => {
    if (!isOpen || !channel) return;

    // Check following status from local storage and channel
    const localFollows = JSON.parse(localStorage.getItem('followed_channels') || '[]');
    const isLocalFollowed = localFollows.includes(channel.id);
    const isChannelFollowed = Boolean(currentUser && channel.followerIds?.includes(currentUser.id));
    setIsFollowing(isLocalFollowed || isChannelFollowed);
    setFollowerCount(Math.max(channel.followerIds?.length || 0, isLocalFollowed ? 1 : 0));

    const fetchPosts = async () => {
      setIsLoading(true);
      let loadedPosts: ChannelPost[] = [];

      // 1. Try Supabase first
      if (isSupabaseConfigured()) {
        try {
          const sbPosts = await fetchChannelPostsFromSupabase(channel.id);
          if (sbPosts && sbPosts.length > 0) {
            loadedPosts = sbPosts;
          }
        } catch (err) {
          console.warn('[ChannelViewModal] Supabase fetchChannelPosts error:', err);
        }
      }

      // 2. Try backend API
      if (loadedPosts.length === 0) {
        try {
          const res = await apiFetch(`/api/channels/${channel.id}/posts`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              loadedPosts = data;
            }
          }
        } catch (err) {
          console.warn('[ChannelViewModal] API fetch notice:', err);
        }
      }

      // 3. Try LocalStorage cache
      if (loadedPosts.length === 0) {
        try {
          const cached = JSON.parse(localStorage.getItem(`channel_posts_${channel.id}`) || '[]');
          if (Array.isArray(cached) && cached.length > 0) {
            loadedPosts = cached;
          }
        } catch (e) {}
      }

      // If still empty and channel has default announcement, provide initial welcome post
      if (loadedPosts.length === 0) {
        loadedPosts = [
          {
            id: `welcome_${channel.id}`,
            channelId: channel.id,
            authorId: channel.creatorId,
            authorName: channel.name,
            authorAvatar: channel.avatarUrl,
            title: `Welcome to ${channel.name}!`,
            content: channel.description || 'Stay tuned for official updates, news, and announcements here. Reactions are open for all followers!',
            createdAt: channel.createdAt || Date.now(),
            likes: [],
          },
        ];
      }

      setPosts(loadedPosts);
      try {
        localStorage.setItem(`channel_posts_${channel.id}`, JSON.stringify(loadedPosts));
      } catch (e) {}
      setIsLoading(false);
    };

    fetchPosts();

    // Listen to WebSocket events for real-time posts
    const handleWsEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'channel:post:new' && data.channelId === channel.id) {
          setPosts((prev) => [data.post, ...prev.filter((p) => p.id !== data.post.id)]);
        } else if (data.type === 'channel:post:updated' && data.channelId === channel.id) {
          setPosts((prev) => prev.map((p) => (p.id === data.post.id ? data.post : p)));
        } else if (data.type === 'channel:post:deleted' && data.channelId === channel.id) {
          setPosts((prev) => prev.filter((p) => p.id !== data.postId));
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWsEvent);
    return () => window.removeEventListener('message', handleWsEvent);
  }, [isOpen, channel?.id, currentUser?.id]);

  if (!isOpen || !channel) return null;

  const handleToggleFollow = async () => {
    if (!currentUser) return;
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    setFollowerCount((prev) => nextFollowing ? prev + 1 : Math.max(0, prev - 1));

    // Update local storage
    try {
      const localFollows: string[] = JSON.parse(localStorage.getItem('followed_channels') || '[]');
      const updated = nextFollowing
        ? Array.from(new Set([...localFollows, channel.id]))
        : localFollows.filter((id) => id !== channel.id);
      localStorage.setItem('followed_channels', JSON.stringify(updated));
    } catch (e) {}

    if (nextFollowing) {
      toast.success('You are now following this WhatsApp channel!');
    } else {
      toast.info('Unfollowed channel');
    }

    // Try backend if running
    try {
      const endpoint = nextFollowing ? `/api/channels/${channel.id}/join` : `/api/channels/${channel.id}/leave`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onChannelUpdated) onChannelUpdated(data.channel);
      }
    } catch (e) {}
  };

  const handleCopyChannelLink = () => {
    const link = `${window.location.origin}/#channel/${channel.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success('Channel link copied to clipboard!');
    } else {
      toast.info(link);
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Media exceeds 15MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!postContent.trim() && !mediaUrl) || !currentUser) return;

    setIsPublishing(true);
    setError(null);

    const newPostPayload = {
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorAvatar: currentUser.avatarUrl,
      title: postTitle.trim() || undefined,
      content: postContent.trim(),
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? ('image' as const) : undefined,
      linkUrl: linkUrl.trim() || undefined,
    };

    let createdPost: ChannelPost | null = null;

    // 1. Supabase insert
    if (isSupabaseConfigured()) {
      try {
        createdPost = await createChannelPostInSupabase(channel.id, newPostPayload);
      } catch (err) {
        console.warn('[ChannelViewModal] Supabase createChannelPost error:', err);
      }
    }

    // 2. Fallback to API
    if (!createdPost) {
      try {
        const response = await apiFetch(`/api/channels/${channel.id}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPostPayload),
        });
        if (response.ok) {
          const data = await response.json();
          createdPost = data.post;
        }
      } catch (err) {}
    }

    // 3. Fallback to local
    if (!createdPost) {
      createdPost = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        channelId: channel.id,
        ...newPostPayload,
        createdAt: Date.now(),
        likes: [],
      };
    }

    const nextPosts = [createdPost, ...posts];
    setPosts(nextPosts);
    try {
      localStorage.setItem(`channel_posts_${channel.id}`, JSON.stringify(nextPosts));
    } catch (e) {}

    setPostTitle('');
    setPostContent('');
    setMediaUrl('');
    setLinkUrl('');
    setShowLinkInput(false);
    setIsPublishing(false);
    toast.success('Update published to channel!');
  };

  const handleEmojiReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    setShowReactionPickerForPost(null);

    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const currentLikes = p.likes || [];
          const reactionKey = `${currentUser.id}:${emoji}`;
          const hasThisEmoji = currentLikes.includes(reactionKey);
          
          let newLikes = currentLikes.filter((id) => !id.startsWith(`${currentUser.id}:`));
          if (!hasThisEmoji) {
            newLikes.push(reactionKey);
          }
          return { ...p, likes: newLikes };
        }
        return p;
      });
      try {
        localStorage.setItem(`channel_posts_${channel.id}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await apiFetch(`/api/channels/${channel.id}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: `${currentUser.id}:${emoji}` }),
      });
    } catch (err) {}
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this channel post?')) return;

    const nextPosts = posts.filter((p) => p.id !== postId);
    setPosts(nextPosts);
    try {
      localStorage.setItem(`channel_posts_${channel.id}`, JSON.stringify(nextPosts));
    } catch (e) {}

    try {
      await apiFetch(`/api/channels/${channel.id}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id }),
      });
    } catch (err) {}
    toast.info('Post deleted');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#0b141a] border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[90vh] text-slate-100 overflow-hidden font-sans"
        id="channel-view-modal"
      >
        {/* WhatsApp Channel Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/90 bg-[#111b21] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar
              src={channel.avatarUrl}
              name={channel.name}
              size="md"
              isGroup
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-white truncate flex items-center gap-1.5">
                  <span>{channel.name}</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-[#111b21] text-[10px] font-black" title="Verified WhatsApp Channel">
                    ✓
                  </span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-[10px] text-emerald-400 font-semibold border border-emerald-500/30">
                  Channel
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'} • WhatsApp Updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share Channel Button */}
            <button
              onClick={handleCopyChannelLink}
              className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800/60 transition"
              title="Share Channel Link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Follow/Unfollow Button */}
            {currentUser && (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                  isFollowing
                    ? 'bg-slate-800 text-slate-200 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Channel Privacy Banner */}
        <div className="px-4 py-2 bg-[#182229] border-b border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="truncate">
              Public channel • Your profile and identity are protected and not visible to other followers.
            </span>
          </div>
        </div>

        {/* Channel Description Banner */}
        {channel.description && (
          <div className="px-5 py-2.5 bg-[#111b21]/70 border-b border-slate-800/60 text-xs text-slate-300 flex items-center justify-between gap-2 flex-shrink-0">
            <span className="truncate">{channel.description}</span>
          </div>
        )}

        {/* Posts Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0b141a]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Loading channel updates...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Megaphone className="w-8 h-8 mx-auto text-slate-600 mb-1" />
              <p className="text-sm font-semibold text-slate-400">No updates in this channel yet</p>
              <p className="text-xs text-slate-500">
                {canPost
                  ? 'Send announcements and updates to your followers.'
                  : 'Updates from channel admins will appear here.'}
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isAuthor = currentUser && post.authorId === currentUser.id;
              const canDelete = isAuthor || isChannelAdmin;

              // Aggregate emoji reactions
              const reactionCounts: Record<string, number> = {};
              let myReaction: string | null = null;
              (post.likes || []).forEach((item) => {
                if (item.includes(':')) {
                  const [uId, emoji] = item.split(':');
                  reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                  if (currentUser && uId === currentUser.id) {
                    myReaction = emoji;
                  }
                } else {
                  reactionCounts['❤️'] = (reactionCounts['❤️'] || 0) + 1;
                  if (currentUser && item === currentUser.id) {
                    myReaction = '❤️';
                  }
                }
              });

              return (
                <div
                  key={post.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-slate-800/90 shadow-lg space-y-3 transition hover:border-slate-700"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={post.authorAvatar}
                        name={post.authorName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                          <span>{post.authorName}</span>
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-[#111b21] text-[9px] font-bold">✓</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Post Title */}
                  {post.title && (
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {post.title}
                    </h4>
                  )}

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {/* Media Attachment */}
                  {post.mediaUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-80 bg-black/40">
                      <img
                        src={post.mediaUrl}
                        alt="Channel Media"
                        className="w-full h-full object-contain max-h-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Link Attachment */}
                  {post.linkUrl && (
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-[#182229] border border-slate-800 text-xs text-emerald-400 hover:text-emerald-300 transition truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{post.linkUrl}</span>
                    </a>
                  )}

                  {/* WhatsApp Reactions Row */}
                  <div className="relative flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiReaction(post.id, emoji)}
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition ${
                            myReaction === emoji
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                              : 'bg-[#182229] border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{count}</span>
                        </button>
                      ))}

                      {/* Add Reaction Button */}
                      <button
                        onClick={() =>
                          setShowReactionPickerForPost(
                            showReactionPickerForPost === post.id ? null : post.id
                          )
                        }
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="React"
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      {/* Floating WhatsApp Reaction Picker */}
                      {showReactionPickerForPost === post.id && (
                        <div className="absolute bottom-10 left-0 bg-[#202c33] border border-slate-700 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-2xl z-20 animate-in fade-in zoom-in duration-150">
                          {WHATSAPP_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiReaction(post.id, emoji)}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCopyChannelLink}
                      className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 text-[11px]"
                      title="Forward Update"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Forward</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>

        {/* WhatsApp Channel Composer (Only for Admins) */}
        {canPost ? (
          <form
            onSubmit={handleCreatePost}
            className="p-3 sm:p-4 border-t border-slate-800/90 bg-[#111b21] space-y-2.5 flex-shrink-0"
          >
            {error && (
              <div className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-xl border border-rose-900/60">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Update title (optional)..."
                className="w-full px-3.5 py-1.5 rounded-xl bg-[#182229] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-start gap-2">
              <textarea
                rows={2}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Broadcast an update to followers..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#182229] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {/* Media Preview if uploaded */}
            {mediaUrl && (
              <div className="relative inline-block">
                <img
                  src={mediaUrl}
                  alt="Attachment Preview"
                  className="h-16 w-16 object-cover rounded-xl border border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Link Input field */}
            {showLinkInput && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/link..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#182229] border border-slate-800 text-xs text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLinkUrl('');
                    setShowLinkInput(false);
                  }}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-[#182229] border border-slate-800 text-slate-400 hover:text-emerald-400 transition"
                  title="Attach Photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="p-2 rounded-xl bg-[#182229] border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
                  title="Add Link"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={isPublishing || (!postContent.trim() && !mediaUrl)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-40 shadow-md shadow-emerald-500/20"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Broadcast Update</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 border-t border-slate-800 bg-[#111b21] text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>This is a WhatsApp broadcast channel. Only admins can send updates.</span>
          </div>
        )}
      </div>
    </div>
  );
};
