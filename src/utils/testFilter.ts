import { User, Chat } from '../types';
import { safeStorage } from './safeStorage';

/**
 * Checks if a user is a test / mock / demo user that should be excluded.
 */
export function isTestUser(
  user: {
    id?: string;
    username?: string;
    displayName?: string;
    name?: string;
    email?: string;
    about?: string;
    bio?: string;
  } | null | undefined
): boolean {
  if (!user) return true;

  const username = String(user.username || '').toLowerCase().trim().replace(/^@/, '');
  const displayName = String(user.displayName || user.name || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();
  const about = String(user.about || user.bio || '').toLowerCase().trim();
  const id = String(user.id || '').toLowerCase().trim();

  // 1. Explicit test usernames to block
  const blockedExactUsernames = [
    'test',
    'test2',
    'testuser',
    'testuser99',
    'testperson',
    'complete_user',
    'test_user',
    'demo_user',
    'mock_user',
  ];

  if (blockedExactUsernames.includes(username)) {
    return true;
  }

  // 2. Pattern checks on username
  if (
    username.startsWith('test') ||
    username.endsWith('test') ||
    username.includes('testuser') ||
    username.includes('complete_user') ||
    username.includes('testperson') ||
    username.includes('mock') ||
    username.includes('dummy')
  ) {
    return true;
  }

  // 3. Display name checks
  const blockedExactNames = [
    'test',
    'test two',
    'test user 99',
    'test person',
    'test complete user',
    'complete user',
  ];
  if (blockedExactNames.includes(displayName)) {
    return true;
  }

  if (
    displayName.startsWith('test ') ||
    displayName.endsWith(' test') ||
    displayName === 'test' ||
    displayName.includes('test user') ||
    displayName.includes('test person') ||
    displayName.includes('test two') ||
    displayName.includes('complete user') ||
    displayName.includes('testing profile') ||
    displayName.includes('mock ') ||
    displayName.includes('dummy ')
  ) {
    return true;
  }

  // 4. Email checks
  if (
    email.startsWith('test') ||
    email.includes('@test.') ||
    email.includes('testuser') ||
    email.includes('complete_user') ||
    email.includes('example.com')
  ) {
    return true;
  }

  // 5. Bio / About checks
  if (about.includes('testing profile') || about.includes('test profile')) {
    return true;
  }

  // 6. ID checks
  if (
    id.startsWith('usr_test') ||
    id.includes('complete_user') ||
    id.includes('testuser') ||
    id.includes('testperson')
  ) {
    return true;
  }

  return false;
}

/**
 * Filters an array of users, removing all test and mock users.
 */
export function filterRealUsers(users: (User | any)[]): User[] {
  if (!Array.isArray(users)) return [];
  return users.filter((u) => u && u.id && !isTestUser(u));
}

/**
 * Checks if a chat is a test chat or involves test users.
 */
export function isTestChat(chat: Chat | any, currentUserId?: string): boolean {
  if (!chat) return true;

  const name = String(chat.name || chat.title || '').toLowerCase().trim();
  const id = String(chat.id || '').toLowerCase().trim();

  // Test names
  if (
    name.includes('test') ||
    name === 'janu' ||
    name === 'mani' ||
    name.includes('mock') ||
    name.includes('dummy') ||
    name === 'test two' ||
    name === 'test person' ||
    name === 'test user 99' ||
    name === 'test complete user'
  ) {
    return true;
  }

  // Known mock IDs
  if (
    id === 'chat_1789026111971_emok' ||
    id === 'chat_1789546741695_qsg9' ||
    id.includes('test')
  ) {
    return true;
  }

  // Check if any participant is a test user
  const memberIds: string[] = chat.memberIds || chat.participantIds || [];
  for (const mid of memberIds) {
    if (mid !== currentUserId && mid.toLowerCase().includes('test')) {
      return true;
    }
  }

  return false;
}

/**
 * Completely purges test accounts and test cached users from localStorage.
 */
export function purgeLocalTestUsersAndArtifacts(): void {
  try {
    // 1. Purge from erroren_all_users
    const rawAllUsers = safeStorage.getJSON<User[]>('erroren_all_users', []);
    if (Array.isArray(rawAllUsers) && rawAllUsers.length > 0) {
      const cleanedAll = rawAllUsers.filter((u) => !isTestUser(u));
      safeStorage.setJSON('erroren_all_users', cleanedAll);
    }

    // 2. Purge from erroren_saved_accounts
    const rawSaved = safeStorage.getJSON<User[]>('erroren_saved_accounts', []);
    if (Array.isArray(rawSaved) && rawSaved.length > 0) {
      const cleanedSaved = rawSaved.filter((u) => !isTestUser(u));
      safeStorage.setJSON('erroren_saved_accounts', cleanedSaved);
    }

    // 3. Purge current user if it is a test user
    const currentUser = safeStorage.getJSON<User | null>('erroren_user', null);
    if (currentUser && isTestUser(currentUser)) {
      safeStorage.removeItem('erroren_user');
    }
  } catch (err) {
    console.warn('[testFilter] Purge error:', err);
  }
}
