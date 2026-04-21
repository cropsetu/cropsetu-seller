# Deployment — CropSetu Seller App

Guide to build and publish the seller-side React Native app.

---

## Prerequisites

- GitHub repo: **https://github.com/cropsetu/cropsetu-seller** (already pushed)
- Expo account: **cropsetu**
- **EAS project ID: not yet created for this app** — see Step 0
- Backend deployed — see [cropsetu-backend/DEPLOYMENT.md](https://github.com/cropsetu/cropsetu-backend/blob/main/DEPLOYMENT.md)
- Play Console dev account ($25 one-time) for release

---

## Step 0 — Create the EAS project (one-time)

This repo's `app.json` has `"projectId": "REPLACE_AFTER_EAS_INIT"` because the seller needs its own Expo project (separate from the farmer app).

```bash
npm install -g eas-cli
eas login                             # as cropsetu
cd ~/Desktop/farmeasy-seller
eas init                              # creates a new EAS project under cropsetu account
```

`eas init` will:
- Create a new project on expo.dev under the cropsetu org
- Update `app.json` → `expo.extra.eas.projectId` with the new ID automatically
- Add an `updates.url` entry too

Commit and push the updated `app.json`:
```bash
git add app.json && git commit -m "chore: wire up EAS project ID"
git push
```

## Step 1 — Point the app at the production backend

Edit [`src/constants/config.js`](./src/constants/config.js) — replace the placeholder Railway URL with your actual one:

```js
export const API_BASE_URL = __DEV__
  ? `http://${DEV_LAN_IP}:3001/api/v1`
  : 'https://<your-railway-domain>/api/v1';  // ← update
```

For emulator dev, also consider changing `DEV_LAN_IP` to `10.0.2.2` (Android emulator) or keep your LAN IP for physical devices.

## Step 2 — Build profiles (from [eas.json](./eas.json))

| Profile | Output | Use for |
|---|---|---|
| `development` | Dev client APK | Local testing with Metro |
| `preview` | Standalone APK | Internal testing |
| `production` | AAB | Play Store |

## Step 3 — First preview build

```bash
eas build --profile preview --platform android
```

Wait ~10–15 min, get a shareable APK link.

## Step 4 — Production build + Play Store

```bash
eas build --profile production --platform android
```

Play Store setup:
- Create a SEPARATE app listing on Play Console (distinct from the farmer app). Name: **CropSetu Seller**.
- Upload the AAB to the Internal testing track first.
- Same service account JSON used for the farmer app will work — drop it in `play-store-credentials.json` at this repo root.

Then:
```bash
eas submit --platform android --profile production
```

## Step 5 — OTA updates

```bash
eas update --branch production --message "Fix orders page"
```

---

## CI / GitHub Actions

Same as the farmer app:

- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — bundle check + secret scan on every push
- [`.github/workflows/eas-build.yml`](./.github/workflows/eas-build.yml) — manual cloud build trigger

Set the `EXPO_TOKEN` GitHub secret (same token works for both apps under the same Expo account).

---

## Known gaps

- `LANGUAGES` array translations for seller app may need dot-path fix if you hit the same issue the farmer app had (see farmer [LanguageContext.js](https://github.com/cropsetu/cropsetu-frontend/blob/main/src/context/LanguageContext.js) for the pattern).
- Bundle ID `com.farmeasy.seller` still reflects the old brand. If you want `com.cropsetu.seller`, update `app.json` + `ios.bundleIdentifier` + `android.package` BEFORE the first Play Store submission — after submission, it's frozen.

---

## Quick reference

```bash
# First-time setup
eas init

# Build APK for internal testing
eas build --profile preview --platform android

# Build AAB for Play Store
eas build --profile production --platform android
eas submit --platform android --profile production

# Push JS update
eas update --branch production
```
