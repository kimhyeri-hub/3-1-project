import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, FONT, SHADOW } from '../utils/theme';

const STORAGE_KEY = 'my_medicines';

export default function MyMedicineScreen({ onShowResult }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, [])
  );

  const loadMedicines = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setMedicines(raw ? JSON.parse(raw) : []);
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

  const deleteMedicine = (id) => {
    Alert.alert('약을 삭제할까요?', '목록에서 삭제합니다. 이 작업은 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = medicines.filter((m) => m.id !== id);
          setMedicines(updated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        },
      },
    ]);
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
            {medicines.map((med) => (
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
                  <TouchableOpacity style={styles.delBtn} onPress={() => deleteMedicine(med.id)} activeOpacity={0.7}>
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
              </TouchableOpacity>
            ))}
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