import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs();
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import HomeScreen from './src/screens/HomeScreen';
import MedicineScreen from './src/screens/MedicineScreen';
import MealScreen from './src/screens/MealScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { COLORS } from './src/utils/theme';

// 앱 포그라운드 상태에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    // 알림 권한 요청
    Notifications.requestPermissionsAsync();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
  '홈': focused ? 'home' : 'home-outline',
  '약 분석': focused ? 'medical' : 'medical-outline',
  '식사 알림': focused ? 'restaurant' : 'restaurant-outline',
  '기록': focused ? 'time' : 'time-outline',
};
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 0.5,
            paddingBottom: 40,
            paddingTop: 6,
            height: 90,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="약 분석" component={MedicineScreen} />
        <Tab.Screen name="식사 알림" component={MealScreen} />
        <Tab.Screen name="기록" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
import { registerRootComponent } from 'expo';
registerRootComponent(App);
