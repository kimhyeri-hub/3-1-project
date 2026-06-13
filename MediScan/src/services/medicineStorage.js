import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelNotification } from './notificationService';

const STORAGE_KEY = 'my_medicines';

export async function getMedicines() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getMedicinesForInteractionCheck() {
  const list = await getMedicines();
  return list.map((m) => ({
    name: m.name,
    ingredient: m.fullData?.ingredient || m.ingredient || '',
  }));
}

export async function addMedicine(newMed) {
  const list = await getMedicines();
  list.push(newMed);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export async function updateMedicine(id, updater) {
  const list = await getMedicines();
  const updated = list.map((m) => (m.id === id ? updater(m) : m));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteMedicine(id) {
  const list = await getMedicines();
  const target = list.find((m) => m.id === id);
  for (const t of target?.schedule?.times || []) {
    if (t.notificationId) {
      try {
        await cancelNotification(t.notificationId);
      } catch (e) {
        console.warn('알림 취소 실패:', e);
      }
    }
  }
  const updated = list.filter((m) => m.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
