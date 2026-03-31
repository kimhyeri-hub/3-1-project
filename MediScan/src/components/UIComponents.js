import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SHADOW, FONT } from '../utils/theme';

// ─── Badge ────────────────────────────────────────────────
export function Badge({ label, type = 'success' }) {
  const colors = {
    success: { bg: COLORS.primaryLight, text: COLORS.primaryDark },
    warning: { bg: COLORS.warningLight, text: COLORS.warningDark },
    danger: { bg: COLORS.dangerLight, text: COLORS.dangerDark },
    muted: { bg: COLORS.borderLight, text: COLORS.textSecondary },
  };
  const c = colors[type] || colors.success;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ─── InfoRow ──────────────────────────────────────────────
export function InfoRow({ label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────
export function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── PrimaryButton ────────────────────────────────────────
export function PrimaryButton({ title, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.primaryBtnText}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── WarningBox ───────────────────────────────────────────
export function WarningBox({ text, type = 'warning' }) {
  const config = {
    warning: { bg: COLORS.warningLight, color: COLORS.warningDark, icon: '⚠️' },
    danger: { bg: COLORS.dangerLight, color: COLORS.dangerDark, icon: '🚫' },
    info: { bg: COLORS.primaryLight, color: COLORS.primaryDark, icon: 'ℹ️' },
  };
  const c = config[type] || config.warning;
  return (
    <View style={[styles.warningBox, { backgroundColor: c.bg }]}>
      <Text style={styles.warningIcon}>{c.icon}</Text>
      <Text style={[styles.warningText, { color: c.color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FONT.medium,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  infoRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    width: 90,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 14,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: FONT.medium,
    letterSpacing: 0.2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.sm,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  warningIcon: {
    fontSize: 15,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
