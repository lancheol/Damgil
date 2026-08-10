import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { buildAiCourse } from '../../utils/aiCourse';

type Props = NativeStackScreenProps<RootStackParamList, 'AICourseLoading'>;

/** 코스 생성 API 연동 전 대기 시간 */
const GENERATE_DELAY_MS = 2800;

export function AICourseLoadingScreen({ navigation, route }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('AICourseResult', { course: buildAiCourse(route.params.input) });
    }, GENERATE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [navigation, route.params.input]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
      <Text style={styles.title}>AI가 여행 코스를</Text>
      <Text style={styles.title}>제작하고 있어요</Text>
      <Text style={styles.subtitle}>잠시만 기다려주세요...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.white,
  },
  spinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#F3F4F6',
    borderTopColor: '#101828',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1E2939',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6A7282',
    textAlign: 'center',
  },
});
