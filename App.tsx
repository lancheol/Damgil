import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AiCourseProvider } from './src/context/AiCourseContext';
import { AuthProvider } from './src/context/AuthContext';
import { DiaryProvider } from './src/context/DiaryContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { KERIS_KEDU_FONT_FAMILY, PRETENDARD_FONT_FAMILY } from './src/utils/decorAssets';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    [KERIS_KEDU_FONT_FAMILY.regular]: require('./assets/fonts/KERISKEDU_R.otf'),
    [KERIS_KEDU_FONT_FAMILY.bold]: require('./assets/fonts/KERISKEDU_B.otf'),
    [KERIS_KEDU_FONT_FAMILY.line]: require('./assets/fonts/KERISKEDU_Line.otf'),
    [PRETENDARD_FONT_FAMILY.regular]: require('./assets/fonts/Pretendard-Regular.otf'),
    [PRETENDARD_FONT_FAMILY.medium]: require('./assets/fonts/Pretendard-Medium.otf'),
    [PRETENDARD_FONT_FAMILY.bold]: require('./assets/fonts/Pretendard-Bold.otf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <DiaryProvider>
        <AiCourseProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AiCourseProvider>
      </DiaryProvider>
    </AuthProvider>
  );
}
