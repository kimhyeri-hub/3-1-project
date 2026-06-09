import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const USER_ID_KEY = 'yakssok_user_id';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function getUserId() {
  try {
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) return stored;

    let deviceId = '';
    if (Platform.OS === 'android') {
      deviceId = Application.androidId || '';
    } else {
      deviceId = (await Application.getIosIdForVendorAsync()) || '';
    }

    const deviceName = Device.deviceName || '';
    const modelName = Device.modelName || '';
    const brand = Device.brand || '';
    const osVersion = Device.osVersion || '';

    const raw = `${deviceId}_${deviceName}_${modelName}_${brand}_${osVersion}`;
    const userId = simpleHash(raw);

    await AsyncStorage.setItem(USER_ID_KEY, userId);
    return userId;
  } catch (e) {
    return 'unknown_user';
  }
}
