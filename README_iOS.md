# Nexus – iOS App Build Instructions

Welcome to the Nexus iOS app project. Your React rewards tracker is now ready to become a native iOS app.

## Quick Start (5 minutes)

### 1. Copy `rewards-tracker.jsx` into the project
```bash
cp rewards-tracker.jsx src/rewards-tracker.jsx
```

### 2. Install Capacitor & dependencies
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

### 3. Build and sync
```bash
npm run build
npx cap sync ios
```

### 4. Open in Xcode
```bash
npx cap open ios
```

### 5. Run on simulator
- In Xcode top-left: select an iPhone simulator (e.g., "iPhone 15 Pro")
- Press **Cmd + R**
- App opens in simulator

## Files Included

| File | Purpose |
|------|---------|
| `rewards-tracker.jsx` | Main React component (iOS-optimized with viewport fix + safe-area support) |
| `main.jsx` | React entry point |
| `index.html` | HTML template |
| `vite.config.js` | Build configuration |
| `capacitor.config.json` | iOS app configuration |
| `package.json.template` | Dependency list (rename to `package.json` if starting fresh) |
| `codemagic.yaml` | Cloud CI build config — builds the iOS app on Codemagic without a Mac |
| `iOS_SETUP_GUIDE.md` | Detailed Capacitor + Codemagic setup guide |

## What's Ready for iOS

✅ **Choose your cards** — Toggle any card on/off under **⚙ manage cards**; off cards disappear from every tab  
✅ **Editable fee & renewal month** — Set each card's real annual fee amount and the month it posts  
✅ **Annual fee reminders (1 month ahead)** — A real iOS notification *and* an in-app banner fire ~1 month before each included card's fee  
✅ **Viewport fix** — Prevents input zoom from "sticking"  
✅ **Safe-area support** — Content won't hide under notch/Dynamic Island  
✅ **Dark mode** — Responds to system theme  
✅ **Input font-size** — Set to 16px to avoid iOS zoom on focus  
✅ **Data persistence** — Using browser storage (survives app restart)

## Next: Build in the cloud with Codemagic

No Mac required — `codemagic.yaml` is included and pre-wired for a Capacitor iOS build.
See **iOS_SETUP_GUIDE.md → "Build with Codemagic"** for the step-by-step.

## Setting each card's fee & renewal month

You no longer edit code for this. In the app:

1. Tap **⚙ manage cards** (just under the card row).
2. Toggle each card **on/off** to choose which ones the tracker follows.
3. Set the **annual fee ($)** and the month the fee **posts in** for each card.

That's it — the app schedules a notification ~1 month before each included card's fee
and shows a matching in-app banner. Turning a card off cancels its reminder and hides it
everywhere. New cards you add ("+ Add card") include the same fee + month fields.

> **Notifications permission:** the first time the app has a reminder to schedule, iOS asks
> permission to send notifications. If you tap "Don't Allow," the in-app banner still works;
> re-enable later in **iOS Settings → Nexus → Notifications**.

## Testing Checklist

- [ ] Simulator loads app in Xcode
- [ ] Can tap between tabs (Deadlines, Fee scorecard, Points & miles)
- [ ] Can edit benefits and mark as used
- [ ] Dark mode toggle works
- [ ] No content cut off at top (notch) or bottom (home indicator)
- [ ] Text inputs don't zoom when tapped (or zoom resets after)
- [ ] Data persists after closing & reopening app

## Common Issues

**"npm: command not found"**
- Install Node.js from [nodejs.org](https://nodejs.org/)

**"cap: command not found" when running `npx cap ...`**
- Run `npm install` first to set up node_modules

**Input still zooms on focus in simulator**
- This is normal in the simulator but won't happen on real devices
- Test on actual iPhone to confirm the fix works

**Content hidden under notch in simulator**
- Simulator may not show safe-area correctly
- Test on real iPhone 14+ Pro to verify

**Xcode says "Signing required"**
- Follow step 5 in iOS_SETUP_GUIDE.md (configure team & bundle ID)

## App Store Submission (Later)

When ready to publish:
1. Get app icon designed (1024×1024 PNG)
2. Take screenshots of app on largest iPhone available
3. Write Privacy Policy
4. Set age rating
5. Follow "Publishing to App Store" in iOS_SETUP_GUIDE.md

---

**Bundle ID:** `com.nexusrewards.app` (change before TestFlight)  
**Minimum iOS:** 14.0  
**Status:** Ready for TestFlight testing

Questions? See iOS_SETUP_GUIDE.md for detailed instructions.
