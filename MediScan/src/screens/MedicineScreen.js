import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SHADOW } from '../utils/theme';
import { analyzeMedicineImage } from '../services/claudeApi';
import { Card, Badge, InfoRow, WarningBox, SectionHeader } from '../components/UIComponents';

export default function MedicineScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera) => {
    let pickerResult;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
        return;
      }
      pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
    } else {
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
    }
    if (!pickerResult.canceled) {
      const uri = pickerResult.assets[0].uri;
      setImageUri(uri);
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const data = await analyzeMedicineImage(imageUri);
      if (data.error) Alert.alert('인식 실패', data.error);
      else setResult(data);
    } catch (e) {
      Alert.alert('오류', e.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>약 스캔</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.guideText}>처방전이나 알약 사진을 올려주세요</Text>

        {/* 이미지 프리뷰 박스 */}
        <View style={styles.previewBox}>
          {/* 모서리 장식 */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="camera-outline" size={48} color={COLORS.primaryMid} />
              <Text style={styles.previewEmptyText}>여기에 사진이 표시됩니다</Text>
            </View>
          )}
        </View>

        {/* 버튼 두 개 */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => pickImage(false)} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.outlineBtnText}>갤러리에서 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => pickImage(true)} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.outlineBtnText}>카메라로 찍기</Text>
          </TouchableOpacity>
        </View>

        {/* 분석 시작 버튼 */}
        <TouchableOpacity
          style={[styles.analyzeBtn, (!imageUri || loading) && styles.analyzeBtnDisabled]}
          onPress={analyzeImage}
          disabled={!imageUri || loading}
          activeOpacity={0.85}
        >
          <Ionicons name={loading ? 'hourglass-outline' : 'pulse-outline'} size={18} color="#fff" />
          <Text style={styles.analyzeBtnText}>{loading ? '분석 중...' : '분석 시작하기'}</Text>
        </TouchableOpacity>

        {/* 잘 찍는 방법 */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>📌 잘 찍는 방법</Text>
          <Text style={styles.tipItem}>• 글자가 선명하게 보이도록 촬영하세요</Text>
          <Text style={styles.tipItem}>• 전체 처방전이 화면에 들어오게 하세요</Text>
          <Text style={styles.tipItem}>• 밝은 곳에서 그림자 없이 찍으면 더 정확해요</Text>
        </View>

        {/* 결과 */}
        {result && !loading && <MedicineResult result={result} />}

      </ScrollView>
    </SafeAreaView>
  );
}

function MedicineResult({ result }) {
  const severityType = (s) => s === '위험' ? 'danger' : 'warning';
  return (
    <>
      <Card>
        <View style={styles.medHeader}>
          <View style={styles.medIconWrap}>
            <Ionicons name="medical" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medName}>{result.medicineName}</Text>
            {result.expiry && <Text style={styles.medExpiry}>유효기간: {result.expiry}</Text>}
          </View>
        </View>
        <SectionHeader title="성분 및 효능" />
        {result.ingredients?.map((ing, i) => (
          <View key={i} style={styles.ingredientRow}>
            <View style={styles.ingredientDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ingredientName}>
                {ing.name} {ing.amount && <Text style={styles.ingredientAmount}>({ing.amount})</Text>}
              </Text>
              <Text style={styles.ingredientEffect}>{ing.effect}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Card>
        <SectionHeader title="복용법 / 용량" />
        <InfoRow label="1회 복용량" value={result.dosage?.perDose} />
        <InfoRow label="복용 횟수" value={result.dosage?.frequency} />
        <InfoRow label="복용 시기" value={result.dosage?.timing} />
        <InfoRow label="1일 최대" value={result.dosage?.maxDaily} last />
      </Card>
      {result.interactions?.length > 0 && (
        <Card>
          <SectionHeader title="다른 약과의 상호작용" />
          {result.interactions.map((item, i) => (
            <View key={i} style={styles.interactionItem}>
              <View style={styles.interactionHeader}>
                <Text style={styles.interactionSubstance}>{item.substance}</Text>
                <Badge label={item.severity} type={severityType(item.severity)} />
              </View>
              <Text style={styles.interactionDesc}>{item.description}</Text>
            </View>
          ))}
        </Card>
      )}
      {result.warnings?.length > 0 && (
        <Card>
          <SectionHeader title="주의사항" />
          {result.warnings.map((w, i) => <WarningBox key={i} text={w} type="warning" />)}
        </Card>
      )}
      {result.storageInfo && <Card><InfoRow label="보관 방법" value={result.storageInfo} last /></Card>}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: FONT.medium, color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  guideText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
  },

  // 프리뷰 박스
  previewBox: {
    height: 220,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: COLORS.primary,
    borderWidth: 2.5,
  },
  cornerTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  previewEmpty: { alignItems: 'center', gap: 8 },
  previewEmptyText: { fontSize: 13, color: COLORS.textMuted },
  previewImage: { width: '100%', height: '100%' },

  // 버튼 두 개
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  outlineBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: FONT.medium },

  // 분석 버튼
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    marginBottom: 16,
  },
  analyzeBtnDisabled: { backgroundColor: COLORS.border },
  analyzeBtnText: { fontSize: 15, fontWeight: FONT.medium, color: '#fff' },

  // 팁 박스
  tipsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    gap: 6,
  },
  tipsTitle: { fontSize: 13, fontWeight: FONT.medium, color: COLORS.textPrimary, marginBottom: 4 },
  tipItem: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // 결과
  medHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight },
  medIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  medName: { fontSize: 17, fontWeight: FONT.medium, color: COLORS.textPrimary, lineHeight: 22 },
  medExpiry: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryMid, marginTop: 5, flexShrink: 0 },
  ingredientName: { fontSize: 14, fontWeight: FONT.medium, color: COLORS.textPrimary },
  ingredientAmount: { fontWeight: FONT.regular, color: COLORS.textSecondary },
  ingredientEffect: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  interactionItem: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight },
  interactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  interactionSubstance: { fontSize: 14, fontWeight: FONT.medium, color: COLORS.textPrimary },
  interactionDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
});