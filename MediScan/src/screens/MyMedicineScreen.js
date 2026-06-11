import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, FONT, SHADOW } from '../utils/theme';
import {
  getMedicines, deleteMedicine, addScheduleTime, removeScheduleTime,
  dismissSuggestion as dismissSuggestionApi,
} from '../services/medicineStorage';
import {
  scheduleDailyMedicationReminder,
  cancelNotification,
  requestNotificationPermission,
} from '../services/notificationService';
import { parseFrequencyCount, suggestTimesForCount } from '../utils/scheduleUtils';

const formatHM = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export default function MyMedicineScreen({ onShowResult }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [draftTimes, setDraftTimes] = useState({});
  const animRefs = useRef({});

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, [])
  );

  const loadMedicines = async () => {
    try {
      const list = await getMedicines();
      setMedicines(list);
    } catch (e) {
      console.error('불러오기 실패:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMedicines();
  };

  const handleDelete = (id) => {
    Alert.alert('약을 삭제할까요?', '목록에서 삭제합니다. 이 작업은 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = await deleteMedicine(id);
          setMedicines(updated);
        },
      },
    ]);
  };

  const getAnim = (id) => {
    if (!animRefs.current[id]) animRefs.current[id] = new Animated.Value(0);
    return animRefs.current[id];
  };

  const toggleAddTime = (id) => {
    const isExpanding = expandedId !== id;
    if (expandedId && expandedId !== id) {
      Animated.timing(getAnim(expandedId), { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
    Animated.timing(getAnim(id), { toValue: isExpanding ? 1 : 0, duration: 250, useNativeDriver: false }).start();
    setExpandedId(isExpanding ? id : null);
    if (isExpanding && !draftTimes[id]) {
      setDraftTimes((prev) => ({ ...prev, [id]: { hour: 8, minute: 0 } }));
    }
  };

  const updateDraftHour = (id, delta) => {
    setDraftTimes((prev) => {
      const cur = prev[id] || { hour: 8, minute: 0 };
      return { ...prev, [id]: { ...cur, hour: (cur.hour + delta + 24) % 24 } };
    });
  };

  const updateDraftMinute = (id, delta) => {
    setDraftTimes((prev) => {
      const cur = prev[id] || { hour: 8, minute: 0 };
      return { ...prev, [id]: { ...cur, minute: (cur.minute + delta + 60) % 60 } };
    });
  };

  const addReminderTime = async (med, hour, minute) => {
    let notificationId = null;
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        notificationId = await scheduleDailyMedicationReminder(med.name, hour, minute);
      }
    } catch (e) {
      console.warn('알림 예약 실패:', e);
    }
    const updated = await addScheduleTime(med.id, hour, minute, notificationId);
    setMedicines(updated);
  };

  const confirmAddTime = async (med) => {
    const draft = draftTimes[med.id] || { hour: 8, minute: 0 };
    await addReminderTime(med, draft.hour, draft.minute);
    toggleAddTime(med.id);
  };

  const removeReminderTime = async (med, timeEntry) => {
    if (timeEntry.notificationId) {
      try {
        await cancelNotification(timeEntry.notificationId);
      } catch (e) {
        console.warn('알림 취소 실패:', e);
      }
    }
    const updated = await removeScheduleTime(med.id, timeEntry.id);
    setMedicines(updated);
  };

  const applySuggestion = async (med) => {
    const count = parseFrequencyCount(med.fullData?.dosage?.frequency);
    const times = suggestTimesForCount(count);
    for (const t of times) {
      await addReminderTime(med, t.hour, t.minute);
    }
  };

  const dismissSuggestion = async (med) => {
    const updated = await dismissSuggestionApi(med.id);
    setMedicines(updated);
  };

  const TAG_COLORS = {
    '해열·진통': { bg: COLORS.primaryLight, text: COLORS.primaryDark },
    '혈액순환': { bg: COLORS.primaryLight, text: COLORS.primaryDark },
    '영양제': { bg: COLORS.primaryLight, text: COLORS.primaryDark },
    '식후 복용': { bg: COLORS.amberLight, text: COLORS.warningDark },
    '공복 금지': { bg: COLORS.dangerLight, text: COLORS.dangerDark },
    '주의 필요': { bg: COLORS.dangerLight, text: COLORS.dangerDark },
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>건강 도우미</Text>
        <Text style={styles.headerTitle}>내 약 목록</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >

        {loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>불러오는 중...</Text>
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="medical-outline" size={40} color={COLORS.primaryMid} />
            </View>
            <Text style={styles.emptyTitle}>등록된 약이 없어요</Text>
            <Text style={styles.emptySub}>약봉투를 스캔하면{'\n'}자동으로 여기에 추가돼요</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>복용 중인 약 {medicines.length}개</Text>
            {medicines.map((med) => {
              const freqCount = parseFrequencyCount(med.fullData?.dosage?.frequency);
              const suggestedTimes = suggestTimesForCount(freqCount);
              const showSuggestion = !!freqCount
                && (!med.schedule?.times || med.schedule.times.length === 0)
                && !med.schedule?.suggestionDismissed;
              const suggestionTimesText = suggestedTimes.map((t) => formatHM(t.hour, t.minute)).join(', ');
              const sortedTimes = med.schedule?.times
                ? [...med.schedule.times].sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))
                : [];
              const draft = draftTimes[med.id] || { hour: 8, minute: 0 };

              return (
                <TouchableOpacity
                  key={med.id}
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() => med.fullData && onShowResult?.(med.fullData)}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.medIcon}>
                      <Ionicons name="medical" size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medDetail}>{med.ingredient} · {med.dosage}</Text>
                    </View>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(med.id)} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  {med.tags?.length > 0 && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.tags}>
                        {med.tags.map((tag, i) => {
                          const c = TAG_COLORS[tag] || { bg: COLORS.borderLight, text: COLORS.textSecondary };
                          return (
                            <View key={i} style={[styles.tag, { backgroundColor: c.bg }]}>
                              <Text style={[styles.tagText, { color: c.text }]}>{tag}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}

                  <View style={styles.divider} />
                  <View style={styles.scheduleSection}>
                    <View style={styles.scheduleHeader}>
                      <Ionicons name="alarm-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.scheduleLabel}>복약 알림</Text>
                    </View>

                    {sortedTimes.length > 0 && (
                      <View style={styles.timeChipRow}>
                        {sortedTimes.map((t) => (
                          <View key={t.id} style={styles.timeChip}>
                            <Text style={styles.timeChipText}>{formatHM(t.hour, t.minute)}</Text>
                            <TouchableOpacity
                              onPress={() => removeReminderTime(med, t)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="close" size={12} color={COLORS.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {showSuggestion && (
                      <View style={styles.suggestBanner}>
                        <Text style={styles.suggestText}>
                          이 약은 [{med.fullData.dosage.frequency}] 복용 약이에요.{'\n'}
                          추천 시간({suggestionTimesText})으로 알림을 설정할까요?
                        </Text>
                        <View style={styles.suggestBtnRow}>
                          <TouchableOpacity style={styles.suggestApplyBtn} onPress={() => applySuggestion(med)} activeOpacity={0.85}>
                            <Text style={styles.suggestApplyText}>설정</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.suggestDismissBtn} onPress={() => dismissSuggestion(med)} activeOpacity={0.85}>
                            <Text style={styles.suggestDismissText}>닫기</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.addTimeBtn} onPress={() => toggleAddTime(med.id)} activeOpacity={0.8}>
                      <Ionicons
                        name={expandedId === med.id ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={14}
                        color={COLORS.primary}
                      />
                      <Text style={styles.addTimeBtnText}>{expandedId === med.id ? '취소' : '알림 추가'}</Text>
                    </TouchableOpacity>

                    <Animated.View
                      style={[
                        styles.timeStepperWrap,
                        {
                          height: getAnim(med.id).interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
                          opacity: getAnim(med.id),
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      <View style={styles.timeStepperRow}>
                        <View style={styles.stepperGroup}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => updateDraftHour(med.id, -1)}>
                            <Ionicons name="remove" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                          <Text style={styles.stepperValue}>{String(draft.hour).padStart(2, '0')}시</Text>
                          <TouchableOpacity style={[styles.stepBtn, styles.stepBtnFill]} onPress={() => updateDraftHour(med.id, 1)}>
                            <Ionicons name="add" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.stepperGroup}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => updateDraftMinute(med.id, -10)}>
                            <Ionicons name="remove" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                          <Text style={styles.stepperValue}>{String(draft.minute).padStart(2, '0')}분</Text>
                          <TouchableOpacity style={[styles.stepBtn, styles.stepBtnFill]} onPress={() => updateDraftMinute(med.id, 10)}>
                            <Ionicons name="add" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.confirmTimeBtn} onPress={() => confirmAddTime(med)} activeOpacity={0.85}>
                          <Text style={styles.confirmTimeBtnText}>추가</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
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
  countLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: FONT.medium, color: COLORS.textPrimary, marginBottom: 2 },
  medDetail: { fontSize: 11, color: COLORS.textMuted },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  divider: { height: 0.5, backgroundColor: COLORS.borderLight, marginVertical: 8 },
  tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  tagText: { fontSize: 10, fontWeight: FONT.medium },

  scheduleSection: { gap: 8 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scheduleLabel: { fontSize: 12, fontWeight: FONT.medium, color: COLORS.textPrimary },

  timeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
  },
  timeChipText: { fontSize: 11, fontWeight: FONT.medium, color: COLORS.primaryDark },

  suggestBanner: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 8,
    borderWidth: 0.5,
    borderColor: COLORS.primaryMid,
  },
  suggestText: { fontSize: 11.5, color: COLORS.primaryDark, lineHeight: 17 },
  suggestBtnRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  suggestApplyBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.primary,
  },
  suggestApplyText: { fontSize: 11, fontWeight: FONT.medium, color: '#fff' },
  suggestDismissBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border,
  },
  suggestDismissText: { fontSize: 11, color: COLORS.textSecondary },

  addTimeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
  },
  addTimeBtnText: { fontSize: 12, fontWeight: FONT.medium, color: COLORS.primary },

  timeStepperWrap: { marginTop: 0 },
  timeStepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 8,
  },
  stepperGroup: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnFill: { backgroundColor: COLORS.primary },
  stepperValue: { fontSize: 12, fontWeight: FONT.medium, color: COLORS.textPrimary, minWidth: 30, textAlign: 'center' },
  confirmTimeBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
  },
  confirmTimeBtnText: { fontSize: 12, fontWeight: FONT.medium, color: '#fff' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: FONT.medium, color: COLORS.textPrimary },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
