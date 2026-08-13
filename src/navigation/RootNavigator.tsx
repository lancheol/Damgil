import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { AICourseCreateScreen } from '../screens/main/AICourseCreateScreen';
import { AICourseLoadingScreen } from '../screens/main/AICourseLoadingScreen';
import { AICourseMapScreen } from '../screens/main/AICourseMapScreen';
import { AICourseResultScreen } from '../screens/main/AICourseResultScreen';
import { CreateDiaryScreen } from '../screens/main/CreateDiaryScreen';
import { DiaryCameraScreen } from '../screens/main/DiaryCameraScreen';
import { DiaryCoverEditScreen } from '../screens/main/DiaryCoverEditScreen';
import { DiaryDailyCourseMapScreen } from '../screens/main/DiaryDailyCourseMapScreen';
import { DiaryEditScreen } from '../screens/main/DiaryEditScreen';
import { DiaryPhotoEntryScreen } from '../screens/main/DiaryPhotoEntryScreen';
import { DiaryPhotoGalleryScreen } from '../screens/main/DiaryPhotoGalleryScreen';
import { DiaryPlacePickScreen } from '../screens/main/DiaryPlacePickScreen';
import { DiaryRecordDecorateScreen } from '../screens/main/DiaryRecordDecorateScreen';
import { DiaryRecordDetailScreen } from '../screens/main/DiaryRecordDetailScreen';
import { FestivalListScreen } from '../screens/main/FestivalListScreen';
import { MapRouteScreen } from '../screens/main/MapRouteScreen';
import { ProfileEditScreen } from '../screens/main/ProfileEditScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { TravelSubsidyScreen } from '../screens/main/TravelSubsidyScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

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
                animation: 'slide_from_right',
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
              name="FestivalList"
              component={FestivalListScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="TravelSubsidy"
              component={TravelSubsidyScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="AICourseCreate"
              component={AICourseCreateScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="AICourseLoading"
              component={AICourseLoadingScreen}
              options={{
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="AICourseResult"
              component={AICourseResultScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="AICourseMap"
              component={AICourseMapScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="MapRoute"
              component={MapRouteScreen}
              options={{
                animation: 'slide_from_right',
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
              name="DiaryDailyCourseMap"
              component={DiaryDailyCourseMapScreen}
              options={{
                animation: 'slide_from_right',
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
