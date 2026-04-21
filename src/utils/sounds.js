/**
 * FarmEasy Seller — Sound Manager
 *
 * Place your audio files in:  assets/sounds/
 *   cow.mp3      — cow moo (played on login success)
 *   tractor.mp3  — tractor engine rev (played on app launch)
 *   cash.mp3     — cash register (played on new order / product saved)
 *   chime.mp3    — soft chime (played on button confirm)
 *
 * Free farm sounds:  https://freesound.org  (search "cow moo", "tractor")
 * If the files are missing the app runs silently — no crash.
 */

import { Audio } from 'expo-av';

const SOUND_FILES = {
  cow:     require('../../assets/sounds/cow.mp3'),
  tractor: require('../../assets/sounds/tractor.mp3'),
  cash:    require('../../assets/sounds/cash.mp3'),
  chime:   require('../../assets/sounds/chime.mp3'),
};

const cache = {};

async function play(key) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (cache[key]) {
      await cache[key].replayAsync();
      return;
    }
    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key], { shouldPlay: true });
    cache[key] = sound;
  } catch {
    // Missing file or device restriction — fail silently
  }
}

export const SoundManager = {
  /** Cow moo — login success */
  moo:     () => play('cow'),
  /** Tractor rev — app launch / dashboard load */
  tractor: () => play('tractor'),
  /** Cash register — product saved / order confirmed */
  cash:    () => play('cash'),
  /** Soft chime — general confirm */
  chime:   () => play('chime'),

  /** Release all cached sounds (call on logout) */
  async release() {
    try {
      await Promise.all(Object.values(cache).map((s) => s.unloadAsync()));
      Object.keys(cache).forEach((k) => delete cache[k]);
    } catch { /* ignore */ }
  },
};
