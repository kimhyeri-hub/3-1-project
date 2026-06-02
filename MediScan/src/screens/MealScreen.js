import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform, Animated, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../utils/theme';
import {
  scheduleMealNotification,
  cancelNotification,
  requestNotificationPermission,
} from '../services/notificationService';

const MEAL_TYPES = [
  { key: 'breakfast', label: '아침', icon: 'sunny-outline', time: '07:00 - 09:00', color: '#F5A623' },
  { key: 'lunch', label: '점심', icon: 'partly-sunny-outline', time: '11:30 - 13:30', color: '#4BC4B8' },
  { key: 'dinner', label: '저녁', icon: 'moon-outline', time: '18:00 - 20:00', color: '#4A6FA5' },
];

const TIME_OPTIONS = [
  { label: '10분', value: 10, desc: '빠른복용' },
  { label: '30분', value: 30, desc: '권장' },
  { label: '60분', value: 60, desc: '1시간' },
  { label: '직접설정', value: 0, desc: '입력' },
];

export default function MealScreen() {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [selectedTime, setSelectedTime] = useState(30);
  const [isCustom, setIsCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [timerState, setTimerState] = useState('idle');
  const [remaining, setRemaining] = useState(30 * 60);
  const [notifId, setNotifId] = useState(null);
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const customAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const showCustomInput = (show) => {
    Animated.timing(customAnim, {
      toValue: show ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleTimeSelect = (option) => {
    if (option.value === 0) {
      setIsCustom(true);
      setSelectedTime(0);
      showCustomInput(true);
    } else {
      setIsCustom(false);
      setSelectedTime(option.value);
      showCustomInput(false);
    }
  };

  const getFinalMinutes = () => isCustom ? customMinutes : selectedTime;

  const startTimer = async () => {
    if (!selectedMeal) return;
    const minutes = getFinalMinutes();
    if (minutes < 1 || minutes > 180) {
      Alert.alert('알림', '1분에서 180분 사이로 입력해주세요.');
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) Alert.alert('알림 권한 필요', '약 복용 알림을 받으려면 알림 권한을 허용해주세요.');

    try {
      const id = await scheduleMealNotification(selectedMeal, minutes);
      setNotifId(id);
    } catch (e) { console.warn('알림 예약 실패:', e); }

    const total = minutes * 60;
    setRemaining(total);
    setTimerState('running');
    Animated.timing(progressAnim, {
      toValue: 0, duration: total * 1000, useNativeDriver: false,
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
    setRemaining(getFinalMinutes() * 60);
    setNotifId(null);
  };

  const resetDone = () => {
    progressAnim.setValue(1);
    setTimerState('idle');
    setRemaining(30 * 60);
    setSelectedMeal(null);
    setSelectedTime(30);
    setIsCustom(false);
    showCustomInput(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  const customHeight = customAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 70],
  });

  const customOpacity = customAnim;

  const selectedMealInfo = MEAL_TYPES.find((m) => m.key === selectedMeal);
  const finalMinutes = getFinalMinutes();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>건강 도우미</Text>
        <Text style={styles.headerTitle}>식사 알림</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { flexGrow: 1 }]}>

        {timerState === 'idle' && (
          <>
            {/* 식사 선택 */}
            <Text style={styles.secLabel}>어떤 식사를 했나요?</Text>
            <View style={styles.mealGrid}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal.key}
                  style={[styles.mealCard, selectedMeal === meal.key && { borderColor: meal.color, borderWidth: 1.5, backgroundColor: meal.color + '15' }]}
                  onPress={() => setSelectedMeal(meal.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={meal.icon} size={22} color={selectedMeal === meal.key ? meal.color : COLORS.textMuted} />
                  <Text style={[styles.mealLabel, selectedMeal === meal.key && { color: meal.color }]}>{meal.label}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  {selectedMeal === meal.key && (
                    <View style={[styles.checkBadge, { backgroundColor: meal.color }]}>
                      <Ionicons name="checkmark" size={9} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 알림 시간 선택 */}
            <Text style={styles.secLabel}>알림 시간 선택</Text>
            <View style={styles.timeChips}>
              {TIME_OPTIONS.map((opt) => {
                const isActive = opt.value === 0 ? isCustom : selectedTime === opt.value && !isCustom;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.timeChip, isActive && styles.timeChipActive]}
                    onPress={() => handleTimeSelect(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipNum, isActive && styles.chipNumActive]}>{opt.label}</Text>
                    <Text style={[styles.chipDesc, isActive && styles.chipDescActive]}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 직접 입력 (애니메이션) */}
            <Animated.View style={[styles.customWrap, { height: customHeight, opacity: customOpacity, overflow: 'hidden' }]}>
              <View style={styles.customRow}>
                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() => setCustomMinutes(Math.max(1, customMinutes - 5))}
                >
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.customInput}
                  value={String(customMinutes)}
                  onChangeText={(v) => setCustomMinutes(Number(v.replace(/[^0-9]/g, '')) || 1)}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.customUnit}>분</Text>
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => setCustomMinutes(Math.min(180, customMinutes + 5))}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* 안내 박스 */}
            <View style={styles.infoBox}>
              <Ionicons name="alarm-outline" size={15} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {selectedMeal ? `${selectedMealInfo?.label} 식사 완료 후 ` : '식사 완료 후 '}
                <Text style={{ fontWeight: FONT.medium, color: COLORS.primaryDark }}>
                  {finalMinutes}분
                </Text>
                {' '}뒤에 약 복용 알림을 보내드려요
              </Text>
            </View>

            {/* 시작 버튼 */}
            <TouchableOpacity
              style={[styles.startBtn, !selectedMeal && styles.startBtnDisabled]}
              onPress={startTimer}
              disabled={!selectedMeal}
              activeOpacity={0.85}
            >
              <Ionicons name="alarm-outline" size={18} color="#fff" />
              <Text style={styles.startBtnText}>
                {selectedMeal ? `${selectedMealInfo?.label} 식사 완료` : '식사 종류를 선택해주세요'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {timerState === 'running' && (
          <View style={styles.timerCard}>
            <View style={[styles.timerBadge, { backgroundColor: (selectedMealInfo?.color || COLORS.primary) + '20' }]}>
              <Ionicons name={selectedMealInfo?.icon} size={14} color={selectedMealInfo?.color} />
              <Text style={[styles.timerBadgeText, { color: selectedMealInfo?.color }]}>
                {selectedMealInfo?.label} 식사 완료 · {finalMinutes}분 후 알림
              </Text>
            </View>
            <View style={[styles.timerCircle, { borderColor: selectedMealInfo?.color }]}>
              <Text style={[styles.timerNum, { color: selectedMealInfo?.color }]}>{formatTime(remaining)}</Text>
              <Text style={styles.timerUnit}>남은 시간</Text>
            </View>
            <Text style={styles.timerCaption}>{finalMinutes}분 후 약 복용 알림이 울려요</Text>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: selectedMealInfo?.color }]} />
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelTimer}>
              <Text style={styles.cancelText}>타이머 취소</Text>
            </TouchableOpacity>
          </View>
        )}

        {timerState === 'done' && (
          <View style={styles.doneCard}>
            <View style={styles.doneIconWrap}>
              <Ionicons name="checkmark" size={30} color="#fff" />
            </View>
            <Text style={styles.doneTitle}>약 복용 시간입니다!</Text>
            <Text style={styles.doneDesc}>
              {selectedMealInfo?.label} 식사 후 {finalMinutes}분이 지났어요.{'\n'}처방약을 복용해주세요.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={resetDone}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.startBtnText}>복용 완료</Text>
            </TouchableOpacity>
          </View>
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
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: FONT.medium, color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  secLabel: { fontSize: 13, fontWeight: FONT.medium, color: COLORS.textPrimary, marginBottom: 10 },

  mealGrid: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  mealCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
    position: 'relative',
  },
  mealLabel: { fontSize: 13, fontWeight: FONT.medium, color: COLORS.textSecondary },
  mealTime: { fontSize: 9, color: COLORS.textMuted },
  checkBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  timeChips: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  timeChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  timeChipActive: { borderColor: COLORS.primary, borderWidth: 1.5, backgroundColor: COLORS.primaryLight },
  chipNum: { fontSize: 13, fontWeight: FONT.medium, color: COLORS.textSecondary },
  chipNumActive: { color: COLORS.primary },
  chipDesc: { fontSize: 9, color: COLORS.textMuted },
  chipDescActive: { color: COLORS.primary },

  customWrap: { marginBottom: 4 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  minusBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  plusBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  customInput: {
    flex: 1, textAlign: 'center',
    fontSize: 22, fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
  },
  customUnit: { fontSize: 13, color: COLORS.textSecondary },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: COLORS.primaryMid,
    marginBottom: 14,
  },
  infoText: { fontSize: 12, color: COLORS.primaryDark, lineHeight: 18, flex: 1 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingVertical: 14,
  },
  startBtnDisabled: { backgroundColor: COLORS.border },
  startBtnText: { fontSize: 15, fontWeight: FONT.medium, color: '#fff' },

  timerCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 24, alignItems: 'center',
    borderWidth: 0.5, borderColor: COLORS.border,
  },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, marginBottom: 20,
  },
  timerBadgeText: { fontSize: 12, fontWeight: FONT.medium },
  timerCircle: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  timerNum: { fontSize: 36, fontWeight: FONT.medium, letterSpacing: -1 },
  timerUnit: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  timerCaption: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 18 },
  progressTrack: {
    width: '80%', height: 4, backgroundColor: COLORS.borderLight,
    borderRadius: 2, overflow: 'hidden', marginBottom: 18,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  cancelBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border,
  },
  cancelText: { fontSize: 13, color: COLORS.textSecondary },

  doneCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 32, alignItems: 'center',
    borderWidth: 0.5, borderColor: COLORS.border, gap: 10,
  },
  doneIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  doneTitle: { fontSize: 20, fontWeight: FONT.medium, color: COLORS.textPrimary },
  doneDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 8 },
});