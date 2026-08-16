import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { FloatingTabBar } from '../components/navigation/FloatingTabBar';
import { HomeScreen } from '../screens/main/HomeScreen';
import { MapScreen } from '../screens/main/MapScreen';
import { MyPageScreen } from '../screens/main/MyPageScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** AI 탭·진입은 일시 제외. AIScreen / AICourse* 파일·스택 라우트는 보관. */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: 'My Page' }} />
    </Tab.Navigator>
  );
}
