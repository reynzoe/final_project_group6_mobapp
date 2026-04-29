import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '4000';

function getDefaultHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }

  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (expoHost) {
    return expoHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  return `http://${getDefaultHost()}:${API_PORT}/api`;
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const requestHeaders: HeadersInit = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}${normalizedPath}`, {
      ...rest,
      headers: requestHeaders,
      body,
    });
    const rawText = await response.text();
    const payload = rawText ? JSON.parse(rawText) : {};

    if (!response.ok) {
      const message =
        typeof payload?.message === 'string' ? payload.message : 'The request could not be completed.';
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        throw new Error(
          `Unable to reach the API at ${getApiBaseUrl()}. Start the backend with "npm run api" and try again.`
        );
      }

      throw error;
    }

    throw new Error('Something went wrong while contacting the API.');
  }
}
