import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from '@/constants/api';
import { uploadMultipartWithRetry } from '@/services/uploadRequest';

export type UserProfile = {
  _id: string;
  name?: string;
  email?: string;
  username: string;
  profilePicture: string | null;
  bannerImage: string | null;
  bannerPreset: string;
  followerCount: number;
  followingCount: number;
};

export type PublicUserProfile = {
  _id: string;
  name?: string;
  username: string;
  profilePicture: string | null;
  bannerImage: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMe: boolean;
  joinedAt: string | null;
};

const DEFAULT_BANNER_PRESET = 'pink';

async function getRequiredToken() {
  const token = await SecureStore.getItemAsync('userToken');
  if (!token) {
    throw new Error('Session expired. Please log in again.');
  }
  return token;
}

function normalizeUserProfile(payload: any): UserProfile {
  return {
    _id: payload?._id,
    name: payload?.name,
    email: payload?.email,
    username: payload?.username || payload?.name || 'wizliz',
    profilePicture: payload?.profilePicture ? buildImageUrl(payload.profilePicture) : null,
    bannerImage: payload?.bannerImage ? buildImageUrl(payload.bannerImage) : null,
    bannerPreset: payload?.bannerPreset || DEFAULT_BANNER_PRESET,
    followerCount: Number(payload?.followerCount || 0),
    followingCount: Number(payload?.followingCount || 0),
  };
}

async function parseResponse(res: Response, fallbackMessage: string) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: fallbackMessage }));
    throw new Error(errorData.message || fallbackMessage);
  }

  return res.json();
}

async function fetchWithRouteFallback(paths: string[], init: RequestInit): Promise<Response> {
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

function normalizePublicUserProfile(payload: any): PublicUserProfile {
  return {
    _id: String(payload?._id || ''),
    name: payload?.name,
    username: payload?.username || payload?.name || 'User',
    profilePicture: payload?.profilePicture ? buildImageUrl(payload.profilePicture) : null,
    bannerImage: payload?.bannerImage ? buildImageUrl(payload.bannerImage) : null,
    followerCount: Number(payload?.followerCount || 0),
    followingCount: Number(payload?.followingCount || 0),
    isFollowing: Boolean(payload?.isFollowing),
    isMe: Boolean(payload?.isMe),
    joinedAt: payload?.joinedAt || null,
  };
}

export async function fetchCurrentUserProfile(): Promise<UserProfile> {
  const token = await getRequiredToken();

  const res = await fetch(buildApiUrl('/api/users/me'), {
    headers: buildAuthHeaders(token),
  });

  const payload = await parseResponse(res, 'Failed to load profile.');
  return normalizeUserProfile(payload);
}

export async function fetchPublicUserProfile(userId: string): Promise<PublicUserProfile> {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('User id is required.');
  }

  const token = await getRequiredToken();
  const res = await fetchWithRouteFallback([
    `/api/users/${normalizedUserId}/profile`,
    `/users/${normalizedUserId}/profile`,
    `/api/community/users/${normalizedUserId}/profile`,
    `/community/users/${normalizedUserId}/profile`,
  ], {
    headers: buildAuthHeaders(token),
  });

  const payload = await parseResponse(res, 'Failed to load user profile.');
  return normalizePublicUserProfile(payload);
}

export async function updateProfileDetails({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<UserProfile> {
  const token = await getRequiredToken();

  const res = await fetch(buildApiUrl('/api/users/me'), {
    method: 'PUT',
    headers: {
      ...buildAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email }),
  });

  const payload = await parseResponse(res, 'Failed to update profile details.');
  return normalizeUserProfile(payload);
}

export async function updateDisplayName(name: string): Promise<UserProfile> {
  const token = await getRequiredToken();

  const res = await fetch(buildApiUrl('/api/users/me'), {
    method: 'PUT',
    headers: {
      ...buildAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  const payload = await parseResponse(res, 'Failed to update profile name.');
  return normalizeUserProfile(payload);
}

async function uploadImage(
  endpoint: '/api/users/me/profile-image' | '/api/users/me/banner-image',
  fieldName: 'profileImage' | 'bannerImage',
  uri: string,
): Promise<UserProfile> {
  const token = await getRequiredToken();

  const formData = new FormData();
  formData.append(fieldName, {
    uri,
    name: `${fieldName}-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const payload = await uploadMultipartWithRetry<any>({
    endpoint,
    token,
    formData,
    method: 'PUT',
    timeoutMs: 25000,
    retries: 1,
    fallbackMessage: 'Image upload failed.',
  });
  return normalizeUserProfile(payload);
}

export function uploadProfileImage(uri: string): Promise<UserProfile> {
  return uploadImage('/api/users/me/profile-image', 'profileImage', uri);
}

export function uploadBannerImage(uri: string): Promise<UserProfile> {
  return uploadImage('/api/users/me/banner-image', 'bannerImage', uri);
}

export async function saveBannerPreset(bannerPreset: string): Promise<UserProfile> {
  const token = await getRequiredToken();

  const res = await fetch(buildApiUrl('/api/users/me/banner-preset'), {
    method: 'PUT',
    headers: {
      ...buildAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bannerPreset }),
  });

  const payload = await parseResponse(res, 'Failed to save banner preset.');
  return normalizeUserProfile(payload);
}
