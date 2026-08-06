import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { isValidUsername } from '../../utils/authValidation';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

export function ProfileEditScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [usernameError, setUsernameError] = useState<string | undefined>();

  const handleSave = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameError('사용자 이름을 입력해 주세요.');
      return;
    }
    if (!isValidUsername(trimmed)) {
      setUsernameError('영문, 숫자, ., _ 만 사용 (3~20자)');
      return;
    }

    const ok = updateProfile({ username: trimmed, bio });
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
          showsVerticalScrollIndicator={false}
        >
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
              placeholder="username"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, usernameError ? styles.inputError : null]}
            />
            {usernameError ? <Text style={styles.error}>{usernameError}</Text> : null}
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
  pressed: {
    opacity: 0.88,
  },
});
