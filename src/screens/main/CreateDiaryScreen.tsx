import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.body}>
          <View style={styles.card}>
            <View style={styles.paper}>
              <View style={styles.tape} />

              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) {
                    setNameError(undefined);
                  }
                }}
                placeholder="다이어리 이름"
                placeholderTextColor={colors.placeholder}
                style={[styles.nameInput, nameError ? styles.inputError : null]}
                autoCapitalize="none"
                returnKeyType="next"
                textAlign="center"
              />
              {nameError ? <Text style={styles.error}>{nameError}</Text> : null}

              <TextInput
                value={place}
                onChangeText={(text) => {
                  setPlace(text);
                  if (placeError) {
                    setPlaceError(undefined);
                  }
                }}
                placeholder="여행지 (예: 부산)"
                placeholderTextColor={colors.placeholder}
                style={[styles.placeInput, placeError ? styles.inputError : null]}
                autoCapitalize="none"
                returnKeyType="done"
                textAlign="center"
                onSubmitEditing={handleSubmit}
              />
              {placeError ? <Text style={styles.error}>{placeError}</Text> : null}

              {/* 하단 사용 방법 (a)~ 문구는 이후에 채움 */}
              <View style={styles.guideSlot} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              accessibilityLabel="여행 시작"
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.startBtn,
                canSubmit ? styles.startBtnReady : styles.startBtnDisabled,
                pressed && canSubmit && styles.startBtnPressed,
              ]}
            >
              <Text style={styles.startText}>Travel Start</Text>
            </Pressable>
          </View>
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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  body: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -36,
    width: 72,
    height: 22,
    backgroundColor: colors.tape,
    borderRadius: 2,
    opacity: 0.92,
    transform: [{ rotate: '-2deg' }],
  },
  nameInput: {
    ...typography.monoTitle,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  placeInput: {
    ...typography.monoBody,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  inputError: {
    color: colors.danger,
  },
  error: {
    fontSize: 11,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  guideSlot: {
    minHeight: 120,
  },
  startBtn: {
    position: 'absolute',
    bottom: spacing.xl,
    minWidth: 160,
    height: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnReady: {
    backgroundColor: colors.overlay,
  },
  startBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  startBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  startText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: colors.white,
  },
});
