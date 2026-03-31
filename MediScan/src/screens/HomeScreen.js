import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SHADOW } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: '좋은 아침이에요', emoji: '🌅' };
    if (hour < 18) return { text: '점심 드셨나요?', emoji: '🥗' };
    return { text: '오늘 하루 수고했어요', emoji: '🌙' };
  };

  const greeting = getGreeting();
  const timeStr = currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <Ionicons name="leaf" size={18} color="#fff" />
            <Text style={styles.logoText}>약쏘옥</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.greetingText}>{greeting.text} {greeting.emoji}</Text>
        <Text style={styles.greetingSub}>복약 잊지 마세요</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 약 스캔하기 카드 */}
        <TouchableOpacity
          style={styles.scanCard}
          onPress={() => navigation.navigate('약 분석')}
          activeOpacity={0.85}
        >
          <View style={styles.scanIconWrap}>
            <Ionicons name="camera" size={28} color="#fff" />
          </View>
          <View style={styles.scanText}>
            <Text style={styles.scanTitle}>약 스캔하기</Text>
            <Text style={styles.scanSub}>처방전·알약 사진으로{'\n'}약 정보를 쉽게 확인해요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* 방금 식사했어요 카드 */}
        <TouchableOpacity
          style={styles.mealCard}
          onPress={() => navigation.navigate('식사 알림')}
          activeOpacity={0.85}
        >
          <View style={styles.mealIconWrap}>
            <Ionicons name="restaurant" size={26} color="#fff" />
          </View>
          <View style={styles.mealText}>
            <Text style={styles.mealTitle}>방금 식사했어요</Text>
            <Text style={styles.mealSub}>마지막 식사: {timeStr}</Text>
          </View>
        </TouchableOpacity>

        {/* 오늘의 복약 일정 */}
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>오늘의 복약 일정</Text>
            <TouchableOpacity onPress={() => navigation.navigate('기록')}>
              <Text style={styles.sectionMore}>전체보기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptySchedule}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>아직 등록된 약이 없어요</Text>
            <Text style={styles.emptySub}>약을 스캔해서 복약 일정을 만들어 보세요!</Text>
          </View>
        </View>

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
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 18,
    fontWeight: FONT.medium,
    color: '#fff',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: FONT.medium,
    color: '#fff',
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  // 스캔 카드
  scanCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  scanIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanText: { flex: 1 },
  scanTitle: {
    fontSize: 16,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  scanSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // 식사 카드
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  mealIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: '#E8623A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealText: { flex: 1 },
  mealTitle: {
    fontSize: 16,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  mealSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // 복약 일정
  scheduleSection: { marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
  },
  sectionMore: {
    fontSize: 13,
    color: COLORS.primary,
  },
  emptySchedule: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});