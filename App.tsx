import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import { DiaryProvider } from './src/context/DiaryContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <DiaryProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </DiaryProvider>
    </AuthProvider>
  );
}
