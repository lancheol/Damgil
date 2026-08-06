import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { buildPlaceSelections, isPlacesSetupComplete } from '../../utils/diaryPlaces';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryPlacePick'>;

/** 레거시 진입점 — 장소당 1장 자동 확정 후 공책 화면으로 보냄 */
export function DiaryPlacePickScreen({ navigation, route }: Props) {
  const { diaryId } = route.params;
  const { getDiaryById, savePlaceSelections } = useDiaries();
  const diary = getDiaryById(diaryId);

  useEffect(() => {
    if (!diary) {
      return;
    }
    if (!isPlacesSetupComplete(diary)) {
      const selections = buildPlaceSelections(diary.photos ?? []);
      if (selections.length > 0) {
        savePlaceSelections({ diaryId, selections });
      }
    }
    navigation.replace('DiaryEdit', { diaryId });
  }, [diary, diaryId, navigation, savePlaceSelections]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
