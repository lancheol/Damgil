import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { ProfileAvatar } from '../../components/mypage/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_RULE_HINT,
  isValidUsername,
  normalizeNickname,
} from '../../utils/authValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

export function ProfileEditScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUri ?? null);
  const [usernameError, setUsernameError] = useState<string | undefined>();

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 권한 필요', '프로필 사진을 바꾸려면 사진 접근을 허용해 주세요.', [
        { text: '취소', style: 'cancel' },
        {
          text: '설정 열기',
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    setAvatarUri(result.assets[0].uri);
  };

  const openPhotoOptions = () => {
    const buttons: Array<{
      text: string;
      style?: 'cancel' | 'destructive';
      onPress?: () => void;
    }> = [
      { text: '갤러리에서 선택', onPress: () => void pickAvatar() },
    ];

    if (avatarUri) {
      buttons.push({
        text: '사진 삭제',
        style: 'destructive',
        onPress: () => setAvatarUri(null),
      });
    }

    buttons.push({ text: '취소', style: 'cancel' });
    Alert.alert('프로필 사진', '사진을 어떻게 할까요?', buttons);
  };

  const handleSave = () => {
    const trimmed = normalizeNickname(username);
    if (!trimmed) {
      setUsernameError('사용자 이름을 입력해 주세요.');
      return;
    }
    if (!isValidUsername(trimmed)) {
      setUsernameError(NICKNAME_RULE_HINT);
      return;
    }

    const ok = updateProfile({ username: trimmed, bio, avatarUri });
    if (!ok) {
      Alert.alert('저장 실패', '프로필을 저장하지 못했어요.');
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>프로필 편집</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            style={({ pressed }) => [styles.saveChip, pressed && styles.pressed]}
          >
            <Text style={styles.saveChipText}>저장</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="프로필 사진 변경"
            onPress={openPhotoOptions}
            style={({ pressed }) => [styles.avatarBlock, pressed && styles.pressed]}
          >
            <View>
              <ProfileAvatar uri={avatarUri} size={96} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </View>
            <Text style={styles.changePhotoText}>사진 변경</Text>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>사용자 이름</Text>
            <TextInput
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) {
                  setUsernameError(undefined);
                }
              }}
              placeholder="예) damgil.user"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={NICKNAME_MAX_LENGTH}
              style={[styles.input, usernameError ? styles.inputError : null]}
            />
            {usernameError ? (
              <Text style={styles.error}>{usernameError}</Text>
            ) : (
              <Text style={styles.hint}>{NICKNAME_RULE_HINT}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>소개</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="나를 소개해 주세요"
              placeholderTextColor={colors.placeholder}
              multiline
              style={[styles.input, styles.bioInput]}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  saveChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
  },
  saveChipText: {
    ...typography.label,
    color: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
  },
  bioInput: {
    minHeight: 110,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
  hint: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
