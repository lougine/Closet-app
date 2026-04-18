import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from '@/constants/api';

export type SocialUser = {
  _id: string;
  name?: string;
  username: string;
  profilePicture: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export type FriendsResponse = {
  counts: {
    followers: number;
    following: number;
  };
  followers: SocialUser[];
  following: SocialUser[];
};

async function getRequiredToken() {
  const token = await SecureStore.getItemAsync('userToken');
  if (!token) {
    throw new Error('Session expired. Please log in again.');
  }
  return token;
}

function normalizeSocialUser(payload: any): SocialUser {
  return {
    _id: String(payload?._id || ''),
    name: payload?.name,
    username: payload?.username || payload?.name || 'User',
    profilePicture: payload?.profilePicture ? buildImageUrl(payload.profilePicture) : null,
    followerCount: Number(payload?.followerCount || 0),
    followingCount: Number(payload?.followingCount || 0),
    isFollowing: Boolean(payload?.isFollowing),
  };
}

async function parseResponse(res: Response, fallbackMessage: string) {
  if (!res.ok) {
    const rawText = await res.text().catch(() => '');
    if (rawText) {
      try {
        const errorData = JSON.parse(rawText);
        throw new Error(errorData?.message || `${fallbackMessage} (${res.status})`);
      } catch {
        throw new Error(`${fallbackMessage} (${res.status}): ${rawText}`);
      }
    }

    throw new Error(`${fallbackMessage} (${res.status})`);
  }

  return res.json().catch(() => ({}));
}

async function fetchWithRouteFallback(
  paths: string[],
  init: RequestInit,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (const path of paths) {
    const res = await fetch(buildApiUrl(path), init);
    lastResponse = res;

    if (res.status !== 404) {
      return res;
    }
  }

  return lastResponse as Response;
}

export async function searchUsers(query: string, limit = 20): Promise<SocialUser[]> {
  const normalizedQuery = query.trim().replace(/^@+/, '').slice(0, 64);
  if (!normalizedQuery) {
    return [];
  }

  const token = await getRequiredToken();
  const params = new URLSearchParams();
  params.append('q', normalizedQuery);
  params.append('limit', String(limit));

  const res = await fetchWithRouteFallback([
    `/api/community/users/search?${params.toString()}`,
    `/community/users/search?${params.toString()}`,
    `/api/users/search?${params.toString()}`,
    `/users/search?${params.toString()}`,
  ], {
    headers: buildAuthHeaders(token),
  });

  const payload = await parseResponse(res, 'Failed to search users.');
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map(normalizeSocialUser);
}

export async function toggleFollow(userId: string): Promise<{
  isFollowing: boolean;
  targetUser: SocialUser;
  me: { followerCount: number; followingCount: number };
}> {
  const token = await getRequiredToken();

  const res = await fetchWithRouteFallback([
    `/api/users/${userId}/follow`,
    `/users/${userId}/follow`,
  ], {
    method: 'POST',
    headers: buildAuthHeaders(token),
  });

  const payload = await parseResponse(res, 'Failed to update follow status.');
  return {
    isFollowing: Boolean(payload?.isFollowing),
    targetUser: normalizeSocialUser(payload?.targetUser || {}),
    me: {
      followerCount: Number(payload?.me?.followerCount || 0),
      followingCount: Number(payload?.me?.followingCount || 0),
    },
  };
}

export async function fetchMyFriends(): Promise<FriendsResponse> {
  const token = await getRequiredToken();

  const res = await fetchWithRouteFallback([
    '/api/users/me/friends',
    '/users/me/friends',
  ], {
    headers: buildAuthHeaders(token),
  });

  const payload = await parseResponse(res, 'Failed to load friends.');

  return {
    counts: {
      followers: Number(payload?.counts?.followers || 0),
      following: Number(payload?.counts?.following || 0),
    },
    followers: Array.isArray(payload?.followers) ? payload.followers.map(normalizeSocialUser) : [],
    following: Array.isArray(payload?.following) ? payload.following.map(normalizeSocialUser) : [],
  };
}
