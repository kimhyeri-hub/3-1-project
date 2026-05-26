import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../utils/theme';
import { Card, Badge } from '../components/UIComponents';
import { api } from '../services/apiService';

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
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const logs = await api.getNotificationLogs();
      if (logs && Array.isArray(logs)) {
        const mapped = logs.map((log) => ({
          id: String(log.log_id),
          type: 'meal',
          title: log.medicine_name,
          subtitle: `복약 예정 · ${new Date(log.scheduled_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`,
          timestamp: log.scheduled_time,
          status: log.is_taken ? 'taken' : 'missed',
          log_id: log.log_id,
        }));
        setHistory(mapped);
      }
    } catch (e) {
      console.warn('기록 불러오기 실패:', e);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleMarkTaken = async (logId) => {
    try {
      await api.markAsTaken(logId);
      setHistory((prev) =>
        prev.map((h) => h.log_id === logId ? { ...h, status: 'taken' } : h)
      );
    } catch (e) {
      Alert.alert('오류', '복용 완료 처리에 실패했습니다.');
    }
  };

  const displayList = history;
  const takenCount = displayList.filter((h) => h.status === 'taken').length;
  const missedCount = displayList.filter((h) => h.status === 'missed').length;
  const totalCount = displayList.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>건강 도우미</Text>
        <Text style={styles.headerTitle}>기록</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="list" size={18} color={COLORS.primary} />
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>전체 알림</Text>
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
        <Text style={styles.sectionTitle}>복약 알림 기록</Text>
        {displayList.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>기록이 없습니다.</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
              아래로 당겨서 새로고침 하거나 식사 알림을 눌러보세요.
            </Text>
          </View>
        ) : (
          displayList.map((item) => {
            const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.done;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.status !== 'taken' && item.log_id) {
                    Alert.alert('복용 완료', '복용 완료로 기록할까요?', [
                      { text: '취소', style: 'cancel' },
                      { text: '확인', onPress: () => handleMarkTaken(item.log_id) },
                    ]);
                  }
                }}
              >
                <Card style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <View style={[styles.historyIcon, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="medical-outline" size={16} color={COLORS.primary} />
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
          })
        )}

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
