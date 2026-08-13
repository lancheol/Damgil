import AsyncStorage from '@react-native-async-storage/async-storage';

const avatarKey = (userId: string) => `@damgil/profile/avatar/${userId}`;

export async function loadAvatarUri(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(avatarKey(userId));
}

export async function saveAvatarUri(userId: string, uri: string | null): Promise<void> {
  const key = avatarKey(userId);
  if (uri) {
    await AsyncStorage.setItem(key, uri);
    return;
  }
  await AsyncStorage.removeItem(key);
}
