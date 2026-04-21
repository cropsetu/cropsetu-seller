import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, TextInput, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOWS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { BUSINESS_TYPES } from '../../constants/locations';
import api from '../../services/api';

// Profile completion calculator
function calcCompletion(user) {
  const checks = [
    user?.name,
    user?.businessType,
    user?.district,
    user?.taluka,
    user?.village,
    user?.gstNumber || user?.gstOptOut,
    user?.bankAccountNumber,
    user?.bankIfsc,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function Row({ icon, label, value, onPress, badge }) {
  return (
    <TouchableOpacity style={r.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={r.rowIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={r.rowLabel}>{label}</Text>
        {value ? <Text style={r.rowValue}>{value}</Text> : null}
      </View>
      {badge ? (
        <View style={[r.badge, { backgroundColor: badge.color + '20', borderColor: badge.color + '40' }]}>
          <Text style={[r.badgeTxt, { color: badge.color }]}>{badge.text}</Text>
        </View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionGap() {
  return <View style={{ height: 10, backgroundColor: '#F3F4F6' }} />;
}

export default function SellerProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { t } = useLanguage();

  const [editMode, setEditMode] = useState(false);
  const [name,     setName]     = useState(user?.name || '');
  const [saving,   setSaving]   = useState(false);

  // Entrance animations
  const avatarScale  = useRef(new Animated.Value(0.3)).current;
  const avatarOpacity = useRef(new Animated.Value(0)).current;
  const headerY      = useRef(new Animated.Value(-30)).current;
  const bodyOpacity  = useRef(new Animated.Value(0)).current;
  const ringPulse    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(avatarScale,   { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(avatarOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerY,       { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(bodyOpacity,   { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.12, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'S';

  const completion = calcCompletion(user);
  const completionColor = completion >= 80 ? COLORS.success : completion >= 50 ? COLORS.warning : COLORS.error;

  const bizTypeObj = BUSINESS_TYPES.find((b) => b.key === user?.businessType);
  const bizTypeLabel = bizTypeObj ? t('biz.' + bizTypeObj.tKey) : t('notSet');

  const locationStr = [user?.village, user?.taluka, user?.district]
    .filter(Boolean)
    .join(', ') || null;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('required'), t('profile.nameRequired')); return; }
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', { name: name.trim() });
      updateUser(data.data);
      setEditMode(false);
    } catch (e) {
      Alert.alert(t('error'), t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={{ transform: [{ translateY: headerY }] }}>
        <LinearGradient colors={['#7B1600', '#C63900', '#E65100']} locations={[0, 0.5, 1]} style={s.header}>
          <Animated.View style={[s.ringWrap, { transform: [{ scale: ringPulse }] }]}>
            <Animated.View style={[s.avatar, { transform: [{ scale: avatarScale }], opacity: avatarOpacity }]}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </Animated.View>
          </Animated.View>

          {editMode ? (
            <View style={s.editWrap}>
              <TextInput
                style={s.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={t('profile.yourName')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                autoFocus
              />
              <View style={s.editBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setName(user?.name || ''); setEditMode(false); }}>
                  <Text style={s.cancelTxt}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={s.saveTxt}>{t('save')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={s.sellerName}>{user?.name || t('seller')}</Text>
              <Text style={s.sellerPhone}>+91 {user?.phone}</Text>
              {bizTypeObj && (
                <View style={s.bizBadge}>
                  <Ionicons name="storefront-outline" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={s.bizBadgeTxt}>{bizTypeLabel}</Text>
                </View>
              )}
              <TouchableOpacity style={s.editProfileBtn} onPress={() => setEditMode(true)}>
                <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={s.editProfileTxt}>{t('profile.editName')}</Text>
              </TouchableOpacity>
            </>
          )}
        </LinearGradient>
        </Animated.View>

        {/* Body — fade in after header */}
        <Animated.View style={{ opacity: bodyOpacity }}>

        {/* Profile Completion Card */}
        <TouchableOpacity
          style={[s.completionCard, { borderColor: completionColor + '30' }]}
          onPress={() => navigation.navigate('BusinessProfile')}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.completionTitle}>{t('profile.completion')}</Text>
            <Text style={s.completionSub}>
              {completion < 100
                ? t('profile.completionSub')
                : t('profile.completionDone')}
            </Text>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${completion}%`, backgroundColor: completionColor }]} />
            </View>
          </View>
          <View style={s.completionRight}>
            <Text style={[s.completionPct, { color: completionColor }]}>{completion}%</Text>
            <Ionicons name="chevron-forward" size={16} color={completionColor} />
          </View>
        </TouchableOpacity>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile.account')}</Text>
          <Row icon="call-outline"     label={t('profile.phoneNumber')}  value={`+91 ${user?.phone}`} />
          <Row icon="person-outline"   label={t('profile.displayName')}  value={user?.name || t('notSet')} onPress={() => setEditMode(true)} />
          <Row
            icon="location-outline"
            label={t('profile.location')}
            value={locationStr || t('profile.notSetTap')}
            onPress={() => navigation.navigate('BusinessProfile')}
          />
        </View>

        <SectionGap />

        {/* Business Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile.businessInfo')}</Text>
          <Row
            icon="storefront-outline"
            label={t('profile.businessType')}
            value={bizTypeLabel}
            onPress={() => navigation.navigate('BusinessProfile')}
          />
          <Row
            icon="document-text-outline"
            label={t('profile.gstNumber')}
            value={
              user?.gstNumber
                ? user.gstNumber
                : user?.gstOptOut
                ? t('profile.notApplicable')
                : t('profile.notAdded')
            }
            onPress={() => navigation.navigate('BusinessProfile')}
            badge={
              user?.gstNumber
                ? { text: t('profile.verified'), color: COLORS.success }
                : user?.gstOptOut
                ? { text: t('profile.exempt'), color: COLORS.warning }
                : null
            }
          />
          <Row
            icon="card-outline"
            label={t('profile.bankAccount')}
            value={
              user?.bankAccountNumber
                ? `••••${user.bankAccountNumber.slice(-4)} · ${user.bankName || ''}`
                : t('profile.notAdded')
            }
            onPress={() => navigation.navigate('BusinessProfile')}
            badge={
              user?.bankAccountNumber
                ? { text: t('profile.added'), color: COLORS.success }
                : null
            }
          />
          <Row
            icon="shield-checkmark-outline"
            label={t('profile.kycStatus')}
            value={user?.kycStatus === 'verified' ? t('profile.verified') : t('profile.pendingVerification')}
            badge={
              user?.kycStatus === 'verified'
                ? { text: t('profile.verified'), color: COLORS.success }
                : { text: t('profile.pending'), color: COLORS.warning }
            }
          />
        </View>

        <SectionGap />

        {/* Seller Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile.sellerInfo')}</Text>
          <Row
            icon="calendar-outline"
            label={t('profile.sellerSince')}
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
          />
          <Row
            icon="shield-checkmark-outline"
            label={t('profile.accountStatus')}
            value={t('profile.active')}
            badge={{ text: t('profile.active'), color: COLORS.success }}
          />
        </View>

        <SectionGap />

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile.quickActions')}</Text>
          <Row
            icon="briefcase-outline"
            label={t('profile.bizProfileKyc')}
            value={t('profile.bizProfileSub')}
            onPress={() => navigation.navigate('BusinessProfile')}
          />
          <Row
            icon="help-circle-outline"
            label={t('profile.helpCenter')}
            onPress={() => Alert.alert(t('profile.helpCenter'), t('profile.helpMsg'))}
          />
          <Row icon="document-text-outline" label={t('profile.terms')}   onPress={() => {}} />
          <Row icon="lock-closed-outline"   label={t('profile.privacy')} onPress={() => {}} />
        </View>

        <SectionGap />

        {/* Logout */}
        <View style={{ padding: 16 }}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={s.logoutTxt}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />

        </Animated.View>{/* end body fade-in */}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F3F4F6' },

  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 20 },
  ringWrap: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 30, fontWeight: '900', color: '#fff' },

  sellerName:  { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  sellerPhone: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },

  bizBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full,
    marginBottom: 10,
  },
  bizBadgeTxt: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.sm },
  editProfileTxt: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  editWrap: { width: '100%', alignItems: 'center', gap: 12 },
  nameInput: { width: '100%', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.5)', color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
  editBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.2)' },
  cancelTxt: { color: '#fff', fontWeight: '700' },
  saveBtn:   { paddingHorizontal: 24, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#fff' },
  saveTxt:   { color: COLORS.primary, fontWeight: '800' },

  // Completion card
  completionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  completionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1917', marginBottom: 2 },
  completionSub:   { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  progressBarBg:   { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  completionRight: { alignItems: 'center', marginLeft: 16, gap: 4 },
  completionPct:   { fontSize: 22, fontWeight: '900' },

  section: { backgroundColor: '#fff' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 15, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.error + '40', backgroundColor: '#FFF0F0',
  },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: COLORS.error },
});

const r = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '12', justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 15, color: '#1C1917', fontWeight: '600' },
  rowValue: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
