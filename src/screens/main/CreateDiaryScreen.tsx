import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
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
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateDiary'>;

export function CreateDiaryScreen({ navigation }: Props) {
  const { createDiary } = useDiaries();
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [placeError, setPlaceError] = useState<string | undefined>();

  const canSubmit = useMemo(
    () => name.trim().length > 0 && place.trim().length > 0,
    [name, place],
  );

  const handleSubmit = () => {
    const nextNameError = name.trim() ? undefined : '다이어리 이름을 입력해 주세요.';
    const nextPlaceError = place.trim() ? undefined : '여행지를 입력해 주세요.';
    setNameError(nextNameError);
    setPlaceError(nextPlaceError);

    if (nextNameError || nextPlaceError) {
      return;
    }

    createDiary({ name, place });
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
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>새로운 여행</Text>
            <Text style={styles.title}>New Diary</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Diary name</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) {
                  setNameError(undefined);
                }
              }}
              placeholder="ex. XX여행"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, nameError ? styles.inputError : null]}
              autoCapitalize="none"
              returnKeyType="next"
            />
            {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Travel place</Text>
            <TextInput
              value={place}
              onChangeText={(text) => {
                setPlace(text);
                if (placeError) {
                  setPlaceError(undefined);
                }
              }}
              placeholder="ex. 강릉, 부산"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, placeError ? styles.inputError : null]}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {placeError ? <Text style={styles.error}>{placeError}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              canSubmit ? styles.submitButtonReady : styles.submitButtonDisabled,
              pressed && canSubmit && styles.submitButtonPressed,
            ]}
          >
            <Text style={styles.submitText}>Travel Start</Text>
          </Pressable>
        </View>
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
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  headerCopy: {
    gap: 3,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.ink,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.3,
    color: colors.ink,
    paddingLeft: spacing.sm,
  },
  input: {
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    fontSize: 12,
    color: colors.ink,
    shadowColor: '#0D0A2C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    paddingLeft: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  submitButton: {
    height: 62,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D9D9D9',
  },
  submitButtonReady: {
    backgroundColor: colors.black,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
    color: colors.white,
  },
});
