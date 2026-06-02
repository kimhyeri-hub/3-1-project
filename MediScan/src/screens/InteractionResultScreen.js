import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../utils/theme';
import { Card, InfoRow, WarningBox, SectionHeader } from '../components/UIComponents';

const DUMMY_RESULT = {
  medicineName: '타이레놀 500mg',
  ingredient: '아세트아미노펜 500mg',
  effect: '해열, 진통 (두통, 치통, 생리통)',
  dosage: {
    perDose: '1정',
    frequency: '1일 3~4회',
    timing: '식후 30분',
    maxDaily: '4g 초과 금지',
  },
  warnings: [
    '알코올 복용 시 간독성 위험',
    '동일 성분 중복 복용 금지',
  ],
};

export default function InteractionResultScreen({ result, onBack }) {
  const data = result || DUMMY_RESULT;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 결과</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.medHeader}>
            <View style={styles.medIconWrap}>
              <Ionicons name="medical" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{data.medicineName}</Text>
              <Text style={styles.medSub}>{data.ingredient}</Text>
            </View>
          </View>
          <SectionHeader title="성분 및 효능" />
          <View style={styles.ingredientRow}>
            <View style={styles.ingredientDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ingredientName}>{data.ingredient}</Text>
              <Text style={styles.ingredientEffect}>{data.effect}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="복용법 / 용량" />
          <InfoRow label="1회 복용량" value={data.dosage.perDose} />
          <InfoRow label="복용 횟수" value={data.dosage.frequency} />
          <InfoRow label="복용 시기" value={data.dosage.timing} />
          <InfoRow label="1일 최대" value={data.dosage.maxDaily} last />
        </Card>

        <Card>
          <SectionHeader title="주의사항" />
          {data.warnings.map((w, i) => (
            <WarningBox key={i} text={w} type="warning" />
          ))}
        </Card>

        <TouchableOpacity
          style={styles.compareBtn}
          activeOpacity={0.85}
          onPress={() => {}}
        >
          <Ionicons name="git-compare-outline" size={18} color="#fff" />
          <Text style={styles.compareBtnText}>다른 약과 비교하기</Text>
        </TouchableOpacity>

        <Text style={styles.backendNote}>
          * 백엔드 연결 후 실제 식약처 데이터로 비교됩니다
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: FONT.medium, color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  medIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: {
    fontSize: 17,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  medSub: { fontSize: 12, color: COLORS.textMuted },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryMid,
    marginTop: 5,
    flexShrink: 0,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
  },
  ingredientEffect: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    marginBottom: 10,
  },
  compareBtnText: {
    fontSize: 15,
    fontWeight: FONT.medium,
    color: '#fff',
  },
  backendNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});