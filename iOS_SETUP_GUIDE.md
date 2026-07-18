# Nexus iOS App Setup Guide

Your React app has been configured for iOS via Capacitor. You can build it two ways:

- **Build with Codemagic (no Mac needed)** — recommended if you don't own a Mac. Jump to the section below.
- **Build locally with Xcode** — the rest of this guide, if you have a Mac.

---

## Build with Codemagic (cloud, no Mac required)

`codemagic.yaml` is included and pre-configured for a Capacitor iOS build. It installs
dependencies, builds the web app, generates the native iOS project, signs it, and uploads
to TestFlight — all on Codemagic's cloud Macs.

**One-time setup:**

1. Put this project in a Git repo (GitHub/GitLab/Bitbucket) and connect it in Codemagic
   (**Applications → Add application**).
2. **Team → Integrations → App Store Connect:** add an App Store Connect API key and name the
   integration `Nexus App Store Connect` (or rename it in `codemagic.yaml` to match yours).
3. In **App Store Connect**, create the app record using bundle ID `com.nexusrewards.app`
   (or change `BUNDLE_ID` in `codemagic.yaml` **and** `appId` in `capacitor.config.json` to your own).
4. Codemagic manages signing certificates and profiles automatically once the integration exists.

**Every build after that:** push to your repo (or click **Start new build**). Codemagic
archives the app and uploads it to TestFlight. Invite yourself as a tester (see Step 7d below),
install TestFlight on your iPhone, and download Nexus.

> The `ios/` native folder does not need to be committed — `codemagic.yaml` runs
> `npx cap add ios` automatically if it's missing.

---

## Prerequisites (local Xcode build)
- Node.js 18+ installed
- Xcode 15+ (with Command Line Tools)
- Apple Developer Account (for code signing)
- An iOS device or simulator running iOS 14+

## Step 1: Install Dependencies

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

## Step 2: Build the React App for Capacitor

```bash
npm run build
```

If you don't have a build script, create one:
- If using Vite: `npm run build` (builds to `dist/`)
- If using Create React App: `npm run build` (builds to `build/`)
- Update `capacitor.config.json` `webDir` to match your output folder

## Step 3: Create the iOS Project

```bash
npx cap add ios
```

This scaffolds a native Xcode project at `ios/App/`.

## Step 4: Sync Web Files to Xcode

Whenever you update the React app:

```bash
npm run build
npx cap sync ios
```

This copies your latest web build into the Xcode project.

## Step 5: Open Xcode and Configure Signing

```bash
npx cap open ios
```

In Xcode:
1. **Select the "Nexus" project** in the left sidebar
2. **Select the "App" target**
3. Go to **Signing & Capabilities**
4. **Select your team** (Apple Developer Account) from the dropdown
5. **Update the Bundle ID** to something unique (e.g., `com.yourname.nexus`)
6. Xcode will auto-generate a provisioning profile

## Step 6: Test on Simulator

1. In Xcode, select **Product → Destination** and choose an iPhone simulator (e.g., "iPhone 15 Pro")
2. Press **Cmd + R** to build and run
3. The app opens in the simulator
4. **Test the app:**
   - Swipe between tabs (Deadlines, Fee scorecard, Points)
   - Tap to edit benefits and usage
   - Toggle dark mode
   - Check that notch/safe-area spacing looks correct (no cut-off at top/bottom)

## Step 7: Test on Real Device (TestFlight)

### 7a. Create an App ID in Apple Developer
1. Visit [developer.apple.com/account](https://developer.apple.com/account)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click **+** and register your app ID (e.g., `com.yourname.nexus`)
4. Keep the Bundle ID in Xcode matching exactly

### 7b. Notifications
- Nexus uses **local notifications** (via `@capacitor/local-notifications`) for the "annual fee
  due in ~1 month" reminders. These are scheduled on-device and need **no** Push Notifications
  capability, no APNs setup, and no server.
- The app requests notification permission at runtime the first time it has a reminder to schedule.
  Nothing to configure in Xcode/Codemagic for this to work.

### 7c. Archive and Upload
1. In Xcode: **Xcode → Settings → Accounts**
   - Sign in with your Apple Developer account
2. Select **Nexus target** → **Build Settings** → search for "Development Team"
   - Ensure your team is selected
3. Connect your iPhone via USB
4. Select your iPhone as the destination (top-left dropdown in Xcode)
5. **Product → Archive** and follow the prompts to upload to TestFlight

### 7d. Invite Testers in App Store Connect
1. Visit [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **TestFlight** → **Internal Testing**
3. Add yourself (or others) as testers
4. Download TestFlight app on your iPhone
5. Accept the invite and download Nexus
6. Test on the real device and report any issues

## iOS-Specific Gotchas

### Input Zoom Gets "Stuck"
- **Already fixed in your code** via viewport lock and 16px font-size on inputs

### Content Hidden Under Notch / Dynamic Island
- **Already fixed in your code** via `viewport-fit=cover` and `env(safe-area-inset-*)`
- Test on iPhone 14+ Pro to verify

### Dark Mode Not Working
- Ensure you have both light and dark theme colors defined in `THEMES`
- Capacitor picks up system dark mode automatically

### Storage Not Persisting
- Capacitor uses `window.storage` from the browser; data persists in the app's sandbox
- If data disappears after app restart, check browser console for errors

## Debugging on Device

In Xcode:
- **Scheme** dropdown (top of window) → select "Nexus"
- **Run**
- View **Console** at the bottom to see logs
- Use `console.log()` in your code; they appear in Xcode's console

## Publishing to App Store (Next Step)

Once TestFlight is stable:
1. **Prepare metadata in App Store Connect:**
   - App icon (1024×1024, PNG)
   - Screenshots (use largest iPhone display size available at submission time)
   - Privacy Policy URL (must resolve, not 404)
   - App Privacy Answers (toggle each permission truthfully)
   - Age Rating (usually 4+)

2. **Archive and submit:**
   - **Product → Archive** in Xcode
   - Upload build
   - Attach to new version in App Store Connect
   - Submit for review (1–3 days typical)

## Questions?

- `npx cap --help` — view Capacitor CLI commands
- Check Capacitor docs: [capacitorjs.com](https://capacitorjs.com)
- Xcode console for runtime errors

---

**Bundle ID:** `com.nexusrewards.app` (update in Xcode before TestFlight submission)  
**App Name:** Nexus  
**Minimum iOS:** 14.0
