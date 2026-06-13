import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();
import React, { useEffect, useState } from 'react';
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
import MyMedicineScreen from './src/screens/MyMedicineScreen';
import InteractionResultScreen from './src/screens/InteractionResultScreen';
import PillIdentifyScreen from './src/screens/PillIdentifyScreen';
import SplashScreen from './src/screens/SplashScreen';
import { COLORS } from './src/utils/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();

function MedicineTab() {
  const [resultData, setResultData] = useState(null);

  if (resultData) {
    return (
      <InteractionResultScreen
        result={resultData}
        onBack={() => setResultData(null)}
      />
    );
  }

  return (
    <MedicineScreen onAnalyzeDone={(data) => setResultData(data)} />
  );
}

function MyMedicineTab() {
  const [resultData, setResultData] = useState(null);

  if (resultData) {
    return (
      <InteractionResultScreen
        result={resultData}
        onBack={() => setResultData(null)}
      />
    );
  }

  return (
    <MyMedicineScreen onShowResult={(data) => setResultData(data)} />
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                const icons = {
                  '홈': focused ? 'home' : 'home-outline',
                  '약 분석': focused ? 'medical' : 'medical-outline',
                  '내 약': focused ? 'heart' : 'heart-outline',
                  '낱알 식별': focused ? 'search-circle' : 'search-circle-outline',
                  '식사 알림': focused ? 'restaurant' : 'restaurant-outline',
                };
                return <Ionicons name={icons[route.name]} size={size} color={color} />;
              },
              tabBarActiveTintColor: COLORS.primary,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarStyle: {
                backgroundColor: COLORS.surface,
                borderTopColor: COLORS.border,
                borderTopWidth: 0.5,
                paddingBottom: 20,
                paddingTop: 6,
                height: 70,
              },
              tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
              headerShown: false,
            })}
          >
            <Tab.Screen name="홈" component={HomeScreen} />
            <Tab.Screen name="약 분석" component={MedicineTab} />
            <Tab.Screen name="내 약" component={MyMedicineTab} />
            <Tab.Screen name="낱알 식별" component={PillIdentifyScreen} />
            <Tab.Screen name="식사 알림" component={MealScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      )}
    </>
  );
}

import { registerRootComponent } from 'expo';
registerRootComponent(App);