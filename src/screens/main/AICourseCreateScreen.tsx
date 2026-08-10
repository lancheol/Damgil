import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
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
import { AI_COURSE_TRANSPORTS } from '../../constants/aiCourses';
import { RootStackParamList } from '../../navigation/types';
import { AiCourseTransport } from '../../types/aiCourse';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AICourseCreate'>;

const H_PADDING = 20;

export function AICourseCreateScreen({ navigation }: Props) {
  const [destination, setDestination] = useState('');
  const [schedule, setSchedule] = useState('');
  const [transport, setTransport] = useState<AiCourseTransport>('승용차');
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<string[]>([]);

  const canSubmit = destination.trim().length > 0 && schedule.trim().length > 0;

  const addPlace = () => {
    const trimmed = placeQuery.trim();
    if (!trimmed || places.includes(trimmed)) {
      return;
    }
    setPlaces((prev) => [...prev, trimmed]);
    setPlaceQuery('');
  };

  const removePlace = (place: string) => {
    setPlaces((prev) => prev.filter((item) => item !== place));
  };

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    navigation.replace('AICourseLoading', {
      input: {
        destination: destination.trim(),
        schedule: schedule.trim(),
        transport,
        places,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
        <Text style={styles.headerTitle}>코스 생성하기</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <Text style={styles.label}>가고 싶은 여행지</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="예) 제주도, 속초, 부산"
              placeholderTextColor="#99A1AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>여행 일정</Text>
            <TextInput
              style={styles.input}
              value={schedule}
              onChangeText={setSchedule}
              placeholder="예) 2박 3일, 당일치기"
              placeholderTextColor="#99A1AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>이동 수단</Text>
            <View style={styles.transportRow}>
              {AI_COURSE_TRANSPORTS.map((item) => {
                const active = item === transport;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={active ? { selected: true } : {}}
                    style={[styles.transportButton, active && styles.transportButtonActive]}
                    onPress={() => setTransport(item)}
                  >
                    <Text style={[styles.transportText, active && styles.transportTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>가고 싶은 장소</Text>
            <TextInput
              style={styles.input}
              value={placeQuery}
              onChangeText={setPlaceQuery}
              onSubmitEditing={addPlace}
              returnKeyType="done"
              placeholder="예) 성산일출봉, 오설록"
              placeholderTextColor="#99A1AF"
            />

            {places.length > 0 ? (
              <View style={styles.placeList}>
                {places.map((place) => (
                  <View key={place} style={styles.placeChip}>
                    <Text style={styles.placeChipText}>{place}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${place} 삭제`}
                      hitSlop={8}
                      onPress={() => removePlace(place)}
                    >
                      <Ionicons name="close" size={14} color="#6A7282" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="장소 추가하기"
              style={({ pressed }) => [styles.addPlaceButton, pressed && styles.pressed]}
              onPress={addPlace}
            >
              <Ionicons name="add" size={16} color="#6A7282" />
              <Text style={styles.addPlaceText}>장소 추가하기</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={submit}
          >
            <Text style={styles.submitText}>AI 코스 생성 시작</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1E2939',
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
  },
  input: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    fontSize: 14,
    color: '#1E2939',
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  transportButton: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  transportButtonActive: {
    backgroundColor: '#101828',
    borderColor: '#101828',
  },
  transportText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#4A5565',
  },
  transportTextActive: {
    color: colors.white,
  },
  placeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  placeChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A5565',
  },
  addPlaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DC',
  },
  addPlaceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#6A7282',
  },
  footer: {
    paddingHorizontal: H_PADDING,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    backgroundColor: colors.white,
  },
  submitButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#101828',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
