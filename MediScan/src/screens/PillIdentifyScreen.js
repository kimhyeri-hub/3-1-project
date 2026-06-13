import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  SafeAreaView, Platform, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SHADOW } from '../utils/theme';
import { Card, Badge, InfoRow, PrimaryButton, WarningBox } from '../components/UIComponents';
import { identifyPill, checkPillInteraction } from '../services/pillApi';
import { addMedicine, getMedicinesForInteractionCheck } from '../services/medicineStorage';
import { getUserId } from '../services/userService';

const COLOR_OPTIONS = ['하양', '노랑', '주황', '분홍', '빨강', '갈색', '연두', '초록', '청록', '파랑', '남색', '자주', '보라', '회색', '검정'];
const SHAPE_OPTIONS = ['원형', '타원형', '장방형', '삼각형', '사각형', '마름모형', '오각형', '육각형', '팔각형', '반원형'];

export default function PillIdentifyScreen() {
  const [mode, setMode] = useState('name');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [shape, setShape] = useState('');
  const [markFront, setMarkFront] = useState('');
  const [markBack, setMarkBack] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const canSearch = mode === 'name'
    ? name.trim().length > 0
    : Boolean(color || shape || markFront.trim() || markBack.trim());

  const handleSearch = async () => {
    if (!canSearch || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const params = mode === 'name'
        ? { name: name.trim() }
        : { color, shape, markFront: markFront.trim(), markBack: markBack.trim() };
      const items = await identifyPill(params);
      setResults(items);
    } catch (e) {
      setError(e.message || '검색 중 오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setResults(null);
    setError(null);
  };

  const handleAddToMyMeds = async (item) => {
    const key = item.item_seq || item.item_name;
    if (addedIds.has(key)) return;
    try {
      const myMedicines = await getMedicinesForInteractionCheck();

      await addMedicine({
        id: Date.now().toString(),
        name: item.item_name,
        ingredient: item.class_name || '성분 정보 없음',
        dosage: '복용법 정보 없음',
        tags: [],
        schedule: { times: [] },
        fullData: {
          medicineName: item.item_name,
          ingredient: item.class_name,
          effect: item.etc_otc_name,
          dosage: {},
          warnings: [],
        },
      });
      setAddedIds((prev) => new Set(prev).add(key));

      checkInteractionForNewMed(item, myMedicines);
    } catch (e) {
      console.error('내 약 추가 실패:', e);
    }
  };

  const checkInteractionForNewMed = async (item, myMedicines) => {
    try {
      const userId = await getUserId();
      const checks = await checkPillInteraction({
        userId,
        pillName: item.item_name,
        ingredient: item.class_name || '',
        myMedicines,
      });

      const messages = [];
      checks.official_interaction_check?.matched_interactions?.forEach((m) => {
        messages.push(`${m.drug_a} ↔ ${m.drug_b}: ${m.reason}`);
      });
      checks.interaction_check?.conflicts?.forEach((c) => {
        messages.push(`${c.existingMedicine}: ${c.description}`);
      });

      const hasConflict = checks.official_interaction_check?.is_prohibited
        || checks.interaction_check?.hasConflict;

      if (hasConflict && messages.length > 0) {
        Alert.alert(
          '⚠ 병용금기 주의',
          `'${item.item_name}'은(는) 현재 복용 중인 약과 함께 복용 시 주의가 필요해요.\n\n${messages.join('\n')}`
        );
      }
    } catch (e) {
      console.warn('병용금기 체크 실패:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>식별 도우미</Text>
        <Text style={styles.headerTitle}>낱알 식별</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'name' && styles.modeBtnActive]}
            onPress={() => switchMode('name')}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeBtnText, mode === 'name' && styles.modeBtnTextActive]}>이름으로 검색</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'appearance' && styles.modeBtnActive]}
            onPress={() => switchMode('appearance')}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeBtnText, mode === 'appearance' && styles.modeBtnTextActive]}>모양으로 검색</Text>
          </TouchableOpacity>
        </View>

        <Card>
          {mode === 'name' ? (
            <>
              <Text style={styles.fieldLabel}>약 이름</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 타이레놀정500mg"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>색상</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {COLOR_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, color === c && styles.chipActive]}
                    onPress={() => setColor(color === c ? '' : c)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, color === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>모양</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {SHAPE_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, shape === s && styles.chipActive]}
                    onPress={() => setShape(shape === s ? '' : s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, shape === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>각인 (앞면)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: TYL"
                placeholderTextColor={COLORS.textMuted}
                value={markFront}
                onChangeText={setMarkFront}
                autoCapitalize="characters"
              />

              <Text style={styles.fieldLabel}>각인 (뒷면)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 4 }]}
                placeholder="예: 500"
                placeholderTextColor={COLORS.textMuted}
                value={markBack}
                onChangeText={setMarkBack}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
            </>
          )}
        </Card>

        <PrimaryButton title="검색하기" onPress={handleSearch} disabled={!canSearch} loading={loading} />

        {error && (
          <View style={{ marginTop: 12 }}>
            <WarningBox text={error} type="danger" />
          </View>
        )}

        {results !== null && !loading && (
          <View style={styles.resultsSection}>
            <Text style={styles.countLabel}>검색 결과 {results.length}건</Text>

            {results.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="search-outline" size={36} color={COLORS.primaryMid} />
                </View>
                <Text style={styles.emptyTitle}>일치하는 알약을 찾지 못했어요</Text>
                <Text style={styles.emptySub}>검색어나 모양·색상 조건을 바꿔보세요</Text>
              </View>
            ) : (
              results.map((item, i) => (
                <Card key={item.item_seq || i}>
                  <View style={styles.resultHeader}>
                    {item.img_url ? (
                      <Image source={{ uri: item.img_url }} style={styles.pillImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.pillImage, styles.pillImagePlaceholder]}>
                        <Ionicons name="medical-outline" size={28} color={COLORS.textMuted} />
                      </View>
                    )}
                    <View style={styles.resultHeaderText}>
                      <Text style={styles.resultName}>{item.item_name}</Text>
                      <Text style={styles.resultEntp}>{item.entp_name}</Text>
                      {item.etc_otc_name ? (
                        <View style={{ marginTop: 4 }}>
                          <Badge
                            label={item.etc_otc_name}
                            type={item.etc_otc_name.includes('전문') ? 'warning' : 'success'}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <InfoRow label="모양" value={item.shape} />
                  <InfoRow label="색상" value={[item.color1, item.color2].filter(Boolean).join(', ')} />
                  <InfoRow label="제형" value={item.form} />
                  <InfoRow label="표시(앞)" value={item.mark_front} />
                  <InfoRow label="표시(뒤)" value={item.mark_back} />
                  <InfoRow label="분류" value={item.class_name} last />

                  {(() => {
                    const key = item.item_seq || item.item_name;
                    const added = addedIds.has(key);
                    return (
                      <TouchableOpacity
                        style={[styles.addBtn, added && styles.addBtnDone]}
                        onPress={() => handleAddToMyMeds(item)}
                        disabled={added}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={added ? 'checkmark-circle' : 'add-circle-outline'}
                          size={16}
                          color={added ? COLORS.primary : '#fff'}
                        />
                        <Text style={[styles.addBtnText, added && styles.addBtnTextDone]}>
                          {added ? '내 약에 추가됨' : '내 약에 추가'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </Card>
              ))
            )}
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

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: FONT.medium,
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: '#fff',
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  chipRow: { marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: FONT.medium,
  },

  resultsSection: { marginTop: 16 },
  countLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },

  resultHeader: { flexDirection: 'row', gap: 12 },
  pillImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
  },
  pillImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHeaderText: { flex: 1, justifyContent: 'center' },
  resultName: {
    fontSize: 15,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  resultEntp: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  divider: { height: 0.5, backgroundColor: COLORS.borderLight, marginVertical: 10 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  addBtnDone: {
    backgroundColor: COLORS.primaryLight,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: FONT.medium,
    color: '#fff',
  },
  addBtnTextDone: {
    color: COLORS.primary,
  },

  emptyWrap: { alignItems: 'center', paddingTop: 24, paddingBottom: 12, gap: 12 },
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
