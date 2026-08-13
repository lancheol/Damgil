import AsyncStorage from '@react-native-async-storage/async-storage';

import { TokenPair } from './types';

const ACCESS_KEY = '@damgil/auth/access';
const REFRESH_KEY = '@damgil/auth/refresh';

export async function saveTokens(tokens: TokenPair): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, tokens.access],
    [REFRESH_KEY, tokens.refresh],
  ]);
}

export async function loadTokens(): Promise<TokenPair | null> {
  const [[, access], [, refresh]] = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
  if (!access || !refresh) {
    return null;
  }
  return { access, refresh };
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}
