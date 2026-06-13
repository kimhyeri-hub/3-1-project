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
          {data.simpleDescription && (
            <View style={styles.simpleDescBox}>
              <Ionicons name="bulb-outline" size={14} color={COLORS.primary} />
              <Text style={styles.simpleDescText}>{data.simpleDescription}</Text>
            </View>
          )}
          <SectionHeader title="성분 및 효능" />
          {data.ingredients?.length > 0 ? (
            data.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingredientName}>
                    {ing.name}{ing.amount ? ` (${ing.amount})` : ''}
                  </Text>
                  <Text style={styles.ingredientEffect}>{ing.effect}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.ingredientRow}>
              <View style={styles.ingredientDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ingredientName}>{data.ingredient || '정보 없음'}</Text>
                <Text style={styles.ingredientEffect}>{data.effect}</Text>
              </View>
            </View>
          )}
        </Card>

        <Card>
          <SectionHeader title="복용법 / 용량" />
          <InfoRow label="1회 복용량" value={data.dosage?.perDose} />
          <InfoRow label="복용 횟수" value={data.dosage?.frequency} />
          <InfoRow label="복용 시기" value={data.dosage?.timing} />
          <InfoRow label="1일 최대" value={data.dosage?.maxDaily} last />
        </Card>

        {data.warnings?.length > 0 && (
          <Card>
            <SectionHeader title="주의사항" />
            {data.warnings.map((w, i) => (
              <WarningBox key={i} text={w} type="warning" />
            ))}
          </Card>
        )}

        {data.interaction_check && (
          <Card>
            <View style={styles.conflictHeader}>
              <Ionicons
                name={data.interaction_check.hasConflict ? 'warning' : 'checkmark-circle'}
                size={20}
                color={data.interaction_check.hasConflict ? '#E53935' : '#43A047'}
              />
              <Text style={[
                styles.conflictTitle,
                { color: data.interaction_check.hasConflict ? '#E53935' : '#43A047' }
              ]}>
                {data.interaction_check.hasConflict ? '복용 중인 약과 충돌 있음' : '복용 중인 약과 충돌 없음'}
              </Text>
            </View>
            {data.interaction_check.summary && (
              <Text style={styles.conflictSummary}>{data.interaction_check.summary}</Text>
            )}
            {data.interaction_check.conflicts?.map((c, i) => (
              <View key={i} style={styles.conflictItem}>
                <View style={styles.conflictItemHeader}>
                  <Text style={styles.conflictMedName}>{c.existingMedicine}</Text>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: c.severity === '위험' ? '#FFEBEE' : '#FFF8E1' }
                  ]}>
                    <Text style={[
                      styles.severityText,
                      { color: c.severity === '위험' ? '#E53935' : '#F9A825' }
                    ]}>{c.severity}</Text>
                  </View>
                </View>
                <Text style={styles.conflictDesc}>{c.description}</Text>
              </View>
            ))}
          </Card>
        )}

        {data.official_interaction_check && (
          <Card>
            <View style={styles.conflictHeader}>
              <Ionicons
                name={data.official_interaction_check.is_prohibited ? 'warning' : 'checkmark-circle'}
                size={20}
                color={data.official_interaction_check.is_prohibited ? '#E53935' : '#43A047'}
              />
              <Text style={[
                styles.conflictTitle,
                { color: data.official_interaction_check.is_prohibited ? '#E53935' : '#43A047' }
              ]}>
                {data.official_interaction_check.is_prohibited ? '식약처 병용금기 등록 약물 있음' : '식약처 병용금기 없음'}
              </Text>
            </View>
            {data.official_interaction_check.matched_interactions?.map((m, i) => (
              <View key={i} style={styles.conflictItem}>
                <Text style={styles.conflictMedName}>{m.drug_a} ↔ {m.drug_b}</Text>
                <Text style={styles.conflictDesc}>{m.reason}</Text>
              </View>
            ))}
          </Card>
        )}

        {data.dur_info?.length > 0 && (
          <Card>
            <SectionHeader title="DUR 안전 정보 (식약처)" />
            {data.dur_info.map((d, i) => (
              <WarningBox key={i} text={`[${d.type_name}] ${d.prohbt_content}`} type="warning" />
            ))}
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
  simpleDescBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 10,
  },
  simpleDescText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primaryDark,
    lineHeight: 18,
  },
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
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  conflictTitle: { fontSize: 15, fontWeight: FONT.medium },
  conflictSummary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  conflictItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  conflictItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictMedName: { fontSize: 14, fontWeight: FONT.medium, color: COLORS.textPrimary },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: { fontSize: 11, fontWeight: FONT.medium },
  conflictDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
});