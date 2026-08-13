export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://dam-gil.duckdns.org'
).replace(/\/$/, '');

export const API_PREFIX = '/api/v1';
