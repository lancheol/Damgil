import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { CreateDiaryScreen } from '../screens/main/CreateDiaryScreen';
import { DiaryCameraScreen } from '../screens/main/DiaryCameraScreen';
import { DiaryCoverEditScreen } from '../screens/main/DiaryCoverEditScreen';
import { DiaryEditScreen } from '../screens/main/DiaryEditScreen';
import { DiaryPhotoEntryScreen } from '../screens/main/DiaryPhotoEntryScreen';
import { DiaryPhotoGalleryScreen } from '../screens/main/DiaryPhotoGalleryScreen';
import { DiaryPlacePickScreen } from '../screens/main/DiaryPlacePickScreen';
import { DiaryRecordDecorateScreen } from '../screens/main/DiaryRecordDecorateScreen';
import { DiaryRecordDetailScreen } from '../screens/main/DiaryRecordDetailScreen';
import { ProfileEditScreen } from '../screens/main/ProfileEditScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="ProfileEdit"
              component={ProfileEditScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="CreateDiary"
              component={CreateDiaryScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="DiaryCamera"
              component={DiaryCameraScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="DiaryPhotoEntry"
              component={DiaryPhotoEntryScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="DiaryPhotoGallery"
              component={DiaryPhotoGalleryScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="DiaryEdit"
              component={DiaryEditScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="DiaryPlacePick"
              component={DiaryPlacePickScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="DiaryCoverEdit"
              component={DiaryCoverEditScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="DiaryRecordDetail"
              component={DiaryRecordDetailScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="DiaryRecordDecorate"
              component={DiaryRecordDecorateScreen}
              options={({ route }) => ({
                animation:
                  route.params.transition === 'prev' ? 'slide_from_left' : 'slide_from_right',
                animationTypeForReplace: route.params.transition === 'prev' ? 'pop' : 'push',
              })}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
