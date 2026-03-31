import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../utils/theme';
import { Card, Badge } from '../components/UIComponents';

// 예시 데이터 (실제 앱에서는 useHistory 훅으로 AsyncStorage에서 불러옴)
const MOCK_HISTORY = [
  {
    id: '1',
    type: 'medicine',
    title: '타이레놀 500mg',
    subtitle: '아세트아미노펜 · 해열/진통',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'done',
  },
  {
    id: '2',
    type: 'meal',
    title: '점심 식사 알림',
    subtitle: '30분 후 알림 · 오후 12:30',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: 'taken',
  },
  {
    id: '3',
    type: 'meal',
    title: '아침 식사 알림',
    subtitle: '30분 후 알림 · 오전 08:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    status: 'missed',
  },
  {
    id: '4',
    type: 'medicine',
    title: '게보린',
    subtitle: '이소프로필안티피린 · 진통',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'done',
  },
  {
    id: '5',
    type: 'meal',
    title: '저녁 식사 알림',
    subtitle: '30분 후 알림 · 오후 07:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
    status: 'taken',
  },
];

const STATUS_CONFIG = {
  done: { label: '분석완료', type: 'success' },
  taken: { label: '복용완료', type: 'success' },
  missed: { label: '미복용', type: 'warning' },
};

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function HistoryScreen() {
  const medicineCount = MOCK_HISTORY.filter((h) => h.type === 'medicine').length;
  const takenCount = MOCK_HISTORY.filter((h) => h.status === 'taken').length;
  const missedCount = MOCK_HISTORY.filter((h) => h.status === 'missed').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>건강 도우미</Text>
        <Text style={styles.headerTitle}>기록</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="medical" size={18} color={COLORS.primary} />
            <Text style={styles.statNumber}>{medicineCount}</Text>
            <Text style={styles.statLabel}>약 분석</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            <Text style={styles.statNumber}>{takenCount}</Text>
            <Text style={styles.statLabel}>복용완료</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={18} color={COLORS.amber} />
            <Text style={[styles.statNumber, { color: COLORS.amber }]}>{missedCount}</Text>
            <Text style={styles.statLabel}>미복용</Text>
          </View>
        </View>

        {/* History List */}
        <Text style={styles.sectionTitle}>최근 활동</Text>
        {MOCK_HISTORY.map((item) => {
          const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.done;
          const isMedicine = item.type === 'medicine';
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.7}>
              <Card style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View style={[
                    styles.historyIcon,
                    { backgroundColor: isMedicine ? COLORS.primaryLight : COLORS.amberLight },
                  ]}>
                    <Ionicons
                      name={isMedicine ? 'medical-outline' : 'restaurant-outline'}
                      size={16}
                      color={isMedicine ? COLORS.primary : COLORS.amber}
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historySub}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Badge label={statusConf.label} type={statusConf.type} />
                    <Text style={styles.historyTime}>{formatRelativeTime(item.timestamp)}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Clear Button */}
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => Alert.alert('기록 삭제', '모든 기록을 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => {} },
          ])}
        >
          <Text style={styles.clearText}>기록 전체 삭제</Text>
        </TouchableOpacity>
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
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2, letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: FONT.medium, color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  historyCard: { paddingVertical: 12 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  historyInfo: { flex: 1 },
  historyTitle: {
    fontSize: 14,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  historySub: { fontSize: 12, color: COLORS.textMuted },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyTime: { fontSize: 11, color: COLORS.textMuted },
  clearBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.danger,
  },
});
