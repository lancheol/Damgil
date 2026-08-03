import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiaryActionModal } from '../../components/diary/DiaryActionModal';
import { DiaryBookCard } from '../../components/home/DiaryBookCard';
import { EmptyDiaryCard } from '../../components/home/EmptyDiaryCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { useDiaries } from '../../context/DiaryContext';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { activeDiary, endDiary } = useDiaries();
  const [actionVisible, setActionVisible] = useState(false);

  const handleCreateDiary = () => {
    navigation.navigate('CreateDiary');
  };

  const handleDiaryPress = () => {
    if (!activeDiary) {
      return;
    }

    const photoCount = activeDiary.photos?.length ?? 0;
    if (photoCount === 0) {
      navigation.navigate('DiaryCamera', { diaryId: activeDiary.id });
      return;
    }

    setActionVisible(true);
  };

  const handleEndTrip = () => {
    if (!activeDiary) {
      return;
    }

    const diaryId = activeDiary.id;
    const diaryName = activeDiary.name;

    Alert.alert(
      '여행 종료',
      `"${diaryName}" 여행을 종료할까요?\n편집 화면에서 일차별로 기록을 볼 수 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: () => {
            const ok = endDiary(diaryId);
            setActionVisible(false);
            if (!ok) {
              Alert.alert('종료 실패', '여행을 종료하지 못했습니다.');
              return;
            }
            navigation.navigate('DiaryEdit', { diaryId });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader />
      <View style={styles.body}>
        {activeDiary ? (
          <DiaryBookCard diary={activeDiary} onPress={handleDiaryPress} />
        ) : (
          <EmptyDiaryCard onPressCreate={handleCreateDiary} />
        )}
      </View>

      {activeDiary ? (
        <DiaryActionModal
          visible={actionVisible}
          diaryName={activeDiary.name}
          onClose={() => setActionVisible(false)}
          onViewPhotos={() => {
            setActionVisible(false);
            navigation.navigate('DiaryPhotoGallery', { diaryId: activeDiary.id });
          }}
          onTakePhoto={() => {
            setActionVisible(false);
            navigation.navigate('DiaryCamera', { diaryId: activeDiary.id });
          }}
          onEndTrip={handleEndTrip}
        />
      ) : null}
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
