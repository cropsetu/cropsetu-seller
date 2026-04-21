import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { saveTokens, clearTokens, getAccessToken, getRefreshToken } from '../services/api';
import { isTokenStale } from '../utils/storage';
import { OTP_RESEND_COOLDOWN_SEC, OTP_MAX_ATTEMPTS } from '../constants/config';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [isLoggedIn,     setIsLoggedIn]     = useState(false);
  const [otpCooldownSec, setOtpCooldownSec] = useState(0);

  /**
   * needsSetup = true  → user token exists but they haven't finished the
   *                       NAME + LOCATION + GST onboarding wizard yet.
   *                       App.js keeps showing <LoginScreen> so they can finish.
   * needsSetup = false → fully onboarded; App.js shows <AppNavigator>.
   */
  const [needsSetup, setNeedsSetup] = useState(false);

  // OTP rate-limiting (client-side guard — server still enforces limits)
  const otpCooldownRef  = useRef(null); // interval timer reference
  const otpAttemptsRef  = useRef(0);    // number of verify attempts in this session

  // ── Restore session on app launch ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          // Reject stale tokens before making any network call
          if (await isTokenStale()) {
            await clearTokens();
            return;
          }
          const { data } = await api.get('/users/me');
          const u = data.data;
          setUser(u);
          setIsLoggedIn(true);
          // Resume setup wizard if profile is incomplete
          if (!u.name || !u.district) {
            setNeedsSetup(true);
          }
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function startCooldown() {
    setOtpCooldownSec(OTP_RESEND_COOLDOWN_SEC);
    if (otpCooldownRef.current) clearInterval(otpCooldownRef.current);
    otpCooldownRef.current = setInterval(() => {
      setOtpCooldownSec((s) => {
        if (s <= 1) {
          clearInterval(otpCooldownRef.current);
          otpCooldownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Strips +91 country code only when present (12-digit input), or leading 0
  // (11-digit input). Leaves a clean 10-digit number untouched.
  function normalisePhone(raw) {
    const d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) return d.slice(2);
    if (d.length === 11 && d.startsWith('0'))  return d.slice(1);
    return d;
  }

  async function sendOtp(phone) {
    if (otpCooldownSec > 0) {
      throw new Error(`Please wait ${otpCooldownSec}s before requesting another OTP.`);
    }

    const digits = normalisePhone(phone);
    if (!/^\d{10}$/.test(digits)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const { data } = await api.post('/auth/send-otp', { phone: digits });
    otpAttemptsRef.current = 0;
    startCooldown();
    // devOtp is only present when MSG91 is not configured (dev mode)
    return { devOtp: data?.data?.devOtp || null };
  }

  async function verifyOtp(phone, otp) {
    if (otpAttemptsRef.current >= OTP_MAX_ATTEMPTS) {
      throw new Error('Too many attempts. Please request a new OTP.');
    }
    otpAttemptsRef.current += 1;

    const digits = normalisePhone(phone);

    const { data } = await api.post('/auth/verify-otp', { phone: digits, otp });
    const { accessToken, refreshToken, user: u, isNewUser } = data.data;
    await saveTokens({ accessToken, refreshToken, userId: u.id });
    otpAttemptsRef.current = 0;
    setUser(u);
    setIsLoggedIn(true);
    // New users (or users with incomplete profile) must finish the wizard
    // before the main app is shown.
    const needsSetupNow = isNewUser || !u.name || !u.district;
    if (needsSetupNow) setNeedsSetup(true);
    return { isNewUser, needsSetup: needsSetupNow };
  }

  /**
   * Called by LoginScreen after the SETUP step completes successfully.
   * Clears the needsSetup flag so App.js switches to AppNavigator.
   */
  function finishSetup() {
    setNeedsSetup(false);
  }

  async function logout() {
    // Revoke the refresh token server-side before clearing local storage.
    // This prevents the token from being usable for the remaining 30-day TTL
    // if it is ever extracted from the device.
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Server call failed (e.g. network offline) — still clear local state
      // so the user is logged out on this device. The server token will expire
      // naturally at the 30-day TTL.
    }
    await clearTokens();
    setUser(null);
    setIsLoggedIn(false);
    setNeedsSetup(false);
    otpAttemptsRef.current = 0;
    if (otpCooldownRef.current) {
      clearInterval(otpCooldownRef.current);
      otpCooldownRef.current = null;
    }
    setOtpCooldownSec(0);
  }

  function updateUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loading,
        needsSetup,
        otpCooldownSec,
        sendOtp,
        verifyOtp,
        finishSetup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
