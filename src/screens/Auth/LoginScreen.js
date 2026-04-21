import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Dimensions, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DISTRICT_LIST, getTalukas, BUSINESS_TYPES } from '../../constants/locations';
import LocationPicker from '../../components/LocationPicker';
import { SoundManager } from '../../utils/sounds';

const { width: W, height: H } = Dimensions.get('window');

const STEPS = {
  PHONE: 'phone',
  OTP:   'otp',
  NAME:  'name',
  SETUP: 'setup',
};

const FARM_EMOJIS = ['🌾', '🐄', '🚜', '🌽', '🌱', '🍃', '🌻', '🐓', '🥕', '🌿'];

// Floating farm particle
function FloatParticle({ emoji, startX, delay, duration }) {
  const y       = useRef(new Animated.Value(H * 0.1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      y.setValue(H * 0.1);
      opacity.setValue(0);
      rotate.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y,       { toValue: -80, duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(rotate,  { toValue: 1,   duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.65, duration: 700,              useNativeDriver: true }),
            Animated.delay(duration - 1300),
            Animated.timing(opacity, { toValue: 0,    duration: 600,              useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => run());
    };
    run();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.Text
      style={{
        position: 'absolute', left: startX, bottom: 0,
        fontSize: 18 + (startX % 8),
        transform: [{ translateY: y }, { rotate: spin }],
        opacity,
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  emoji: FARM_EMOJIS[i % FARM_EMOJIS.length],
  startX: (W / 16) * i + 2,
  delay: i * 850,
  duration: 6200 + (i % 5) * 900,
}));

// Animated press button
function PressBtn({ onPress, disabled, gradientColors, children, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.spring(scale, { toValue: 0.95, speed: 50, useNativeDriver: true }).start();
  };
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, tension: 250, friction: 6, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={1}
        style={{ borderRadius: RADIUS.full, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={gradientColors || [COLORS.primary, '#BF360C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.btnGrad}
        >
          {children}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Business type chip
function BizTypeChip({ item, selected, onPress }) {
  const active = selected === item.key;
  return (
    <TouchableOpacity
      style={[chip.wrap, active && chip.wrapActive]}
      onPress={() => onPress(item.key)}
      activeOpacity={0.8}
    >
      <Ionicons name={item.icon} size={18} color={active ? COLORS.primary : '#6B7280'} />
      <Text style={[chip.txt, active && chip.txtActive]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

// Main screen
export default function LoginScreen() {
  const { sendOtp, verifyOtp, updateUser, finishSetup } = useAuth();
  const { t } = useLanguage();

  const [step,      setStep]      = useState(STEPS.PHONE);
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [name,      setName]      = useState('');
  const [loading,   setLoading]   = useState(false);

  // Setup step state
  const [bizType,   setBizType]   = useState('individual_farmer');
  const [district,  setDistrict]  = useState('');
  const [taluka,    setTaluka]    = useState('');
  const [village,   setVillage]   = useState('');
  const [gst,       setGst]       = useState('');
  const [gstOptOut, setGstOptOut] = useState(false);

  const otpRef = useRef(null);

  // Animation refs
  const logoScale   = useRef(new Animated.Value(0.4)).current;
  const logoGlow    = useRef(new Animated.Value(0)).current;
  const tractorY    = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(70)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const shimmerX    = useRef(new Animated.Value(-W)).current;

  useEffect(() => {
    SoundManager.tractor();

    Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }).start();

    Animated.parallel([
      Animated.spring(cardY,       { toValue: 0, tension: 60, friction: 9, delay: 350, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 480, delay: 350, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sine), useNativeDriver: false }),
        Animated.timing(logoGlow, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sine), useNativeDriver: false }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(tractorY, { toValue: -9, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tractorY, { toValue: 0,  duration: 520, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      ])
    ).start();

    const runShimmer = () => {
      shimmerX.setValue(-W);
      Animated.sequence([
        Animated.delay(3500),
        Animated.timing(shimmerX, { toValue: W * 1.5, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
      ]).start(runShimmer);
    };
    runShimmer();
  }, []);

  useEffect(() => {
    if (step === STEPS.OTP) setTimeout(() => otpRef.current?.focus(), 300);
  }, [step]);

  useEffect(() => { setTaluka(''); }, [district]);

  const animateCardIn = () => {
    cardY.setValue(50);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardY,       { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start();
  };

  // Handlers
  async function handleSendOtp() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t('login.invalidNumber'), t('login.invalidNumberMsg'));
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp(phone);
      animateCardIn();
      setStep(STEPS.OTP);
      // Dev mode: auto-fill OTP when server returns it (MSG91 not configured)
      if (result?.devOtp) setOtp(result.devOtp);
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.error?.message || t('login.couldNotSendOtp'));
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) { Alert.alert(t('login.invalidOtp'), t('login.invalidOtpMsg')); return; }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp);
      SoundManager.moo();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Advance to setup wizard for new users OR returning users with incomplete profile
      if (result.isNewUser || result.needsSetup) { animateCardIn(); setStep(STEPS.NAME); }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.error?.message || t('login.otpVerificationFailed'));
    } finally { setLoading(false); }
  }

  async function handleSaveName() {
    if (name.trim().length < 2) { Alert.alert(t('required'), t('login.enterFullName')); return; }
    setLoading(true);
    try {
      const { default: api } = await import('../../services/api');
      await api.put('/users/me', { name: name.trim() });
      animateCardIn();
      setStep(STEPS.SETUP);
    } catch (err) {
      if (__DEV__) console.warn('handleSaveName failed:', err.message);
      animateCardIn();
      setStep(STEPS.SETUP);
    } finally { setLoading(false); }
  }

  async function handleCompleteSetup() {
    if (!district)       { Alert.alert(t('required'), t('login.selectDistrictMsg')); return; }
    if (!taluka)         { Alert.alert(t('required'), t('login.selectTalukaMsg')); return; }
    if (!village.trim()) { Alert.alert(t('required'), t('login.enterVillageMsg')); return; }
    if (!gstOptOut && gst.trim()) {
      const gstRe = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRe.test(gst.trim().toUpperCase())) {
        Alert.alert(t('login.invalidGst'), t('login.invalidGstMsg'));
        return;
      }
    }
    setLoading(true);
    try {
      const { default: api } = await import('../../services/api');
      const payload = {
        district, taluka, village: village.trim(),
        businessType: bizType, state: 'Maharashtra',
        ...(gstOptOut ? {} : gst.trim() ? { gstNumber: gst.trim().toUpperCase() } : {}),
      };
      const { data } = await api.put('/users/me', payload);
      SoundManager.cash();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      updateUser(data.data);
      finishSetup();   // ← clears needsSetup; App.js switches to AppNavigator
    } catch (err) {
      if (__DEV__) console.warn('handleCompleteSetup save failed:', err.message);
      const { default: api2 } = await import('../../services/api');
      try {
        const { data } = await api2.get('/users/me');
        updateUser(data.data);
      } catch (fetchErr) {
        if (__DEV__) console.warn('handleCompleteSetup user fetch failed:', fetchErr.message);
      }
      finishSetup();   // proceed even if save failed — user can complete from Profile
    } finally { setLoading(false); }
  }

  const glowRadius  = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [4, 22] });
  const glowOpacity = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });

  // Render
  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient
        colors={['#7B1600', '#C63900', '#E65100', '#FF8F00']}
        locations={[0, 0.3, 0.65, 1]}
        style={s.gradient}
      >
        {/* Floating particles */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {PARTICLES.map((p) => (
            <FloatParticle key={p.id} emoji={p.emoji} startX={p.startX} delay={p.delay} duration={p.duration} />
          ))}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.inner}
        >
          {/* Logo */}
          <Animated.View style={[s.logoArea, { transform: [{ scale: logoScale }] }]}>
            <Animated.View style={[s.glowRing, { shadowRadius: glowRadius, shadowOpacity: glowOpacity }]}>
              <View style={s.logoCircle}>
                <Animated.Text style={[s.logoEmoji, { transform: [{ translateY: tractorY }] }]}>
                  🚜
                </Animated.Text>
              </View>
            </Animated.View>
            <Text style={s.appName}>{t('login.appName')}</Text>
            <View style={s.tagRow}>
              <Text style={s.tagEmoji}>🐄</Text>
              <Text style={s.tagline}>{t('login.tagline')}</Text>
              <Text style={s.tagEmoji}>🌾</Text>
            </View>
          </Animated.View>

          {/* ── PHONE / OTP / NAME steps (non-scroll) ── */}
          {step !== STEPS.SETUP && (
            <Animated.View style={[s.card, { transform: [{ translateY: cardY }], opacity: cardOpacity }]}>
              {/* Top accent strip */}
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.cardStrip}
              />
              {/* Shimmer */}
              <Animated.View
                pointerEvents="none"
                style={[s.shimmer, { transform: [{ translateX: shimmerX }] }]}
              />

              {/* PHONE */}
              {step === STEPS.PHONE && (
                <>
                  <Text style={s.cardTitle}>{t('login.loginRegister')}</Text>
                  <Text style={s.cardSub}>{t('login.enterMobile')}</Text>
                  <View style={s.inputRow}>
                    <View style={s.cc}><Text style={s.ccTxt}>🇮🇳 +91</Text></View>
                    <TextInput
                      style={s.input}
                      placeholder={t('login.mobilePlaceholder')}
                      placeholderTextColor="#aaa"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                  <PressBtn onPress={handleSendOtp} disabled={loading}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="send" size={16} color="#fff" /><Text style={s.btnTxt}> {t('login.sendOtp')}</Text></>
                    }
                  </PressBtn>
                </>
              )}

              {/* OTP */}
              {step === STEPS.OTP && (
                <>
                  <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => { animateCardIn(); setStep(STEPS.PHONE); }}
                  >
                    <Ionicons name="arrow-back-circle" size={22} color={COLORS.primary} />
                    <Text style={s.backTxt}> {t('login.changeNumber')}</Text>
                  </TouchableOpacity>
                  <Text style={s.cardTitle}>{t('login.enterOtp')}</Text>
                  <Text style={s.cardSub}>{t('login.sentTo', { phone })}</Text>
                  <TextInput
                    ref={otpRef}
                    style={s.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor="#ddd"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <PressBtn onPress={handleVerifyOtp} disabled={loading}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="checkmark-circle" size={17} color="#fff" /><Text style={s.btnTxt}> {t('login.verifyContinue')}</Text></>
                    }
                  </PressBtn>
                  <TouchableOpacity onPress={handleSendOtp} style={s.resendBtn}>
                    <Text style={s.resendTxt}>{t('login.resendOtp')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* NAME */}
              {step === STEPS.NAME && (
                <>
                  <Text style={s.cardTitle}>{t('login.createAccount')}</Text>
                  <Text style={s.cardSub}>{t('login.whatIsYourName')}</Text>
                  <TextInput
                    style={s.inputPlain}
                    placeholder={t('login.fullNamePlaceholder')}
                    placeholderTextColor="#aaa"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  <PressBtn onPress={handleSaveName} disabled={loading} gradientColors={['#1B5E20', '#2E7D32']}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="arrow-forward-circle" size={17} color="#fff" /><Text style={s.btnTxt}> {t('login.next')}</Text></>
                    }
                  </PressBtn>
                </>
              )}
            </Animated.View>
          )}

          {/* ── SETUP step (scrollable) ── */}
          {step === STEPS.SETUP && (
            <Animated.View style={[s.setupOuter, { opacity: cardOpacity }]}>
              <ScrollView
                contentContainerStyle={s.setupScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={s.card}>
                  {/* Top accent strip */}
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.cardStrip}
                  />

                  {/* Progress dots */}
                  <View style={s.stepProgress}>
                    {['1', '2', '3', '4'].map((n, i) => (
                      <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={s.stepDot}>
                          <Text style={s.stepDotTxt}>{n}</Text>
                        </View>
                        {i < 3 && <View style={s.stepLine} />}
                      </View>
                    ))}
                  </View>

                  <Text style={s.cardTitle}>{t('login.completeProfile')}</Text>
                  <Text style={s.cardSub}>{t('login.completeProfileSub')}</Text>

                  <Text style={s.fieldLabel}>{t('login.iAmA')}</Text>
                  <View style={s.bizGrid}>
                    {BUSINESS_TYPES.map((bt) => (
                      <BizTypeChip key={bt.key} item={{ ...bt, label: t('biz.' + bt.tKey) }} selected={bizType} onPress={setBizType} />
                    ))}
                  </View>

                  <Text style={[s.fieldLabel, { marginTop: 20 }]}>{t('login.yourLocation')}</Text>

                  <Text style={s.subLabel}>{t('login.districtLabel')} *</Text>
                  <LocationPicker
                    title={t('bizProfile.selectDistrictTitle')}
                    items={DISTRICT_LIST}
                    selected={district}
                    onSelect={setDistrict}
                    placeholder={t('login.selectDistrictPlaceholder')}
                  />

                  <Text style={[s.subLabel, { marginTop: 12 }]}>{t('login.talukaLabel')} *</Text>
                  <LocationPicker
                    title={t('bizProfile.selectTalukaTitle')}
                    items={getTalukas(district)}
                    selected={taluka}
                    onSelect={setTaluka}
                    placeholder={district ? t('login.selectTalukaPlaceholder') : t('login.selectDistrictFirst')}
                    disabled={!district}
                  />

                  <Text style={[s.subLabel, { marginTop: 12 }]}>{t('login.villageTownLabel')} *</Text>
                  <TextInput
                    style={s.inputPlain}
                    placeholder={t('login.enterVillage')}
                    placeholderTextColor="#9CA3AF"
                    value={village}
                    onChangeText={setVillage}
                  />

                  <Text style={[s.fieldLabel, { marginTop: 20 }]}>{t('login.gstNumber')}</Text>
                  <TouchableOpacity
                    style={s.checkRow}
                    onPress={() => { setGstOptOut((v) => !v); setGst(''); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.checkbox, gstOptOut && s.checkboxActive]}>
                      {gstOptOut && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={s.checkLabel}>{t('login.noGstCheck')}</Text>
                  </TouchableOpacity>
                  {!gstOptOut && (
                    <TextInput
                      style={s.inputPlain}
                      placeholder={t('login.gstPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      value={gst}
                      onChangeText={setGst}
                      autoCapitalize="characters"
                      maxLength={15}
                    />
                  )}

                  <PressBtn
                    onPress={handleCompleteSetup}
                    disabled={loading}
                    gradientColors={['#2E7D32', '#1B5E20']}
                    style={{ marginTop: 22 }}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.btnTxt}> {t('login.startSelling')}</Text></>
                    }
                  </PressBtn>

                  <Text style={s.skipTxt}>{t('login.updateLater')}</Text>
                </View>
              </ScrollView>
            </Animated.View>
          )}

          {step !== STEPS.SETUP && (
            <Text style={s.footer}>{t('login.footer')}</Text>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1 },
  gradient: { flex: 1 },
  inner:    { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 28 },
  glowRing: {
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 0 },
    borderRadius: 54, marginBottom: 14,
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoEmoji: { fontSize: 46 },
  appName:   { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  tagRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  tagEmoji:  { fontSize: 15 },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 24, paddingTop: 28,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28, shadowRadius: 28, elevation: 18,
  },
  cardStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  shimmer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: W * 0.22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    transform: [{ skewX: '-15deg' }],
  },
  cardTitle: { fontSize: 21, fontWeight: '900', color: '#1C1C1C', marginBottom: 4 },
  cardSub:   { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },

  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  cc: {
    backgroundColor: '#FFF3EE', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.primary + '40',
  },
  ccTxt:     { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  input:     {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#1C1C1C', backgroundColor: '#F9FAFB',
  },
  inputPlain: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#1C1C1C', backgroundColor: '#F9FAFB', marginBottom: 4,
  },
  otpInput: {
    borderWidth: 2.5, borderColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 18,
    fontSize: 28, fontWeight: '900', color: '#1C1C1C',
    backgroundColor: '#FFF8F4', marginBottom: 20,
    textAlign: 'center', letterSpacing: 14,
  },

  // Button
  btnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15,
  },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  backBtn:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backTxt:   { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  resendBtn: { alignItems: 'center', marginTop: 14 },
  resendTxt: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  footer:    { textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 22 },

  // Setup step
  setupOuter: { flex: 1 },
  setupScroll: { paddingVertical: 8 },
  stepProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepDot:     { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepDotTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepLine:    { width: 24, height: 2, backgroundColor: COLORS.primary + '50' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  subLabel:   { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  bizGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  checkRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  checkbox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel:     { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  skipTxt:        { textAlign: 'center', color: '#9CA3AF', fontSize: 11, marginTop: 14 },
});

const chip = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  wrapActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  txt:        { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  txtActive:  { color: COLORS.primary },
});
