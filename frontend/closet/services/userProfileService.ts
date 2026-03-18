import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from '@/constants/api';

export type UserProfile = {
  _id: string;
  name?: string;
  username: string;
  profilePicture: string | null;
  bannerImage: string | null;
  bannerPreset: string;
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
    username: payload?.username || payload?.name || 'wizliz',
    profilePicture: payload?.profilePicture ? buildImageUrl(payload.profilePicture) : null,
    bannerImage: payload?.bannerImage ? buildImageUrl(payload.bannerImage) : null,
    bannerPreset: payload?.bannerPreset || DEFAULT_BANNER_PRESET,
  };
}

async function parseResponse(res: Response, fallbackMessage: string) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: fallbackMessage }));
    throw new Error(errorData.message || fallbackMessage);
  }

  return res.json();
}

export async function fetchCurrentUserProfile(): Promise<UserProfile> {
  const token = await getRequiredToken();

  const res = await fetch(buildApiUrl('/api/users/me'), {
    headers: buildAuthHeaders(token),
  });

  const payload = await parseResponse(res, 'Failed to load profile.');
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

  const res = await fetch(buildApiUrl(endpoint), {
    method: 'PUT',
    headers: buildAuthHeaders(token),
    body: formData,
  });

  const payload = await parseResponse(res, 'Image upload failed.');
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
