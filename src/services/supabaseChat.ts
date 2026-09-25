/**
 * ERROREN CHAT - Supabase Realtime & Persistent Database Service
 * Provides WhatsApp-style phone lookup, permanent contact relationships,
 * offline message delivery, read receipts, and real-time subscriptions.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
export { isSupabaseConfigured };
import { User, Contact, Chat, Message, Community, StatusStory, Channel, ChannelPost, CallLog } from '../types';
import { getPhoneLookupVariants, normalizePhoneNumber, isPhoneMatch } from '../utils/phoneUtils';
import { isTestUser } from '../utils/testFilter';

export function logSupabaseError(operation: string, table: string, error: any) {
  if (!error) return;
  console.error(`[Supabase Error] Operation: "${operation}" | Table: "${table}"`, {
    message: error.message || String(error),
    code: error.code || 'UNKNOWN',
    details: error.details || null,
    hint: error.hint || null,
  });
}

export interface PhoneLookupResult {
  registered: boolean;
  user?: User;
  isSelf?: boolean;
  message?: string;
  error?: string;
}

export interface UsernameLookupResult {
  registered: boolean;
  user?: User;
  isSelf?: boolean;
  message?: string;
  error?: string;
}

// ==============================================================================
// 1. PROFILES & USERNAME / PHONE LOOKUP
// ==============================================================================

/**
 * Searches Supabase for an existing registered ERROREN CHAT user with the given username.
 * If user exists on website, returns user profile; otherwise returns registered: false ("Available not found").
 */
export async function findUserByUsername(
  rawUsername: string,
  currentUserId?: string
): Promise<UsernameLookupResult> {
  const clean = rawUsername.trim().toLowerCase().replace(/^@/, '');
  if (!clean || clean.length < 3) {
    return { registered: false, error: 'Username must be at least 3 characters.' };
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .ilike('username', clean)
        .limit(1);

      if (!error && data && data.length > 0) {
        const user = mapProfileToUser(data[0]);
        if (isTestUser(user)) {
          return {
            registered: false,
            message: 'Available nhi hy (Is username pr koi account nhi bna huwa).',
          };
        }
        const isSelf = currentUserId ? user.id === currentUserId : false;
        return {
          registered: true,
          user,
          isSelf,
          message: isSelf ? 'This is your own username.' : `ERROREN CHAT user found: @${user.username}`,
        };
      }
    } catch (err: any) {
      console.warn('[Supabase] findUserByUsername query error:', err);
    }
  }

  // Fallback: Check local storage cached registered users
  try {
    const localUsers: User[] = JSON.parse(localStorage.getItem('erroren_all_users') || '[]');
    const matched = localUsers.find(
      (u) => (u.username || '').toLowerCase().replace(/^@/, '') === clean && !isTestUser(u)
    );
    if (matched) {
      const isSelf = currentUserId ? matched.id === currentUserId : false;
      return {
        registered: true,
        user: matched,
        isSelf,
        message: isSelf ? 'This is your own username.' : `ERROREN CHAT user found: @${matched.username}`,
      };
    }
  } catch {}

  // Fallback: Check saved accounts
  try {
    const saved: User[] = JSON.parse(localStorage.getItem('erroren_saved_accounts') || '[]');
    const matched = saved.find(
      (u) => (u.username || '').toLowerCase().replace(/^@/, '') === clean
    );
    if (matched) {
      const isSelf = currentUserId ? matched.id === currentUserId : false;
      return {
        registered: true,
        user: matched,
        isSelf,
        message: isSelf ? 'This is your own username.' : `ERROREN CHAT user found: @${matched.username}`,
      };
    }
  } catch {}

  // Fallback: Check server /api/users
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const serverUsers: User[] = await res.json();
      if (Array.isArray(serverUsers)) {
        const matched = serverUsers.find(
          (u) => (u.username || '').toLowerCase().replace(/^@/, '') === clean
        );
        if (matched) {
          const isSelf = currentUserId ? matched.id === currentUserId : false;
          return {
            registered: true,
            user: matched,
            isSelf,
            message: isSelf ? 'This is your own username.' : `ERROREN CHAT user found: @${matched.username}`,
          };
        }
      }
    }
  } catch {}

  return {
    registered: false,
    message: 'Available not found (No account exists with this username on ERROREN CHAT).',
  };
}

/**
 * Searches Supabase for an existing registered ERROREN CHAT user with the given phone number.
 * Uses comprehensive phone variants (local 03xx, international +92, E.164, raw digits).
 */
export async function findUserByPhone(
  rawPhone: string,
  currentUserId?: string
): Promise<PhoneLookupResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { registered: false, error: 'Supabase is not configured.' };
  }

  const clean = rawPhone.trim().replace(/[^0-9]/g, '');
  if (clean.length < 7) {
    return { registered: false, error: 'Please enter a valid phone number (at least 7 digits).' };
  }

  try {
    const variants = getPhoneLookupVariants(rawPhone);

    // Search profiles by phone or phone_normalized in variants
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(
        `phone.in.(${variants.map((v) => `"${v}"`).join(',')}),phone_normalized.in.(${variants.map((v) => `"${v}"`).join(',')})`
      )
      .limit(10);

    if (error) {
      console.warn('[Supabase] Phone lookup query error:', error);
      // Fallback: try direct text matching or iterating
      const { data: allProfiles } = await client.from('profiles').select('*').limit(200);
      if (allProfiles && allProfiles.length > 0) {
        const matched = allProfiles.find(
          (p: any) =>
            (p.phone && isPhoneMatch(p.phone, rawPhone)) ||
            (p.phone_normalized && isPhoneMatch(p.phone_normalized, rawPhone))
        );
        if (matched) {
          const user = mapProfileToUser(matched);
          if (isTestUser(user)) {
            return { registered: false, message: 'This number is not registered on ERROREN CHAT.' };
          }
          const isSelf = currentUserId ? matched.id === currentUserId : false;
          return {
            registered: true,
            user,
            isSelf,
            message: isSelf
              ? 'This is your own registered phone number.'
              : `ERROREN CHAT user found: ${user.displayName}`,
          };
        }
      }
      return { registered: false, message: 'This number is not registered on ERROREN CHAT.' };
    }

    if (data && data.length > 0) {
      // Pick best match
      const matched = data[0];
      const user = mapProfileToUser(matched);
      if (isTestUser(user)) {
        return { registered: false, message: 'This number is not registered on ERROREN CHAT.' };
      }
      const isSelf = currentUserId ? matched.id === currentUserId : false;

      return {
        registered: true,
        user,
        isSelf,
        message: isSelf
          ? 'This is your own registered phone number.'
          : `ERROREN CHAT user found: ${user.displayName}`,
      };
    }

    return {
      registered: false,
      message: 'This number is not registered on ERROREN CHAT.',
    };
  } catch (err: any) {
    console.error('[Supabase] findUserByPhone exception:', err);
    return { registered: false, error: err.message || 'Error checking phone registration.' };
  }
}

/**
 * Upserts a user's profile record in the Supabase `profiles` table.
 * Enforces phone normalization and uniqueness.
 */
export async function upsertUserProfile(user: Partial<User>): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client || !user.id) return null;

  const rawPhone = user.phoneNumber?.trim() || null;
  const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone, user.countryCode || '+92') : null;

  const profilePayload: any = {
    id: user.id,
    email: user.email?.trim().toLowerCase() || null,
    username: user.username?.trim().toLowerCase() || null,
    phone: rawPhone,
    phone_normalized: normalizedPhone,
    country_code: user.countryCode || '+92',
    display_name: user.displayName?.trim() || 'Member',
    avatar_url: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
    bio: user.about || 'Available | Using ERROREN CHAT ⚡',
    is_online: user.isOnline ?? true,
    last_seen: new Date().toISOString(),
    role: user.role || 'user',
    is_profile_complete: user.isProfileComplete ?? (user.profileCompleted ?? true),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Profile upsert error:', error);
      return null;
    }

    return mapProfileToUser(data);
  } catch (e) {
    console.error('[Supabase] upsertUserProfile exception:', e);
    return null;
  }
}

export async function fetchProfileById(userId: string): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapProfileToUser(data);
  } catch (e) {
    console.warn('[Supabase] fetchProfileById error:', e);
    return null;
  }
}

export async function fetchAllRegisteredProfiles(): Promise<User[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('display_name', { ascending: true })
      .limit(200);

    if (error || !data) return [];
    return data.map(mapProfileToUser).filter((u) => !isTestUser(u));
  } catch {
    return [];
  }
}

export async function updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    await client
      .from('profiles')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (e) {
    console.warn('[Supabase] updateOnlineStatus error:', e);
  }
}

// ==============================================================================
// 2. WHATSAPP-STYLE CONTACT RELATIONSHIPS
// ==============================================================================

/**
 * Creates or updates a permanent contact relationship in the Supabase `contacts` table.
 * Prevents duplicates via unique constraint.
 */
export async function addContactToSupabase(
  ownerUserId: string,
  contactUser: User,
  customName?: string,
  avatarUrl?: string,
  about?: string
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (ownerUserId === contactUser.id) {
    return { success: false, error: 'You cannot add yourself as a contact.' };
  }

  try {
    const contactPayload = {
      owner_user_id: ownerUserId,
      contact_user_id: contactUser.id,
      name: customName?.trim() || contactUser.displayName,
      phone: contactUser.phoneNumber || '',
      avatar_url: avatarUrl || contactUser.avatarUrl,
      about: about || contactUser.about || 'Available | Using ERROREN CHAT ⚡',
      status: 'accepted',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('contacts')
      .upsert(contactPayload, { onConflict: 'owner_user_id,contact_user_id' })
      .select('*, profile:contact_user_id(*)')
      .single();

    if (error) {
      console.warn('[Supabase] addContact error:', error);
      return { success: false, error: error.message };
    }

    const savedContact: Contact = {
      id: data.id,
      ownerUserId: data.owner_user_id,
      contactUserId: data.contact_user_id,
      name: data.name,
      phoneNumber: data.phone,
      avatarUrl: data.avatar_url || data.profile?.avatar_url,
      about: data.about || data.profile?.bio,
      isOnline: Boolean(data.profile?.is_online),
      lastSeen: data.profile?.last_seen ? new Date(data.profile.last_seen).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
    };

    return { success: true, contact: savedContact };
  } catch (err: any) {
    console.error('[Supabase] addContact exception:', err);
    return { success: false, error: err.message || 'Failed to save contact.' };
  }
}

/**
 * Fetches all saved contacts for the specified user from Supabase.
 * Joins with `profiles` so live status, last seen, and profile pictures are always current.
 */
export async function getContactsFromSupabase(ownerUserId: string): Promise<Contact[]> {
  const client = getSupabaseClient();
  if (!client || !ownerUserId) return [];

  try {
    const { data, error } = await client
      .from('contacts')
      .select('*, profile:contact_user_id(*)')
      .eq('owner_user_id', ownerUserId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[Supabase] getContacts error:', error);
      return [];
    }

    return data.map((c: any) => ({
      id: c.id,
      ownerUserId: c.owner_user_id,
      contactUserId: c.contact_user_id,
      name: c.name,
      phoneNumber: c.phone || c.profile?.phone || '',
      avatarUrl: c.avatar_url || c.profile?.avatar_url,
      about: c.about || c.profile?.bio,
      isOnline: Boolean(c.profile?.is_online),
      lastSeen: c.profile?.last_seen ? new Date(c.profile.last_seen).getTime() : undefined,
      isBlocked: c.status === 'blocked',
      createdAt: new Date(c.created_at).getTime(),
    }));
  } catch (err) {
    console.error('[Supabase] getContacts exception:', err);
    return [];
  }
}

export async function deleteContactFromSupabase(ownerUserId: string, contactId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('contacts')
      .delete()
      .eq('owner_user_id', ownerUserId)
      .or(`id.eq.${contactId},contact_user_id.eq.${contactId}`);

    return !error;
  } catch (e) {
    console.warn('[Supabase] deleteContact error:', e);
    return false;
  }
}

// ==============================================================================
// 3. CHATS & CONVERSATIONS
// ==============================================================================

/**
 * Finds an existing direct chat between two users, or creates a new one.
 * Guarantees that only ONE direct conversation exists between userA and userB.
 */
export async function getOrCreateDirectChatInSupabase(
  userA: User,
  userB: User
): Promise<{ chat: Chat; isNew: boolean } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Check if direct chat already exists between userA and userB
    // Find chat_ids where userA is member
    const { data: userAChats, error: errA } = await client
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userA.id);

    if (!errA && userAChats && userAChats.length > 0) {
      const chatIds = userAChats.map((c) => c.chat_id);

      // Check which of these chats userB also belongs to, and is direct
      const { data: sharedChats, error: errShared } = await client
        .from('chat_members')
        .select('chat_id, chat:chat_id(*)')
        .eq('user_id', userB.id)
        .in('chat_id', chatIds);

      if (!errShared && sharedChats && sharedChats.length > 0) {
        for (const item of sharedChats) {
          const chatData = item.chat as any;
          if (chatData && chatData.type === 'direct') {
            // Found existing direct chat!
            return {
              chat: {
                id: chatData.id,
                isGroup: false,
                title: userB.displayName,
                name: userB.displayName,
                avatarUrl: userB.avatarUrl,
                participantIds: [userA.id, userB.id],
                memberIds: [userA.id, userB.id],
                unreadCount: 0,
                createdAt: new Date(chatData.created_at).getTime(),
                updatedAt: new Date(chatData.updated_at).getTime(),
              },
              isNew: false,
            };
          }
        }
      }
    }

    // 2. If no direct chat exists, create a new one!
    const { data: newChat, error: createErr } = await client
      .from('chats')
      .insert({
        type: 'direct',
        name: `${userA.displayName} & ${userB.displayName}`,
        created_by: userA.id,
      })
      .select()
      .single();

    if (createErr || !newChat) {
      console.warn('[Supabase] Failed to create direct chat:', createErr);
      return null;
    }

    // 3. Add both users to chat_members
    await client.from('chat_members').insert([
      { chat_id: newChat.id, user_id: userA.id, role: 'member' },
      { chat_id: newChat.id, user_id: userB.id, role: 'member' },
    ]);

    return {
      chat: {
        id: newChat.id,
        isGroup: false,
        title: userB.displayName,
        name: userB.displayName,
        avatarUrl: userB.avatarUrl,
        participantIds: [userA.id, userB.id],
        memberIds: [userA.id, userB.id],
        unreadCount: 0,
        createdAt: new Date(newChat.created_at).getTime(),
        updatedAt: new Date(newChat.updated_at).getTime(),
      },
      isNew: true,
    };
  } catch (err) {
    console.error('[Supabase] getOrCreateDirectChat exception:', err);
    return null;
  }
}

/**
 * Fetches all chats in which the user is a participant.
 */
export async function fetchUserChatsFromSupabase(userId: string): Promise<Chat[]> {
  const client = getSupabaseClient();
  if (!client || !userId) return [];

  try {
    const { data: memberRows, error: mErr } = await client
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (mErr || !memberRows || memberRows.length === 0) return [];
    const chatIds = memberRows.map((r) => r.chat_id);

    const { data: chatData, error: cErr } = await client
      .from('chats')
      .select('*, chat_members(user_id, role, profile:user_id(*))')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (cErr || !chatData) return [];

    return chatData.map((c: any) => {
      const members = c.chat_members || [];
      const participantIds = members.map((m: any) => m.user_id);
      const otherMember = members.find((m: any) => m.user_id !== userId);
      const partnerProfile = otherMember?.profile;
      const isGroup = c.type === 'group';
      const title = isGroup ? c.name : (partnerProfile?.display_name || c.name || 'Direct Chat');
      const avatarUrl = isGroup ? c.avatar_url : (partnerProfile?.avatar_url || c.avatar_url);

      return {
        id: c.id,
        isGroup,
        title,
        name: title,
        avatarUrl,
        participantIds,
        memberIds: participantIds,
        unreadCount: 0,
        createdAt: new Date(c.created_at).getTime(),
        updatedAt: new Date(c.updated_at).getTime(),
      };
    });
  } catch (err) {
    console.error('[Supabase] fetchUserChatsFromSupabase exception:', err);
    return [];
  }
}

/**
 * Creates a new group conversation in Supabase with chat_members.
 */
export async function createGroupInSupabase(group: {
  name: string;
  description?: string;
  avatarUrl?: string;
  creatorId: string;
  memberIds: string[];
}): Promise<Chat | null> {
  const client = getSupabaseClient();
  const id = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const avatarUrl = group.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.name)}`;
  const allMembers = Array.from(new Set([group.creatorId, ...group.memberIds]));

  const localGroup: Chat = {
    id,
    title: group.name,
    name: group.name,
    description: group.description,
    avatarUrl,
    isGroup: true,
    creatorId: group.creatorId,
    participantIds: allMembers,
    memberIds: allMembers,
    adminIds: [group.creatorId],
    unreadCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!client) return localGroup;

  try {
    const { data: newChat, error: cErr } = await client
      .from('chats')
      .insert({
        id,
        type: 'group',
        name: group.name,
        description: group.description || null,
        avatar_url: avatarUrl,
        created_by: group.creatorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (cErr) {
      logSupabaseError('createGroupInSupabase', 'chats', cErr);
      return localGroup;
    }

    // Insert members
    const memberRows = allMembers.map((uid) => ({
      chat_id: newChat.id,
      user_id: uid,
      role: uid === group.creatorId ? 'owner' : 'member',
    }));

    const { error: mErr } = await client.from('chat_members').insert(memberRows);
    if (mErr) {
      logSupabaseError('createGroupInSupabase (members)', 'chat_members', mErr);
    }

    return {
      ...localGroup,
      id: newChat.id,
      createdAt: new Date(newChat.created_at).getTime(),
      updatedAt: new Date(newChat.updated_at).getTime(),
    };
  } catch (err: any) {
    console.error('[Supabase] createGroupInSupabase exception:', err);
    return localGroup;
  }
}

/**
 * Deletes or leaves a chat in Supabase.
 */
export async function deleteChatFromSupabase(chatId: string, userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !chatId) return true;
  try {
    // Delete membership first
    await client.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', userId);
    return true;
  } catch (err) {
    console.warn('[Supabase] deleteChatFromSupabase error:', err);
    return true;
  }
}

// ==============================================================================
// 4. MESSAGES & PERSISTENCE
// ==============================================================================

/**
 * Fetches messages for a chat from Supabase, ordered chronologically.
 */
export async function fetchChatMessagesFromSupabase(chatId: string, limit = 100): Promise<Message[]> {
  const client = getSupabaseClient();
  if (!client || !chatId) return [];

  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !data) {
      console.warn('[Supabase] fetchChatMessages error:', error);
      return [];
    }

    return data.map(mapRowToMessage);
  } catch (e) {
    console.error('[Supabase] fetchChatMessages exception:', e);
    return [];
  }
}

/**
 * Inserts a new message into Supabase.
 * Delivered in real-time to active listeners, and permanently saved for offline users.
 */
export async function sendMessageToSupabase(message: Message): Promise<Message | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const payload = {
      id: message.id,
      chat_id: message.chatId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_avatar: message.senderAvatar,
      content: message.content,
      type: message.type || 'text',
      media_url: message.mediaUrl,
      file_name: message.fileName,
      file_size: message.fileSize ? String(message.fileSize) : null,
      status: message.status || 'sent',
      reactions: message.reactions || [],
      reply_to: message.replyTo || null,
      created_at: new Date(message.timestamp).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] sendMessage error:', error);
      return null;
    }

    // Update chat updated_at
    await client
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.chatId);

    return mapRowToMessage(data);
  } catch (e) {
    console.error('[Supabase] sendMessage exception:', e);
    return null;
  }
}

/**
 * Marks unread messages in a chat as read by the current user.
 */
export async function markChatMessagesAsReadInSupabase(chatId: string, currentUserId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !chatId || !currentUserId) return;

  try {
    // 1. Update message status to read
    await client
      .from('messages')
      .update({ status: 'read', updated_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .neq('sender_id', currentUserId)
      .neq('status', 'read');

    // 2. Update member last_read_at
    await client
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', currentUserId);
  } catch (e) {
    console.warn('[Supabase] markChatMessagesAsRead error:', e);
  }
}

/**
 * Updates a message in Supabase (reactions, edits, status).
 */
export async function updateMessageInSupabase(messageId: string, updates: Partial<Message>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !messageId) return false;
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.reactions !== undefined) payload.reactions = updates.reactions;

    const { error } = await client.from('messages').update(payload).eq('id', messageId);
    if (error) {
      logSupabaseError('updateMessageInSupabase', 'messages', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] updateMessage exception:', e);
    return false;
  }
}

/**
 * Deletes a message in Supabase.
 */
export async function deleteMessageInSupabase(messageId: string, _forEveryone: boolean = true): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !messageId) return false;
  try {
    const { error } = await client.from('messages').delete().eq('id', messageId);
    if (error) {
      logSupabaseError('deleteMessageInSupabase', 'messages', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] deleteMessage exception:', e);
    return false;
  }
}

export { deleteStatusStoryFromSupabase as deleteStatusFromSupabase };

// ==============================================================================
// 5. REAL-TIME SUBSCRIPTIONS
// ==============================================================================

/**
 * Subscribes to new messages and message updates in real time for a chat.
 */
export function subscribeToChatMessages(
  chatId: string,
  onNewMessage: (msg: Message) => void,
  onMessageUpdate?: (msg: Message) => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !chatId) return () => {};

  const channel = client
    .channel(`chat_messages_${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(mapRowToMessage(payload.new));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        if (payload.new && onMessageUpdate) {
          onMessageUpdate(mapRowToMessage(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Subscribes to profile presence changes (online / last_seen) across all users.
 */
export function subscribeToPresence(
  onPresenceChange: (userId: string, isOnline: boolean, lastSeen: number) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('public_profiles_presence')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      (payload) => {
        if (payload.new) {
          const p = payload.new;
          const lastSeenTime = p.last_seen ? new Date(p.last_seen).getTime() : Date.now();
          onPresenceChange(p.id, Boolean(p.is_online), lastSeenTime);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// ==============================================================================
// HELPERS & MAPPERS
// ==============================================================================

function mapProfileToUser(p: any): User {
  const isComplete = Boolean(
    p.is_profile_complete ||
    p.profile_completed ||
    (p.phone && p.email && p.username && p.display_name && p.display_name !== 'New Member')
  );

  return {
    id: p.id,
    email: p.email || '',
    username: p.username,
    displayName: p.display_name || p.username || 'Member',
    phoneNumber: p.phone,
    countryCode: p.country_code || '+92',
    avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`,
    about: p.bio || 'Available | Using ERROREN CHAT ⚡',
    isOnline: Boolean(p.is_online),
    lastSeen: p.last_seen ? new Date(p.last_seen).getTime() : Date.now(),
    role: p.role === 'admin' ? 'admin' : 'user',
    isProfileComplete: isComplete,
    profileCompleted: isComplete,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

// ==============================================================================
// 6. COMMUNITIES
// ==============================================================================

export async function createCommunityInSupabase(comm: {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  creatorId: string;
}): Promise<Community | null> {
  const newCommunity: Community = {
    id: comm.id,
    name: comm.name,
    description: comm.description,
    avatarUrl: comm.avatarUrl,
    creatorId: comm.creatorId,
    members: [{ userId: comm.creatorId, role: 'owner', joinedAt: Date.now() }],
    adminIds: [comm.creatorId],
    groupIds: [],
    channelIds: [],
    inviteCode: `err_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memberCount: 1,
    isJoined: true,
  };

  // 1. Sync to backend /api/communities to persist in server and broadcast
  try {
    const res = await fetch('/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: comm.id,
        name: comm.name,
        description: comm.description,
        avatarUrl: comm.avatarUrl,
        creatorId: comm.creatorId,
        isPublic: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.community) {
        Object.assign(newCommunity, data.community);
      }
    }
  } catch (err) {
    console.warn('[Community API] Backend createCommunity sync error:', err);
  }

  // 2. Also try Supabase if configured
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('communities').insert({
        id: comm.id,
        name: comm.name,
        description: comm.description,
        avatar_url: comm.avatarUrl,
        creator_id: comm.creatorId,
        member_count: 1,
        is_public: true,
        invite_code: newCommunity.inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await client.from('community_members').insert({
        community_id: comm.id,
        user_id: comm.creatorId,
        role: 'owner',
      });
    } catch (e) {
      console.warn('[Supabase] createCommunity error:', e);
    }
  }

  return newCommunity;
}

export async function fetchCommunitiesFromSupabase(userId?: string): Promise<Community[]> {
  const commMap = new Map<string, Community>();

  // 1. Try Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        let userJoinedCommIds = new Set<string>();
        if (userId) {
          const { data: memberRows } = await client
            .from('community_members')
            .select('community_id')
            .eq('user_id', userId);

          if (memberRows) {
            memberRows.forEach((r: any) => userJoinedCommIds.add(r.community_id));
          }
        }

        data.forEach((c: any) => {
          commMap.set(c.id, {
            id: c.id,
            name: c.name,
            description: c.description || '',
            avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.name)}`,
            creatorId: c.creator_id,
            members: [],
            adminIds: [c.creator_id],
            groupIds: [],
            channelIds: [],
            inviteCode: c.invite_code || c.id.substring(0, 8),
            isPublic: Boolean(c.is_public ?? true),
            createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
            updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
            memberCount: c.member_count || 1,
            isJoined: userId ? userJoinedCommIds.has(c.id) : false,
          });
        });
      }
    } catch (err) {
      console.warn('[Supabase] fetchCommunities error:', err);
    }
  }

  // 2. Fetch from Backend /api/communities and merge
  try {
    const url = userId ? `/api/communities?userId=${userId}` : '/api/communities';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((c: Community) => {
          if (!commMap.has(c.id)) {
            commMap.set(c.id, c);
          } else {
            const existing = commMap.get(c.id)!;
            commMap.set(c.id, {
              ...existing,
              isJoined: c.isJoined || existing.isJoined,
              memberCount: Math.max(c.memberCount || 1, existing.memberCount || 1),
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Community API] fetchCommunities server error:', err);
  }

  return Array.from(commMap.values());
}

export async function joinCommunityInSupabase(communityId: string, userId: string): Promise<boolean> {
  // Sync to server backend
  try {
    await fetch(`/api/communities/${communityId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
    console.warn('[Community API] joinCommunity backend sync:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('community_members').upsert({
      community_id: communityId,
      user_id: userId,
      role: 'member',
    }, { onConflict: 'community_id,user_id' });

    // increment count
    const { data } = await client.from('communities').select('member_count').eq('id', communityId).single();
    if (data) {
      await client.from('communities').update({
        member_count: (data.member_count || 1) + 1,
      }).eq('id', communityId);
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] joinCommunity error:', e);
    return true;
  }
}

export async function leaveCommunityInSupabase(communityId: string, userId: string): Promise<boolean> {
  // Sync to server backend
  try {
    await fetch(`/api/communities/${communityId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
    console.warn('[Community API] leaveCommunity backend sync:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);

    const { data } = await client.from('communities').select('member_count').eq('id', communityId).single();
    if (data && data.member_count > 1) {
      await client.from('communities').update({
        member_count: data.member_count - 1,
      }).eq('id', communityId);
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] leaveCommunity error:', e);
    return true;
  }
}

export async function addCommunityMemberInSupabase(
  communityId: string,
  userId: string,
  role: 'member' | 'admin' | 'moderator' = 'member'
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;
  try {
    const { error } = await client.from('community_members').upsert({
      community_id: communityId,
      user_id: userId,
      role,
    }, { onConflict: 'community_id,user_id' });
    if (error) logSupabaseError('addCommunityMemberInSupabase', 'community_members', error);
    return !error;
  } catch (e) {
    console.error('[Supabase] addCommunityMember exception:', e);
    return false;
  }
}

export async function removeCommunityMemberInSupabase(communityId: string, userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;
  try {
    const { error } = await client.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
    if (error) logSupabaseError('removeCommunityMemberInSupabase', 'community_members', error);
    return !error;
  } catch (e) {
    console.error('[Supabase] removeCommunityMember exception:', e);
    return false;
  }
}

export async function updateCommunityMemberRoleInSupabase(communityId: string, userId: string, role: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;
  try {
    const { error } = await client.from('community_members').update({ role }).eq('community_id', communityId).eq('user_id', userId);
    if (error) logSupabaseError('updateCommunityMemberRoleInSupabase', 'community_members', error);
    return !error;
  } catch (e) {
    console.error('[Supabase] updateCommunityMemberRole exception:', e);
    return false;
  }
}

export async function updateCommunityInSupabase(communityId: string, updates: Partial<Community>): Promise<boolean> {
  // Sync to server backend
  try {
    await fetch(`/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn('[Community API] updateCommunity server sync:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.avatarUrl) payload.avatar_url = updates.avatarUrl;
    if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;

    const { error } = await client.from('communities').update(payload).eq('id', communityId);
    if (error) logSupabaseError('updateCommunityInSupabase', 'communities', error);
    return !error;
  } catch (e) {
    console.error('[Supabase] updateCommunity exception:', e);
    return false;
  }
}

export async function deleteCommunityInSupabase(communityId: string): Promise<boolean> {
  // Sync to server backend
  try {
    await fetch(`/api/communities/${communityId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[Community API] deleteCommunity server sync:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;
  try {
    const { error } = await client.from('communities').delete().eq('id', communityId);
    if (error) logSupabaseError('deleteCommunityInSupabase', 'communities', error);
    return !error;
  } catch (e) {
    console.error('[Supabase] deleteCommunity exception:', e);
    return false;
  }
}

export async function getCommunityByInviteCode(code: string): Promise<Community | null> {
  const cleanCode = (code || '').trim();
  if (!cleanCode) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('communities')
        .select('*')
        .or(`invite_code.ilike.${cleanCode.toUpperCase()},id.ilike.${cleanCode}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const c = data[0];
        return {
          id: c.id,
          name: c.name,
          description: c.description || '',
          avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.name}`,
          creatorId: c.creator_id,
          members: [],
          adminIds: [c.creator_id],
          groupIds: [],
          channelIds: [],
          inviteCode: c.invite_code || c.id.substring(0, 8),
          isPublic: Boolean(c.is_public ?? true),
          createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
          updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
          memberCount: c.member_count || 1,
          isJoined: false,
        };
      }
    } catch (e) {
      console.error('[Supabase] getCommunityByInviteCode exception:', e);
    }
  }

  // Fallback to server API /api/invites/:inviteCode
  try {
    const res = await fetch(`/api/invites/${encodeURIComponent(cleanCode)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.community) {
        return data.community;
      }
    }
  } catch (err) {
    console.warn('[Community Invite Lookup] Server fetch error:', err);
  }

  return null;
}

export async function fetchCommunityByIdFromSupabase(communityId: string, currentUserId?: string): Promise<Community | null> {
  if (!communityId) return null;

  const client = getSupabaseClient();
  let communityFromSupabase: Community | null = null;

  if (client) {
    try {
      const { data: c, error } = await client.from('communities').select('*').eq('id', communityId).single();
      if (!error && c) {
        // Fetch members
        const { data: memberRows } = await client
          .from('community_members')
          .select('user_id, role, created_at, profile:user_id(*)')
          .eq('community_id', communityId);

        const members = (memberRows || []).map((m: any) => ({
          userId: m.user_id,
          role: m.role || 'member',
          joinedAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
          user: m.profile ? mapProfileToUser(m.profile) : undefined,
        }));

        const adminIds = members.filter((m: any) => m.role === 'admin' || m.role === 'owner').map((m: any) => m.userId);
        const isJoined = currentUserId ? members.some((m: any) => m.userId === currentUserId) : false;

        // Fetch channels
        const channels = await fetchChannelsFromSupabase(communityId);

        communityFromSupabase = {
          id: c.id,
          name: c.name,
          description: c.description || '',
          avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.name}`,
          creatorId: c.creator_id,
          members,
          adminIds: adminIds.length > 0 ? adminIds : [c.creator_id],
          groupIds: [],
          channelIds: channels.map((ch) => ch.id),
          channels,
          inviteCode: c.invite_code || c.id.substring(0, 8),
          isPublic: Boolean(c.is_public ?? true),
          createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
          updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
          memberCount: members.length > 0 ? members.length : (c.member_count || 1),
          isJoined,
        };
      }
    } catch (e) {
      console.warn('[Supabase] fetchCommunityById exception:', e);
    }
  }

  if (communityFromSupabase) {
    return communityFromSupabase;
  }

  // Fallback to server API /api/communities/:id
  try {
    const url = currentUserId ? `/api/communities/${communityId}?userId=${currentUserId}` : `/api/communities/${communityId}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.community) {
        return {
          ...data.community,
          channels: data.channels || [],
          groups: data.groups || [],
          isJoined: data.isJoined ?? false,
        };
      }
    }
  } catch (err) {
    console.warn('[Community API] fetchCommunityById server error:', err);
  }

  return null;
}

// ==============================================================================
// 7. STATUS STORIES (with 6h, 12h, 24h expiration)
// ==============================================================================

export async function saveStatusToSupabase(story: StatusStory): Promise<StatusStory> {
  const client = getSupabaseClient();
  if (!client) return story;

  try {
    const payload = {
      id: story.id,
      user_id: story.userId,
      user_name: story.userName,
      user_avatar: story.userAvatar,
      type: story.type,
      content: story.content || null,
      media_url: story.mediaUrl || null,
      background_color: story.backgroundColor || null,
      caption: story.caption || null,
      duration_hours: story.durationHours || 24,
      expires_at: new Date(story.expiresAt).toISOString(),
      created_at: new Date(story.createdAt).toISOString(),
      views: story.views || [],
    };

    await client.from('status_stories').upsert(payload, { onConflict: 'id' });
    return story;
  } catch (e) {
    console.warn('[Supabase] saveStatus error:', e);
    return story;
  }
}

export async function fetchActiveStatusesFromSupabase(): Promise<StatusStory[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('status_stories')
      .select('*')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      userName: s.user_name,
      userAvatar: s.user_avatar,
      type: s.type || 'text',
      content: s.content,
      mediaUrl: s.media_url,
      backgroundColor: s.background_color,
      caption: s.caption,
      durationHours: s.duration_hours || 24,
      createdAt: new Date(s.created_at).getTime(),
      expiresAt: new Date(s.expires_at).getTime(),
      views: s.views || [],
    }));
  } catch (e) {
    console.warn('[Supabase] fetchActiveStatuses error:', e);
    return [];
  }
}

export async function deleteStatusStoryFromSupabase(storyId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !storyId) return false;
  try {
    const { error } = await client.from('status_stories').delete().eq('id', storyId);
    if (error) {
      logSupabaseError('deleteStatusStoryFromSupabase', 'status_stories', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] deleteStatusStory exception:', e);
    return false;
  }
}

// ==============================================================================
// 8. USER SEARCH IN SUPABASE
// ==============================================================================

export async function searchUsersInSupabase(query: string, currentUserId?: string): Promise<User[]> {
  const client = getSupabaseClient();
  const cleanQ = query.trim().toLowerCase();
  const cleanDigits = cleanQ.replace(/[^0-9]/g, '');

  if (!client) return [];

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .limit(50);

    if (error || !data) return [];

    const matched = data.filter((p: any) => {
      if (currentUserId && p.id === currentUserId) return false;
      const nameMatch = (p.display_name || '').toLowerCase().includes(cleanQ);
      const usernameMatch = (p.username || '').toLowerCase().includes(cleanQ.replace(/^@/, ''));
      const phoneClean = (p.phone || '').replace(/[^0-9]/g, '');
      const phoneMatch = cleanDigits.length >= 4 && phoneClean.includes(cleanDigits);
      return nameMatch || usernameMatch || phoneMatch;
    });

    return matched.map(mapProfileToUser);
  } catch (err) {
    console.warn('[Supabase] searchUsers error:', err);
    return [];
  }
}

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    type: row.type || 'text',
    content: row.content,
    mediaUrl: row.media_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    status: row.status || 'sent',
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
    replyTo: row.reply_to || undefined,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

// ==============================================================================
// 9. SUPABASE STORAGE (Avatars & Chat Media)
// ==============================================================================

export async function uploadFileToSupabaseStorage(
  file: File | Blob,
  bucket = 'media',
  pathPrefix = 'uploads'
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const ext = file instanceof File && file.name ? file.name.split('.').pop() : 'bin';
    const filePath = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await client.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error || !data) {
      console.warn('[Supabase Storage] upload notice:', error?.message);
      return null;
    }

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[Supabase Storage] upload exception:', err);
    return null;
  }
}

// ==============================================================================
// 10. CONTACT DELETION & PHONE UPDATE IN SUPABASE
// ==============================================================================

export async function updateUserPhoneInSupabase(
  userId: string,
  phoneNumber: string,
  countryCode = '+92'
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    const { error } = await client
      .from('profiles')
      .update({
        phone: phoneNumber.trim(),
        phone_normalized: normalized,
        country_code: countryCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.warn('[Supabase] updateUserPhone error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] updateUserPhone exception:', e);
    return true;
  }
}

// ==============================================================================
// 11. CHANNELS & CHANNEL POSTS IN SUPABASE
// ==============================================================================

export async function createChannelInSupabase(
  communityId: string,
  channel: {
    name: string;
    description?: string;
    creatorId: string;
    isReadOnly?: boolean;
    avatarUrl?: string;
  }
): Promise<Channel | null> {
  const client = getSupabaseClient();
  const channelId = `chn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const createdChannel: Channel = {
    id: channelId,
    communityId,
    name: channel.name,
    description: channel.description || '',
    creatorId: channel.creatorId,
    adminIds: [channel.creatorId],
    followerIds: [channel.creatorId],
    isReadOnly: Boolean(channel.isReadOnly),
    avatarUrl: channel.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    postsCount: 0,
    isFollowed: true,
  };

  if (!client) return createdChannel;

  try {
    const payload = {
      id: channelId,
      community_id: communityId,
      name: channel.name,
      description: channel.description || null,
      creator_id: channel.creatorId,
      is_read_only: Boolean(channel.isReadOnly),
      avatar_url: channel.avatarUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('channels').insert(payload).select().maybeSingle();
    if (error) {
      console.warn('[Supabase] createChannel error, falling back:', error.message);
    }
    return createdChannel;
  } catch (e) {
    console.warn('[Supabase] createChannel exception:', e);
    return createdChannel;
  }
}

export async function fetchChannelsFromSupabase(communityId: string): Promise<Channel[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('channels')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((c: any) => ({
      id: c.id,
      communityId: c.community_id,
      name: c.name,
      description: c.description || '',
      creatorId: c.creator_id,
      adminIds: [c.creator_id],
      followerIds: [c.creator_id],
      isReadOnly: Boolean(c.is_read_only),
      avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.name)}`,
      createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
      updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
      postsCount: 0,
      isFollowed: true,
    }));
  } catch (e) {
    console.warn('[Supabase] fetchChannels exception:', e);
    return [];
  }
}

export async function createChannelPostInSupabase(
  channelId: string,
  post: {
    authorId: string;
    authorName: string;
    authorAvatar: string;
    title?: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'document';
    linkUrl?: string;
  }
): Promise<ChannelPost> {
  const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const createdPost: ChannelPost = {
    id: postId,
    channelId,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatar: post.authorAvatar,
    title: post.title,
    content: post.content,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    linkUrl: post.linkUrl,
    createdAt: Date.now(),
    likes: [],
  };

  const client = getSupabaseClient();
  if (!client) return createdPost;

  try {
    const payload = {
      id: postId,
      channel_id: channelId,
      author_id: post.authorId,
      author_name: post.authorName,
      author_avatar: post.authorAvatar,
      title: post.title || null,
      content: post.content,
      media_url: post.mediaUrl || null,
      media_type: post.mediaType || null,
      link_url: post.linkUrl || null,
      created_at: new Date().toISOString(),
      likes: [],
    };

    const { error } = await client.from('channel_posts').insert(payload);
    if (error) {
      console.warn('[Supabase] createChannelPost error:', error.message);
    }
  } catch (e) {
    console.warn('[Supabase] createChannelPost exception:', e);
  }

  return createdPost;
}

export async function fetchChannelPostsFromSupabase(channelId: string): Promise<ChannelPost[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('channel_posts')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      channelId: p.channel_id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatar: p.author_avatar,
      title: p.title || undefined,
      content: p.content,
      mediaUrl: p.media_url || undefined,
      mediaType: p.media_type || undefined,
      linkUrl: p.link_url || undefined,
      createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
      likes: Array.isArray(p.likes) ? p.likes : [],
    }));
  } catch (e) {
    console.warn('[Supabase] fetchChannelPosts exception:', e);
    return [];
  }
}

export async function likeChannelPostInSupabase(postId: string, userId: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client || !postId || !userId) return [];
  try {
    const { data: post, error: pErr } = await client.from('channel_posts').select('likes').eq('id', postId).single();
    if (pErr || !post) return [];
    const currentLikes: string[] = Array.isArray(post.likes) ? post.likes : [];
    const nextLikes = currentLikes.includes(userId)
      ? currentLikes.filter((id) => id !== userId)
      : [...currentLikes, userId];

    await client.from('channel_posts').update({ likes: nextLikes }).eq('id', postId);
    return nextLikes;
  } catch (e) {
    console.error('[Supabase] likeChannelPost exception:', e);
    return [];
  }
}

export async function deleteChannelPostInSupabase(postId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !postId) return true;
  try {
    const { error } = await client.from('channel_posts').delete().eq('id', postId);
    if (error) {
      logSupabaseError('deleteChannelPostInSupabase', 'channel_posts', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] deleteChannelPost exception:', e);
    return false;
  }
}

// ==============================================================================
// 13. CALL LOGS & HISTORY
// ==============================================================================

export async function fetchCallLogsFromSupabase(userId: string): Promise<CallLog[]> {
  const client = getSupabaseClient();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('call_logs')
      .select('*')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      logSupabaseError('fetchCallLogsFromSupabase', 'call_logs', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      callerId: row.caller_id,
      callerName: row.caller_name || 'User',
      callerAvatar: row.caller_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.caller_id}`,
      receiverId: row.receiver_id,
      receiverName: row.receiver_name || 'User',
      receiverAvatar: row.receiver_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.receiver_id}`,
      type: (row.type || row.call_type || 'audio') as any,
      direction: (row.direction || (row.caller_id === userId ? 'outgoing' : 'incoming')) as any,
      status: (row.status || 'completed') as any,
      startedAt: row.started_at ? new Date(row.started_at).getTime() : new Date(row.created_at).getTime(),
      endedAt: row.ended_at ? new Date(row.ended_at).getTime() : undefined,
      duration: row.duration || 0,
      durationSeconds: row.duration || 0,
    }));
  } catch (e: any) {
    console.error('[Supabase] fetchCallLogsFromSupabase exception:', e);
    return [];
  }
}

export async function saveCallLogToSupabase(log: Partial<CallLog>): Promise<CallLog | null> {
  const client = getSupabaseClient();
  if (!client || !log.callerId || !log.receiverId) return null;

  const logId = log.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startedAtIso = log.startedAt ? new Date(log.startedAt).toISOString() : new Date().toISOString();
  const endedAtIso = log.endedAt ? new Date(log.endedAt).toISOString() : null;

  const payload: any = {
    id: logId,
    caller_id: log.callerId,
    receiver_id: log.receiverId,
    caller_name: log.callerName || 'User',
    caller_avatar: log.callerAvatar || null,
    receiver_name: log.receiverName || 'User',
    receiver_avatar: log.receiverAvatar || null,
    type: log.type || 'audio',
    direction: log.direction || 'outgoing',
    status: log.status || 'completed',
    duration: log.duration || log.durationSeconds || 0,
    started_at: startedAtIso,
    ended_at: endedAtIso,
    created_at: startedAtIso,
  };

  try {
    const { data, error } = await client.from('call_logs').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) {
      logSupabaseError('saveCallLogToSupabase', 'call_logs', error);
      // Fallback in case table has standard schema
      const fallbackPayload = {
        id: logId,
        caller_id: log.callerId,
        receiver_id: log.receiverId,
        type: log.type === 'video' ? 'video' : 'audio',
        status: log.status === 'missed' ? 'missed' : (log.status === 'rejected' ? 'rejected' : 'completed'),
        duration: log.duration || log.durationSeconds || 0,
        created_at: startedAtIso,
      };
      const { error: fbErr } = await client.from('call_logs').upsert(fallbackPayload, { onConflict: 'id' });
      if (fbErr) {
        logSupabaseError('saveCallLogToSupabase (fallback)', 'call_logs', fbErr);
        return null;
      }
      return log as CallLog;
    }
    return log as CallLog;
  } catch (err: any) {
    console.error('[Supabase] saveCallLogToSupabase exception:', err);
    return null;
  }
}

export function subscribeToCallLogs(
  userId: string,
  onUpdate: () => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`user_call_logs_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'call_logs',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// ==============================================================================
// 12. GLOBAL REALTIME MESSAGES (Offline delivery & Real-time across all chats)
// ==============================================================================

export function subscribeToUserIncomingMessages(
  userId: string,
  onIncomingMessage: (msg: Message) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel(`user_incoming_messages_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        if (payload.new) {
          const msg = mapRowToMessage(payload.new);
          // Only notify if sender is not current user
          if (msg.senderId !== userId) {
            onIncomingMessage(msg);
          }
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function submitReportToSupabase(reportedBy: string, targetId: string, reason: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;
  try {
    const { error } = await client.from('reports').insert({
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reported_by: reportedBy,
      target_id: targetId,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    return !error;
  } catch (e) {
    return false;
  }
}

