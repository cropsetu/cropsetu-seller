/**
 * config.js — centralised runtime configuration (Seller App)
 *
 * See the buyer-app version (Farmeasy/src/constants/config.js) for full
 * documentation.  Both apps point to the same backend.
 *
 * THIRD-PARTY API KEYS: never place real keys in this file.
 * Keys in the compiled bundle are extractable by decompiling the APK/IPA.
 */

import { Platform } from 'react-native';

const DEV_LAN_IP = '192.168.1.2'; // change to your dev machine's LAN IP

export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3001/api/v1'
    : `http://${DEV_LAN_IP}:3001/api/v1`
  : 'https://resilient-vision-production-917c.up.railway.app/api/v1';

export const SOCKET_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3001'
    : `http://${DEV_LAN_IP}:3001`
  : 'wss://resilient-vision-production-917c.up.railway.app';

// ── Input / upload limits ──────────────────────────────────────────────────
export const MAX_MESSAGE_LENGTH   = 2000;
export const MAX_UPLOAD_BYTES     = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// ── OTP / auth limits ──────────────────────────────────────────────────────
export const OTP_RESEND_COOLDOWN_SEC = 30;
export const OTP_MAX_ATTEMPTS        = 5;

// ── Storage keys ───────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN:   'seller_access_token',
  REFRESH_TOKEN:  'seller_refresh_token',
  USER_ID:        'seller_user_id',
  TOKEN_SAVED_AT: 'seller_token_saved_at',
};

/**
 * Maximum session age (ms) before the client forces a re-login.
 * 30 days — matches the server-side refresh token expiry.
 * This is NOT the access token TTL (that's 15 minutes, set server-side).
 */
export const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
