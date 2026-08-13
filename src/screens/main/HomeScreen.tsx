import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiaryActionModal } from '../../components/diary/DiaryActionModal';
import { ActiveDiaryGuideCard } from '../../components/home/ActiveDiaryGuideCard';
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
  const { activeDiary, endDiary, deleteDiary } = useDiaries();
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

  const handleDeleteDiary = () => {
    if (!activeDiary) {
      return;
    }

    const diaryId = activeDiary.id;
    const diaryName = activeDiary.name;

    Alert.alert(
      '다이어리 삭제',
      `"${diaryName}" 다이어리를 삭제할까요?\n촬영물과 기록이 모두 삭제되며 되돌릴 수 없어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setActionVisible(false);
              await deleteDiary(diaryId);
            })();
          },
        },
      ],
    );
  };

  const handleEndTrip = () => {
    if (!activeDiary) {
      return;
    }

    const diaryId = activeDiary.id;
    const diaryName = activeDiary.name;

    Alert.alert(
      '여행 종료',
      `${diaryName}여행을 종료하시면, 촬영물 수정이 불가능합니다. 저장된 촬영물을 다시 한 번 확인 부탁드리며, 여행 종료 후 장소별 다이어리를 편집하고, 표지를 꾸밀 수 있습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setActionVisible(false);
              const ok = await endDiary(diaryId);
              if (!ok) {
                return;
              }
              navigation.navigate('DiaryCoverEdit', { diaryId, fromTripEnd: true });
            })();
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
          <ActiveDiaryGuideCard
            diary={activeDiary}
            onPress={handleDiaryPress}
            onPressDelete={handleDeleteDiary}
          />
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
