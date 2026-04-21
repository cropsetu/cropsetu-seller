import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { DISTRICT_LIST, getTalukas, BUSINESS_TYPES } from '../../constants/locations';
import LocationPicker from '../../components/LocationPicker';

// Reusable form field wrapper
function FormField({ label, required, children, hint }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}{required ? ' *' : ''}</Text>
      {children}
      {hint ? <Text style={f.hint}>{hint}</Text> : null}
    </View>
  );
}

function TextF({ value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'sentences', maxLength }) {
  return (
    <TextInput
      style={f.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
    />
  );
}

// Section header
function SectionHeader({ icon, title, color = COLORS.primary }) {
  return (
    <View style={sh.wrap}>
      <View style={[sh.icon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}

// Profile completion badge
function CompletionBadge({ percent }) {
  const { t } = useLanguage();
  const color = percent >= 80 ? COLORS.success : percent >= 50 ? COLORS.warning : COLORS.error;
  return (
    <View style={[cb.wrap, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <Text style={[cb.pct, { color }]}>{percent}%</Text>
      <Text style={[cb.label, { color }]}>
        {percent >= 80 ? t('bizProfile.profileComplete') : percent >= 50 ? t('bizProfile.almostDone') : t('bizProfile.incomplete')}
      </Text>
    </View>
  );
}

// Calculate profile completion
function calcCompletion(u, form) {
  const fields = [
    u?.name,
    form.businessType,
    form.district,
    form.taluka,
    form.village,
    form.gstNumber || form.gstOptOut,
    form.bankAccountNumber,
    form.bankIfsc,
    form.bankHolderName,
    form.bankName,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export default function BusinessProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [saving, setSaving] = useState(false);

  // Form state — pre-fill from user object
  const [form, setForm] = useState({
    businessType:      user?.businessType     || 'individual_farmer',
    district:          user?.district         || '',
    taluka:            user?.taluka           || '',
    village:           user?.village          || '',
    gstNumber:         user?.gstNumber        || '',
    gstOptOut:         user?.gstOptOut        || (!user?.gstNumber),
    bankAccountNumber: user?.bankAccountNumber || '',
    bankIfsc:          user?.bankIfsc          || '',
    bankHolderName:    user?.bankHolderName    || '',
    bankName:          user?.bankName          || '',
    aadharNumber:      user?.aadharNumber      || '',
    panNumber:         user?.panNumber         || '',
  });

  const set = (key) => (val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'district') next.taluka = '';   // reset taluka on district change
      return next;
    });
  };

  const completion = calcCompletion(user, form);

  async function handleSave() {
    if (!form.district) { Alert.alert(t('required'), t('bizProfile.selectDistrictMsg')); return; }
    if (!form.taluka)   { Alert.alert(t('required'), t('bizProfile.selectTalukaMsg'));   return; }
    if (!form.village.trim()) { Alert.alert(t('required'), t('bizProfile.enterVillageMsg')); return; }

    if (!form.gstOptOut && form.gstNumber.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(form.gstNumber.trim().toUpperCase())) {
        Alert.alert(t('bizProfile.invalidGst'), t('bizProfile.invalidGstMsg'));
        return;
      }
    }

    if (form.bankIfsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc.trim().toUpperCase())) {
      Alert.alert(t('bizProfile.invalidIfsc'), t('bizProfile.invalidIfscMsg'));
      return;
    }

    if (form.aadharNumber.trim() && !/^\d{12}$/.test(form.aadharNumber.trim())) {
      Alert.alert(t('required'), t('bizProfile.invalidAadhaar') || 'Aadhaar must be exactly 12 digits');
      return;
    }

    if (form.panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.trim().toUpperCase())) {
      Alert.alert(t('required'), t('bizProfile.invalidPan') || 'Invalid PAN format (e.g. ABCDE1234F)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        businessType:      form.businessType,
        district:          form.district,
        taluka:            form.taluka,
        village:           form.village.trim(),
        state:             'Maharashtra',
        gstOptOut:         form.gstOptOut,
        gstNumber:         form.gstOptOut ? '' : form.gstNumber.trim().toUpperCase(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        bankIfsc:          form.bankIfsc.trim().toUpperCase(),
        bankHolderName:    form.bankHolderName.trim(),
        bankName:          form.bankName.trim(),
        aadharNumber:      form.aadharNumber.trim(),
        panNumber:         form.panNumber.trim().toUpperCase(),
      };
      const { data } = await api.put('/users/me', payload);
      updateUser(data.data);
      Alert.alert(t('bizProfile.saved'), t('bizProfile.savedMsg'), [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(t('error'), e.response?.data?.error?.message || t('bizProfile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* Completion badge */}
          <CompletionBadge percent={completion} />

          {/* ── Business Identity ── */}
          <View style={s.section}>
            <SectionHeader icon="storefront-outline" title={t('bizProfile.bizIdentity')} />

            <FormField label={t('bizProfile.bizType')} required>
              <View style={s.bizChips}>
                {BUSINESS_TYPES.map((bt) => {
                  const active = form.businessType === bt.key;
                  return (
                    <TouchableOpacity
                      key={bt.key}
                      style={[s.bizChip, active && s.bizChipActive]}
                      onPress={() => set('businessType')(bt.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={bt.icon} size={16} color={active ? COLORS.primary : '#6B7280'} />
                      <Text style={[s.bizChipTxt, active && s.bizChipTxtActive]}>{t('biz.' + bt.tKey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FormField>
          </View>

          {/* ── Location ── */}
          <View style={s.section}>
            <SectionHeader icon="location-outline" title={t('bizProfile.yourLocation')} color="#0288D1" />

            <FormField label={t('bizProfile.state')}>
              <View style={f.readOnly}>
                <Text style={f.readOnlyTxt}>{t('bizProfile.stateMaharashtra')}</Text>
              </View>
            </FormField>

            <FormField label={t('bizProfile.district')} required>
              <LocationPicker
                title={t('bizProfile.selectDistrictTitle')}
                items={DISTRICT_LIST}
                selected={form.district}
                onSelect={set('district')}
                placeholder={t('bizProfile.selectDistrictPlaceholder')}
              />
            </FormField>

            <FormField label={t('bizProfile.taluka')} required>
              <LocationPicker
                title={t('bizProfile.selectTalukaTitle')}
                items={getTalukas(form.district)}
                selected={form.taluka}
                onSelect={set('taluka')}
                placeholder={form.district ? t('bizProfile.selectTalukaPlaceholder') : t('bizProfile.selectDistrictFirst')}
                disabled={!form.district}
              />
            </FormField>

            <FormField label={t('bizProfile.villageTown')} required hint={t('bizProfile.primaryLocation')}>
              <TextF
                value={form.village}
                onChangeText={set('village')}
                placeholder={t('bizProfile.villagePlaceholder')}
              />
            </FormField>
          </View>

          {/* ── GST ── */}
          <View style={s.section}>
            <SectionHeader icon="document-text-outline" title={t('bizProfile.gstDetails')} color="#7C3AED" />

            <TouchableOpacity
              style={s.checkRow}
              onPress={() => set('gstOptOut')(!form.gstOptOut)}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, form.gstOptOut && s.checkboxActive]}>
                {form.gstOptOut && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>{t('bizProfile.noGst')}</Text>
                <Text style={s.checkHint}>{t('bizProfile.noGstHint')}</Text>
              </View>
            </TouchableOpacity>

            {!form.gstOptOut && (
              <FormField
                label={t('bizProfile.gstNumber')}
                hint={t('bizProfile.gstHint')}
              >
                <TextF
                  value={form.gstNumber}
                  onChangeText={set('gstNumber')}
                  placeholder="27ABCDE1234F1Z5"
                  autoCapitalize="characters"
                  maxLength={15}
                />
              </FormField>
            )}
          </View>

          {/* ── Bank Account ── */}
          <View style={s.section}>
            <SectionHeader icon="card-outline" title={t('bizProfile.bankAccountSection')} color={COLORS.success} />
            <Text style={s.sectionHint}>{t('bizProfile.bankHint')}</Text>

            <FormField label={t('bizProfile.holderName')}>
              <TextF value={form.bankHolderName} onChangeText={set('bankHolderName')} placeholder={t('bizProfile.holderNamePlaceholder')} />
            </FormField>

            <FormField label={t('bizProfile.bankName')}>
              <TextF value={form.bankName} onChangeText={set('bankName')} placeholder={t('bizProfile.bankNamePlaceholder')} />
            </FormField>

            <FormField label={t('bizProfile.accountNumber')}>
              <TextF
                value={form.bankAccountNumber}
                onChangeText={set('bankAccountNumber')}
                placeholder={t('bizProfile.accountNumberPlaceholder')}
                keyboardType="number-pad"
                maxLength={18}
              />
            </FormField>

            <FormField label={t('bizProfile.ifscCode')} hint={t('bizProfile.ifscHint')}>
              <TextF
                value={form.bankIfsc}
                onChangeText={set('bankIfsc')}
                placeholder={t('bizProfile.ifscPlaceholder')}
                autoCapitalize="characters"
                maxLength={11}
              />
            </FormField>
          </View>

          {/* ── KYC Documents ── */}
          <View style={s.section}>
            <SectionHeader icon="shield-checkmark-outline" title={t('bizProfile.kycDocs')} color={COLORS.warning} />
            <Text style={s.sectionHint}>{t('bizProfile.kycHint')}</Text>

            <FormField label={t('bizProfile.aadhaar')} hint={t('bizProfile.aadhaarHint')}>
              <TextF
                value={form.aadharNumber}
                onChangeText={set('aadharNumber')}
                placeholder={t('bizProfile.aadhaarPlaceholder')}
                keyboardType="number-pad"
                maxLength={12}
              />
            </FormField>

            <FormField label={t('bizProfile.pan')} hint={t('bizProfile.panHint')}>
              <TextF
                value={form.panNumber}
                onChangeText={set('panNumber')}
                placeholder={t('bizProfile.panPlaceholder')}
                autoCapitalize="characters"
                maxLength={10}
              />
            </FormField>
          </View>

          {/* Data security notice */}
          <View style={s.securityNote}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.success} />
            <Text style={s.securityTxt}>{t('bizProfile.securityNote')}</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.saveTxt}>{t('bizProfile.saveBizProfile')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  sectionHint: { fontSize: 12, color: '#6B7280', marginTop: -4, marginBottom: 12, lineHeight: 16 },

  bizChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bizChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  bizChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  bizChipTxt: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  bizChipTxtActive: { color: COLORS.primary },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel: { fontSize: 14, color: '#1C1917', fontWeight: '600', marginBottom: 2 },
  checkHint:  { fontSize: 11, color: '#6B7280', lineHeight: 15 },

  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.success + '10', borderRadius: RADIUS.md,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.success + '25',
  },
  securityTxt: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 17 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    ...SHADOWS.medium,
  },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  saveTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

// Section header styles
const sh = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  icon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: '#1C1917' },
});

// Completion badge styles
const cb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: 12, borderRadius: RADIUS.lg, borderWidth: 1,
    marginBottom: 12,
  },
  pct:   { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '700' },
});

// Form field styles
const f = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  hint:  { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1C1917',
  },
  readOnly: {
    backgroundColor: '#F3F4F6', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  readOnlyTxt: { fontSize: 15, color: '#6B7280' },
});
