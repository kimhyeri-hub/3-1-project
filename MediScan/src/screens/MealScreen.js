import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../utils/theme';
import {
  scheduleMealNotification,
  cancelNotification,
  requestNotificationPermission,
} from '../services/notificationService';
import { Card, PrimaryButton, SectionHeader } from '../components/UIComponents';

const MEAL_TYPES = [
  { key: 'breakfast', label: '아침', icon: 'sunny-outline', time: '07:00 – 09:00' },
  { key: 'lunch', label: '점심', icon: 'partly-sunny-outline', time: '11:30 – 13:30' },
  { key: 'dinner', label: '저녁', icon: 'moon-outline', time: '18:00 – 20:00' },
];

const DELAY_MINUTES = 30; // 식후 30분 고정

export default function MealScreen() {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [timerState, setTimerState] = useState('idle'); // idle | running | done
  const [remaining, setRemaining] = useState(DELAY_MINUTES * 60);
  const [notifId, setNotifId] = useState(null);
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const startTimer = async () => {
    if (!selectedMeal) return;

    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('알림 권한 필요', '약 복용 알림을 받으려면 알림 권한을 허용해주세요.');
    }

    // 시스템 알림 예약
    try {
      const id = await scheduleMealNotification(selectedMeal, DELAY_MINUTES);
      setNotifId(id);
    } catch (e) {
      console.warn('알림 예약 실패:', e);
    }

    // 화면 타이머 시작
    const total = DELAY_MINUTES * 60;
    setRemaining(total);
    setTimerState('running');

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: total * 1000,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerState('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelTimer = async () => {
    clearInterval(intervalRef.current);
    progressAnim.stopAnimation();
    progressAnim.setValue(1);
    if (notifId) await cancelNotification(notifId);
    setTimerState('idle');
    setRemaining(DELAY_MINUTES * 60);
    setNotifId(null);
  };

  const resetDone = () => {
    progressAnim.setValue(1);
    setTimerState('idle');
    setRemaining(DELAY_MINUTES * 60);
    setSelectedMeal(null);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const mealLabel = MEAL_TYPES.find((m) => m.key === selectedMeal)?.label || '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>건강 도우미</Text>
        <Text style={styles.headerTitle}>식사 알림</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {timerState === 'idle' && (
          <>
            <SectionHeader title="어떤 식사를 했나요?" />
            <View style={styles.mealGrid}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealCard,
                    selectedMeal === meal.key && styles.mealCardSelected,
                  ]}
                  onPress={() => setSelectedMeal(meal.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={meal.icon}
                    size={24}
                    color={selectedMeal === meal.key ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.mealLabel,
                    selectedMeal === meal.key && styles.mealLabelSelected,
                  ]}>
                    {meal.label}
                  </Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="alarm-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>식후 30분 알림</Text>
                  <Text style={styles.infoDesc}>
                    식사 완료 버튼을 누르면 30분 후 약 복용 알림이 울립니다. 앱을 닫아도 알림이 옵니다.
                  </Text>
                </View>
              </View>
            </Card>

            <PrimaryButton
              title={selectedMeal ? `${mealLabel} 식사 완료 ✓` : '식사 종류를 먼저 선택하세요'}
              onPress={startTimer}
              disabled={!selectedMeal}
            />
          </>
        )}

        {timerState === 'running' && (
          <>
            <Card>
              <View style={styles.timerCenter}>
                <Text style={styles.timerMealLabel}>{mealLabel} 식사 완료</Text>
                <View style={styles.timerCircle}>
                  <Text style={styles.timerTime}>{formatTime(remaining)}</Text>
                  <Text style={styles.timerUnitText}>남은 시간</Text>
                </View>
                <Text style={styles.timerCaption}>30분 후 약 복용 알림이 울려요</Text>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>

                <TouchableOpacity style={styles.cancelBtn} onPress={cancelTimer}>
                  <Text style={styles.cancelText}>타이머 취소</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}

        {timerState === 'done' && (
          <Card>
            <View style={styles.doneCenter}>
              <View style={styles.doneIconWrap}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </View>
              <Text style={styles.doneTitle}>약 복용 시간입니다!</Text>
              <Text style={styles.doneDesc}>
                {mealLabel} 식사 후 30분이 지났어요.{'\n'}처방약을 복용해주세요.
              </Text>
              <PrimaryButton
                title="복용 완료"
                onPress={resetDone}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 20,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: FONT.medium,
    color: '#fff',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  mealGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  mealCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  mealCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: COLORS.primaryLight,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: FONT.medium,
    color: COLORS.textSecondary,
  },
  mealLabelSelected: { color: COLORS.primary },
  mealTime: { fontSize: 10, color: COLORS.textMuted },
  infoCard: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  infoDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  timerCenter: { alignItems: 'center', paddingVertical: 16 },
  timerMealLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  timerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerTime: {
    fontSize: 38,
    fontWeight: FONT.medium,
    color: COLORS.primary,
    letterSpacing: -1,
  },
  timerUnitText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  timerCaption: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  progressTrack: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  doneCenter: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  doneIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
  },
  doneDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
