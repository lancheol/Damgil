import { StatusBar } from 'expo-status-bar';

import { AiCourseProvider } from './src/context/AiCourseContext';
import { AuthProvider } from './src/context/AuthContext';
import { DiaryProvider } from './src/context/DiaryContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
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
