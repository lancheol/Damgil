import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyDiaryCard } from '../../components/home/EmptyDiaryCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const handleCreateDiary = () => {
    Alert.alert('새 다이어리', '다이어리 생성 화면은 다음 단계에서 연결됩니다.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader onPressSettings={() => navigation.navigate('Settings')} />
      <View style={styles.body}>
        <EmptyDiaryCard onPressCreate={handleCreateDiary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingBottom: 110,
    paddingTop: spacing.sm,
  },
});
