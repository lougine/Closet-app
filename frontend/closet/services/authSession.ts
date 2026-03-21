import * as SecureStore from 'expo-secure-store';
import { buildApiUrl } from '@/constants/api';

const USER_TOKEN_KEY = 'userToken';

export async function persistAuthTokenAndHydrateWardrobe(
  token: string,
  refreshItems: () => Promise<void>,
) {
  await SecureStore.setItemAsync(USER_TOKEN_KEY, token);
  await refreshItems();
}

export async function exchangeGoogleAccessTokenForAppToken(accessToken: string) {
  const response = await fetch(buildApiUrl('/api/auth/google/exchange'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.message || 'Google sign in failed');
  }

  const payload = await response.json();
  if (!payload?.token) {
    throw new Error('Google sign in did not return an app token');
  }

  return payload.token as string;
}
