/**
 * Secure storage — Seller App
 *
 * Uses expo-secure-store (iOS Keychain / Android Keystore) for all
 * sensitive values (tokens, user IDs).
 *
 * The original implementation used AsyncStorage which stores data in
 * plaintext on-device.  expo-secure-store provides AES-256 encryption
 * at rest on both platforms.
 *
 * ⚠️  expo-secure-store values are limited to ~2 KB per key on iOS.
 *     For larger payloads (e.g. cached profile data) continue using
 *     AsyncStorage — but never store tokens there.
 */
import { Platform } from 'react-native';
import { SESSION_TIMEOUT_MS, STORAGE_KEYS } from '../constants/config';

let _SecureStore = null;
function getSecureStore() {
  if (!_SecureStore) _SecureStore = require('expo-secure-store');
  return _SecureStore;
}

export async function setItem(key, value) {
  if (Platform.OS === 'web') {
    // Web: use sessionStorage (tab-scoped) instead of localStorage (persistent).
    // ⚠️  Still plain-text — do not deploy web build to production with tokens.
    sessionStorage.setItem(key, String(value));
    return;
  }
  await getSecureStore().setItemAsync(key, String(value));
}

export async function getItem(key) {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(key) ?? null;
  }
  return getSecureStore().getItemAsync(key);
}

export async function deleteItem(key) {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(key);
    return;
  }
  await getSecureStore().deleteItemAsync(key);
}

/** Returns true if the stored session has exceeded SESSION_TIMEOUT_MS. */
export async function isTokenStale() {
  const raw = await getItem(STORAGE_KEYS.TOKEN_SAVED_AT);
  if (!raw) return true;
  return Date.now() - Number(raw) > SESSION_TIMEOUT_MS;
}
