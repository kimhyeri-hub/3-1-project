import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, SafeAreaView,
} from 'react-native';
import { COLORS, FONT } from '../utils/theme';

export default function SplashScreen({ onFinish }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 페이드인
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // 로딩 게이지
    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(() => {
      // 완료 후 앱으로 이동
      setTimeout(onFinish, 300);
    });
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity }]}>

        {/* 아이콘 */}
        <View style={styles.iconWrap}>
          <Text style={styles.iconEmoji}>💊</Text>
        </View>

        {/* 앱 이름 */}
        <Text style={styles.appName}>약쏘옥</Text>
        <Text style={styles.appSub}>AI 복약 도우미</Text>

        {/* 로딩 게이지 */}
        <View style={styles.loadingWrap}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: barWidth }]} />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#4BC4B8',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 52,
  },
  appName: {
    fontSize: 40,
    fontWeight: FONT.medium,
    color: '#fff',
    letterSpacing: 2,
  },
  appSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 60,
  },
  loadingWrap: {
    position: 'absolute',
    bottom: 80,
    width: '60%',
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
});