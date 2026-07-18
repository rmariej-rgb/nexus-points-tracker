import { useState, useEffect, useMemo, useRef } from "react";

/* ————— iOS Viewport Fix ————— */
// Prevent input zoom-stick on iOS; lock viewport; enable safe-area
const iOSViewportFix = () => {
  let m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement("meta"); m.name = "viewport"; document.head.appendChild(m); }
  m.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
};

/* ————— Themes ————— */
const THEMES = {
  light: {
    bg: "#F1F2F4", surface: "#FFFFFF", surfaceAlt: "#F6F7F9", panel: "#FAFBFC",
    border: "#E1E3E7", borderSoft: "#C6C9CE", text: "#171B22", sub: "#6B7078", faint: "#8A8F97",
    inverseBg: "#171B22", inverseText: "#F1F2F4",
    green: "#2E7D46", greenBg: "#EAF5EE", red: "#B4232A", redBg: "#FBEBEC",
    amber: "#A98737", amberBg: "#FFF7E8", amberBorder: "#E8D5A3", amberText: "#8A6A1F",
    track: "#EDEEF1", shadow: "rgba(0,0,0,.15)",
  },
  dark: {
    bg: "#101317", surface: "#1A1E24", surfaceAlt: "#22262D", panel: "#15181D",
    border: "#2C313A", borderSoft: "#3A404B", text: "#E8EAED", sub: "#9AA0A9", faint: "#7A808A",
    inverseBg: "#E8EAED", inverseText: "#101317",
    green: "#5FBF7F", greenBg: "#1C2B21", red: "#E4707A", redBg: "#33191D",
    amber: "#D4AF63", amberBg: "#292213", amberBorder: "#4A3E1F", amberText: "#D4AF63",
    track: "#2C313A", shadow: "rgba(0,0,0,.5)",
  },
};

const GlobalStyle = ({ T }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Schibsted+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; }
    .rt-root { font-family: 'Schibsted Grotesk', sans-serif; min-height: 100vh; }
    .rt-serif { font-family: 'Instrument Serif', serif; }
    .rt-mono { font-family: 'Spline Sans Mono', monospace; }
    .card-rail::-webkit-scrollbar { display: none; }
    .card-rail { scrollbar-width: none; }
    @keyframes rt-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .rt-row { animation: rt-in .35s ease both; }
    @media (prefers-reduced-motion: reduce) { .rt-row { animation: none; } }
    button { font-family: inherit; cursor: pointer; }
    input, select, textarea { font-family: inherit; font-size: 16px; }
    input:focus, select:focus, button:focus-visible { outline: 2px solid ${T.text}; outline-offset: 2px; }
    select option { color: #171B22; }
    /* iOS safe-area handled on the app shell so content clears the notch / Dynamic Island
       at the top and the home indicator at the bottom, plus rounded-corner insets in landscape. */
    .rt-shell {
      padding-top: calc(20px + env(safe-area-inset-top));
      padding-bottom: calc(80px + env(safe-area-inset-bottom));
      padding-left: max(18px, env(safe-area-inset-left));
      padding-right: max(18px, env(safe-area-inset-right));
    }
  `}</style>
);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ————— Cards (earn = where this card beats the others in your wallet) ————— */
// annualMonth is 0-indexed (0 = January). These are placeholders — set each
// card's real renewal month in "Manage cards" so reminders fire on time.
const CARDS = [
  { id: "gold", name: "Amex Gold", issuer: "American Express", fee: 325, annualMonth: 4,
    earn: "4x DINING · 4x U.S. SUPERMARKETS",
    bg: "linear-gradient(120deg,#EAD9A8 0%,#CDA95C 45%,#A98737 100%)", ink: "#3A2E10", accent: "#A98737" },
  { id: "plat", name: "Amex Platinum", issuer: "American Express", fee: 895, annualMonth: 0,
    earn: "5x FLIGHTS (AIRLINE DIRECT / AMEX TRAVEL)",
    bg: "linear-gradient(120deg,#EFF0F2 0%,#C9CCD1 50%,#A9ADB4 100%)", ink: "#2A2D33", accent: "#8B909A" },
  { id: "csp", name: "Sapphire Preferred", issuer: "Chase", fee: 95, annualMonth: 10,
    earn: "3x DINING · GAS · VACATION RENTALS",
    bg: "linear-gradient(120deg,#27476E 0%,#1B3050 55%,#12213A 100%)", ink: "#DCE6F4", accent: "#2E5486" },
  { id: "cibp", name: "Ink Business Preferred", issuer: "Chase", fee: 95, annualMonth: 7,
    earn: "3x TRAVEL · SHIPPING · ADS · INTERNET",
    bg: "linear-gradient(120deg,#2B2E34 0%,#1B1D21 60%,#111317 100%)", ink: "#D8DADE", accent: "#3D4149" },
  { id: "citi-exec", name: "AAdvantage Executive World Elite", issuer: "Citi / American Airlines", fee: 595, annualMonth: 2,
    earn: "4x AMERICAN AIRLINES PURCHASES",
    bg: "linear-gradient(120deg,#43474E 0%,#2C2F35 55%,#1E2126 100%)", ink: "#E4E6E9", accent: "#B4232A" },
  { id: "citi-plat", name: "AAdvantage Platinum Select World Elite", issuer: "Citi / American Airlines", fee: 99, annualMonth: 6,
    earn: "2x AMERICAN AIRLINES · RESTAURANTS · GAS",
    bg: "linear-gradient(120deg,#8B4513 0%,#5C2E0A 55%,#3D1F05 100%)", ink: "#F5DEB3", accent: "#CD853F" },
  { id: "cap-venture", name: "Venture Rewards", issuer: "Capital One", fee: 95, annualMonth: 5,
    earn: "2x ALL PURCHASES (unlimited)",
    bg: "linear-gradient(120deg,#D4433B 0%,#A0332F 55%,#6B2226 100%)", ink: "#FFF5E6", accent: "#F0AD4E" },
];

const FINISHES = [
  { id: "gold", label: "Gold", bg: "linear-gradient(120deg,#EAD9A8 0%,#CDA95C 45%,#A98737 100%)", ink: "#3A2E10", accent: "#A98737" },
  { id: "silver", label: "Silver", bg: "linear-gradient(120deg,#EFF0F2 0%,#C9CCD1 50%,#A9ADB4 100%)", ink: "#2A2D33", accent: "#8B909A" },
  { id: "sapphire", label: "Sapphire", bg: "linear-gradient(120deg,#27476E 0%,#1B3050 55%,#12213A 100%)", ink: "#DCE6F4", accent: "#2E5486" },
  { id: "ink", label: "Ink", bg: "linear-gradient(120deg,#2B2E34 0%,#1B1D21 60%,#111317 100%)", ink: "#D8DADE", accent: "#3D4149" },
  { id: "graphite", label: "Graphite", bg: "linear-gradient(120deg,#43474E 0%,#2C2F35 55%,#1E2126 100%)", ink: "#E4E6E9", accent: "#B4232A" },
  { id: "emerald", label: "Emerald", bg: "linear-gradient(120deg,#2E6B4F 0%,#1F4E38 55%,#143526 100%)", ink: "#DCEFE5", accent: "#2E7D46" },
  { id: "burgundy", label: "Burgundy", bg: "linear-gradient(120deg,#7A2E3A 0%,#5A1F29 55%,#3E141C 100%)", ink: "#F2DEE2", accent: "#8E3542" },
  { id: "rose", label: "Rosé", bg: "linear-gradient(120deg,#EFC9C0 0%,#D9A69A 50%,#B97F72 100%)", ink: "#4A2620", accent: "#B97F72" },
];

const FREQ = {
  monthly: { label: "Monthly", short: "MO" },
  quarterly: { label: "Quarterly", short: "QT" },
  semiannual: { label: "Every 6 months", short: "6M" },
  annual: { label: "Calendar year", short: "YR" },
  multiyear: { label: "No fixed deadline", short: "—" },
};

const DEFAULT_BENEFITS = [
  { id: "g1", cardId: "gold", name: "Dining credit (Grubhub, Five Guys, Cheesecake Factory, Wonder…)", amount: 10, freq: "monthly", notes: "Enrollment required." },
  { id: "g2", cardId: "gold", name: "Uber Cash", amount: 10, freq: "monthly", notes: "Add card to Uber wallet; expires monthly." },
  { id: "g3", cardId: "gold", name: "Dunkin' credit", amount: 7, freq: "monthly", notes: "U.S. Dunkin' locations. Enrollment required." },
  { id: "g4", cardId: "gold", name: "Resy dining credit", amount: 50, freq: "semiannual", notes: "Up to $50 Jan–Jun and $50 Jul–Dec at U.S. Resy restaurants." },
  { id: "p1", cardId: "plat", name: "Airline incidental fee credit", amount: 200, freq: "annual", notes: "Select one airline; covers incidentals like bags & seat fees." },
  { id: "p2", cardId: "plat", name: "Uber Cash", amount: 15, freq: "monthly", notes: "$15/mo + $20 bonus in December." },
  { id: "p3", cardId: "plat", name: "Uber One membership credit", amount: 120, freq: "annual", notes: "Auto-renewing Uber One paid with the card." },
  { id: "p4", cardId: "plat", name: "Hotel credit (FHR / Hotel Collection)", amount: 300, freq: "semiannual", notes: "Prepaid Amex Travel bookings; THC needs 2-night min." },
  { id: "p5", cardId: "plat", name: "Resy dining credit", amount: 100, freq: "quarterly", notes: "U.S. Resy partner restaurants; enrollment required." },
  { id: "p6", cardId: "plat", name: "Digital entertainment credit", amount: 25, freq: "monthly", notes: "Eligible subscriptions (Peacock, Audible, NYT…)." },
  { id: "p7", cardId: "plat", name: "lululemon credit", amount: 75, freq: "quarterly", notes: "U.S. lululemon purchases; enrollment required." },
  { id: "p8", cardId: "plat", name: "Walmart+ membership credit", amount: 13, freq: "monthly", notes: "Covers monthly Walmart+ plan paid with the card." },
  { id: "p9", cardId: "plat", name: "CLEAR+ credit", amount: 209, freq: "annual", notes: "Applied when you pay for CLEAR+ with the card." },
  { id: "p10", cardId: "plat", name: "Global Entry / TSA PreCheck fee", amount: 120, freq: "multiyear", notes: "Once every 4–4.5 years." },
  { id: "c1", cardId: "csp", name: "Chase Travel hotel credit", amount: 100, freq: "annual", notes: "Doubled to $100 in the June 2026 refresh; resets each account anniversary — adjust timing to yours." },
  { id: "c2", cardId: "csp", name: "DoorDash non-restaurant promo", amount: 10, freq: "monthly", notes: "Requires activated DashPass (activate by 12/31/27)." },
  { id: "c3", cardId: "csp", name: "Apple TV — 1 year free", amount: 13, freq: "monthly", notes: "Must activate by Dec 31, 2026." },
  { id: "c4", cardId: "csp", name: "Global Entry / TSA PreCheck / NEXUS fee", amount: 120, freq: "multiyear", notes: "Once every 4 years — new with the 2026 refresh." },
  { id: "i1", cardId: "cibp", name: "Cell phone protection", amount: 0, freq: "multiyear", notes: "Pay your phone bill with the card to stay covered (up to $1,000/claim). No recurring credits on this card — its value is 3x categories." },
  { id: "a1", cardId: "citi-exec", name: "Admirals Club membership", amount: 0, freq: "multiyear", notes: "Full membership + 2 guests. Immediate family included." },
  { id: "a2", cardId: "citi-exec", name: "Avis / Budget rental credit", amount: 120, freq: "annual", notes: "On eligible prepaid rentals." },
  { id: "a3", cardId: "citi-exec", name: "Lyft credit", amount: 10, freq: "monthly", notes: "$10 back after 3 eligible rides each month." },
  { id: "a4", cardId: "citi-exec", name: "Grubhub credit", amount: 10, freq: "monthly", notes: "Monthly statement credit on eligible orders." },
  { id: "a5", cardId: "citi-exec", name: "Global Entry / TSA PreCheck fee", amount: 120, freq: "multiyear", notes: "Once every 4 years." },
  { id: "cps1", cardId: "citi-plat", name: "Free checked bag (+ up to 4 guests)", amount: 0, freq: "multiyear", notes: "Domestic AA flights; cardmember + 4 companions." },
  { id: "cps2", cardId: "citi-plat", name: "$125 AA flight discount", amount: 125, freq: "annual", notes: "Earned after $20k spend during membership year. Auto-renews if card renewed." },
  { id: "cps3", cardId: "citi-plat", name: "Annual fee waiver (year 1)", amount: 99, freq: "multiyear", notes: "First year free; $99/year thereafter." },
  { id: "cov1", cardId: "cap-venture", name: "Global Entry / TSA PreCheck credit", amount: 120, freq: "multiyear", notes: "Once every 4 years. Capital One reimburses fee." },
  { id: "cov2", cardId: "cap-venture", name: "2x miles on all purchases", amount: 0, freq: "multiyear", notes: "Unlimited; no category caps. Simplest earning structure." },
];

const DEFAULT_POINTS = [
  { id: "amex", name: "Amex Membership Rewards", cards: "Gold + Platinum", balance: 470000, cpp: 2.0 },
  { id: "chase", name: "Chase Ultimate Rewards", cards: "Sapphire Preferred + Ink Preferred", balance: 77000, cpp: 2.05 },
  { id: "p2chase", name: "P2's Chase Ultimate Rewards", cards: "P2 · estimated", balance: 60000, cpp: 2.05 },
  { id: "capone", name: "Capital One Miles", cards: "Venture Rewards", balance: 0, cpp: 1.85 },
  { id: "aa", name: "American AAdvantage", cards: "Citi Executive + Platinum Select", balance: 70000, cpp: 1.5 },
  { id: "delta", name: "Delta SkyMiles", cards: "Airline program", balance: 13000, cpp: 1.2 },
  { id: "ua", name: "United MileagePlus", cards: "Airline program", balance: 24000, cpp: 1.35 },
  { id: "sw", name: "Southwest Rapid Rewards", cards: "Airline program", balance: 16000, cpp: 1.3 },
  { id: "ac", name: "Air Canada Aeroplan", cards: "Airline program", balance: 16000, cpp: 1.5 },
  { id: "marriott", name: "Marriott Bonvoy", cards: "Hotel program", balance: 11000, cpp: 0.8 },
];

const STORAGE_KEY = "travel-rewards-tracker-v1";
const REMIND_DAYS = 31; // remind ~1 month before an annual fee posts

/* ————— Period helpers ————— */
function periodKey(freq, d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  if (freq === "monthly") return `${y}-M${m + 1}`;
  if (freq === "quarterly") return `${y}-Q${Math.floor(m / 3) + 1}`;
  if (freq === "semiannual") return `${y}-H${m < 6 ? 1 : 2}`;
  if (freq === "annual") return `${y}`;
  return "once";
}
function periodEnd(freq, d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  if (freq === "monthly") return new Date(y, m + 1, 0, 23, 59, 59);
  if (freq === "quarterly") return new Date(y, (Math.floor(m / 3) + 1) * 3, 0, 23, 59, 59);
  if (freq === "semiannual") return new Date(y, m < 6 ? 6 : 12, 0, 23, 59, 59);
  if (freq === "annual") return new Date(y, 12, 0, 23, 59, 59);
  return null;
}
function periodsOfYear(freq, year) {
  const mk = (key, label, endMonth) => ({ key, label, end: new Date(year, endMonth, 0, 23, 59, 59) });
  if (freq === "monthly") return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((l, i) => mk(`${year}-M${i + 1}`, l, i + 1));
  if (freq === "quarterly") return [1, 2, 3, 4].map((q) => mk(`${year}-Q${q}`, `Q${q}`, q * 3));
  if (freq === "semiannual") return [1, 2].map((h) => mk(`${year}-H${h}`, h === 1 ? "Jan–Jun" : "Jul–Dec", h * 6));
  if (freq === "annual") return [mk(`${year}`, `${year}`, 12)];
  return [{ key: "once", label: "One-time", end: null }];
}
const daysLeft = (end) => end ? Math.max(0, Math.ceil((end - new Date()) / 86400000)) : null;
const fmtDate = (d) => d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
const money = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Shrink the card-tile title so long official names (e.g. "AAdvantage Platinum
// Select World Elite") still fit inside the 196px card without overflowing.
const cardNameSize = (name) => {
  const len = (name || "").length;
  if (len > 30) return 12.5;
  if (len > 24) return 13.5;
  if (len > 18) return 14;
  return 15;
};
// 2-line clamp shared by card tiles so a wrapped name never collides with the fee row.
const cardNameClamp = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };

// Next occurrence of a card's annual-fee date (1st of its renewal month).
function nextFeeDate(annualMonth, from = new Date()) {
  if (annualMonth === undefined || annualMonth === null) return null;
  let due = new Date(from.getFullYear(), annualMonth, 1, 9, 0, 0);
  if (due <= from) due = new Date(from.getFullYear() + 1, annualMonth, 1, 9, 0, 0);
  return due;
}

/* ————— Local notifications (real iOS reminders, ~1 month before each fee) ————— */
// Stable positive int id per card for scheduling/cancelling notifications.
function notifId(cardId) {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2000000000) + 1000;
}

async function syncFeeNotifications(cards) {
  try {
    const core = await import("@capacitor/core");
    const Capacitor = core.Capacitor;
    if (!Capacitor || typeof Capacitor.isNativePlatform !== "function" || !Capacitor.isNativePlatform()) return;

    const mod = await import("@capacitor/local-notifications");
    const LocalNotifications = mod.LocalNotifications;

    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    // Clear anything we previously scheduled so edits/toggles take effect.
    const pending = await LocalNotifications.getPending();
    if (pending && pending.notifications && pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }

    const now = new Date();
    const toSchedule = [];
    cards.forEach((c) => {
      if (!c.enabled || !c.fee || c.annualMonth === undefined || c.annualMonth === null) return;
      const due = nextFeeDate(c.annualMonth, now);
      if (!due) return;
      const remindAt = new Date(due);
      remindAt.setMonth(remindAt.getMonth() - 1); // one month before
      if (remindAt <= now) return; // already inside the 1-month window — the in-app banner covers it
      toSchedule.push({
        id: notifId(c.id),
        title: `${c.name} annual fee coming up`,
        body: `Your ${money(c.fee)} annual fee posts around ${due.toLocaleDateString(undefined, { month: "long", day: "numeric" })}. Decide whether to keep, downgrade, or cancel.`,
        schedule: { at: remindAt, allowWhileIdle: true },
      });
    });
    if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
  } catch (e) {
    // Web/dev build or plugin unavailable — the in-app banner still works.
    console.warn("Fee notification sync skipped:", e && e.message ? e.message : e);
  }
}

/* ————— App ————— */
export default function RewardsTracker() {
  const [loaded, setLoaded] = useState(false);
  const [benefits, setBenefits] = useState(DEFAULT_BENEFITS);
  const [usage, setUsage] = useState({});
  const [points, setPoints] = useState(DEFAULT_POINTS);
  const [filter, setFilter] = useState(null);
  const [tab, setTab] = useState("benefits");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [managingCards, setManagingCards] = useState(false);
  const [customCards, setCustomCards] = useState([]);
  // Per-card overrides: { [cardId]: { enabled?, fee?, annualMonth? } }
  const [cardSettings, setCardSettings] = useState({});
  const [mode, setMode] = useState("light");
  const saveTimer = useRef(null);
  const T = THEMES[mode];

  // Merge base cards with the user's per-card settings (enabled / fee / month).
  const applySettings = (c) => {
    const s = cardSettings[c.id] || {};
    return {
      ...c,
      enabled: s.enabled !== undefined ? s.enabled : true,
      fee: s.fee !== undefined ? s.fee : c.fee,
      annualMonth: s.annualMonth !== undefined ? s.annualMonth : c.annualMonth,
    };
  };
  const allCards = useMemo(() => [...CARDS, ...customCards].map(applySettings), [customCards, cardSettings]);
  const activeCards = useMemo(() => allCards.filter((c) => c.enabled), [allCards]);
  const activeIds = useMemo(() => new Set(activeCards.map((c) => c.id)), [activeCards]);
  const customIds = useMemo(() => new Set(customCards.map((c) => c.id)), [customCards]);

  // iOS viewport fix (prevent input zoom-stick, enable safe-area)
  useEffect(() => {
    iOSViewportFix();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res?.value) {
          const data = JSON.parse(res.value);
          if (data.benefits) setBenefits(data.benefits);
          if (data.usage) setUsage(data.usage);
          if (data.theme) setMode(data.theme);
          if (data.customCards) setCustomCards(data.customCards);
          if (data.cardSettings) setCardSettings(data.cardSettings);
          if (data.points) {
            setPoints(DEFAULT_POINTS.map((def) => {
              const saved = data.points.find((p) => p.id === def.id);
              return saved && saved.balance > 0 ? { ...def, balance: saved.balance } : def;
            }));
          }
        }
      } catch (e) { /* first run — defaults are fine */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ benefits, usage, points, theme: mode, customCards, cardSettings }));
      } catch (e) { console.error("Save failed", e); }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [benefits, usage, points, mode, customCards, cardSettings, loaded]);

  // Keep real iOS reminders in sync whenever cards / fees / months change.
  useEffect(() => {
    if (!loaded) return;
    syncFeeNotifications(allCards);
  }, [allCards, loaded]);

  const now = new Date();

  const rows = useMemo(() => {
    return benefits
      .filter((b) => activeIds.has(b.cardId) && (!filter || b.cardId === filter))
      .map((b) => {
        const key = periodKey(b.freq, now);
        const used = usage[b.id]?.[key] || 0;
        const end = periodEnd(b.freq, now);
        return { ...b, key, used, end, dLeft: daysLeft(end), remaining: Math.max(0, b.amount - used) };
      })
      .sort((a, z) => {
        if (a.dLeft === null && z.dLeft === null) return 0;
        if (a.dLeft === null) return 1;
        if (z.dLeft === null) return -1;
        if ((a.remaining > 0) !== (z.remaining > 0)) return a.remaining > 0 ? -1 : 1;
        return a.dLeft - z.dLeft || z.remaining - a.remaining;
      });
  }, [benefits, usage, filter, activeIds]);

  const annualFees = useMemo(() => {
    return activeCards
      .filter((c) => c.fee && c.annualMonth !== undefined && c.annualMonth !== null)
      .map((c) => {
        const dueDate = nextFeeDate(c.annualMonth, now);
        return { card: c, dueDate, daysLeft: daysLeft(dueDate) };
      })
      .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));
  }, [now, activeCards]);

  const atStake = useMemo(() =>
    benefits.reduce((sum, b) => {
      if (b.freq === "multiyear" || !activeIds.has(b.cardId)) return sum;
      const used = usage[b.id]?.[periodKey(b.freq, now)] || 0;
      return sum + Math.max(0, b.amount - used);
    }, 0), [benefits, usage, activeIds]);

  const setUsed = (b, amt) =>
    setUsage((u) => ({ ...u, [b.id]: { ...(u[b.id] || {}), [b.key]: amt } }));

  const cardOf = (id) => allCards.find((c) => c.id === id) || applySettings(CARDS[0]);

  const updateCardSetting = (id, patch) =>
    setCardSettings((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }));

  const removeCard = (id) => {
    setCustomCards((cs) => cs.filter((c) => c.id !== id));
    setBenefits((bs) => bs.filter((b) => b.cardId !== id));
    setCardSettings((s) => { const n = { ...s }; delete n[id]; return n; });
    setFilter(null);
  };

  if (!loaded) return (
    <div className="rt-root" style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: THEMES.light.bg }}>
      <GlobalStyle T={THEMES.light} />
      <div className="rt-mono" style={{ fontSize: 13, letterSpacing: 2, color: "#6B7078" }}>LOADING LEDGER…</div>
    </div>
  );

  return (
    <div className="rt-root" style={{ background: T.bg, color: T.text }}>
      <GlobalStyle T={T} />
      <div className="rt-shell" style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="rt-mono" style={{ fontSize: 11, letterSpacing: 3, color: T.sub }}>
              PERKS &amp; POINTS LEDGER · {now.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase()}
            </div>
            <h1 className="rt-serif" style={{ fontSize: 40, fontWeight: 400, margin: "6px 0 0", lineHeight: 1 }}>
              Use it or lose it<span style={{ color: T.red }}>.</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div className="rt-mono" style={{ fontSize: 11, letterSpacing: 2, color: T.sub }}>STILL ON THE TABLE</div>
              <div className="rt-mono" style={{ fontSize: 30, fontWeight: 600 }}>{money(atStake)}</div>
            </div>
            <button onClick={() => setMode(mode === "light" ? "dark" : "light")}
              aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={mode === "light" ? "Dark mode" : "Light mode"}
              style={{
                width: 40, height: 40, borderRadius: 999, border: `1px solid ${T.borderSoft}`,
                background: T.surface, color: T.text, fontSize: 17, display: "grid", placeItems: "center",
              }}>
              {mode === "light" ? "☾" : "☀"}
            </button>
          </div>
        </header>

        {/* Card rail */}
        <div className="card-rail" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "22px 2px 6px" }}>
          {activeCards.map((c) => {
            const active = filter === c.id;
            const cardStake = benefits.filter((b) => b.cardId === c.id && b.freq !== "multiyear")
              .reduce((s, b) => s + Math.max(0, b.amount - (usage[b.id]?.[periodKey(b.freq)] || 0)), 0);
            return (
              <button key={c.id} onClick={() => setFilter(active ? null : c.id)} aria-pressed={active}
                style={{
                  flex: "0 0 auto", width: 196, height: 128, borderRadius: 12, border: "none",
                  background: c.bg, color: c.ink, textAlign: "left", padding: "13px 14px 12px",
                  position: "relative", boxShadow: active ? `0 0 0 3px ${T.text}, 0 8px 20px ${T.shadow}` : `0 6px 16px ${T.shadow}`,
                  transform: active ? "translateY(-3px)" : "none", transition: "all .2s ease",
                }}>
                <div className="rt-mono" style={{ fontSize: 9, letterSpacing: 2, opacity: .75 }}>{c.issuer.toUpperCase()}</div>
                <div style={{ fontWeight: 700, fontSize: cardNameSize(c.name), marginTop: 2, lineHeight: 1.12, ...cardNameClamp }}>{c.name}</div>
                <div className="rt-mono" style={{ fontSize: 8, letterSpacing: .8, marginTop: 5, opacity: .85, fontWeight: 600, lineHeight: 1.4, ...cardNameClamp }}>
                  ★ {c.earn}
                </div>
                <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="rt-mono" style={{ fontSize: 10, opacity: .75 }}>AF {money(c.fee)}</span>
                  <span className="rt-mono" style={{ fontSize: 12, fontWeight: 600 }}>{money(cardStake)} left</span>
                </div>
                <div style={{ position: "absolute", top: 13, right: 14, width: 26, height: 19, borderRadius: 4, background: "rgba(255,255,255,.35)", border: "1px solid rgba(0,0,0,.15)" }} />
              </button>
            );
          })}
          {/* Add card tile */}
          <button onClick={() => { setAddingCard(true); setManagingCards(false); }} aria-label="Add a new card"
            style={{
              flex: "0 0 auto", width: 120, height: 128, borderRadius: 12,
              border: `1.5px dashed ${T.borderSoft}`, background: "transparent", color: T.sub,
              display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600,
            }}>
            <span><span style={{ fontSize: 22, display: "block", lineHeight: 1 }}>+</span>Add card</span>
          </button>
        </div>

        {/* Manage cards + filter controls */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setManagingCards((v) => !v); setAddingCard(false); }} className="rt-mono"
            aria-expanded={managingCards}
            style={{ background: "none", border: "none", fontSize: 11, letterSpacing: 1, color: managingCards ? T.text : T.sub, padding: "4px 2px", textDecoration: "underline" }}>
            ⚙ manage cards {allCards.length > activeCards.length ? `(${activeCards.length}/${allCards.length} on)` : ""}
          </button>
          {filter && (
            <>
              <button onClick={() => setFilter(null)} className="rt-mono"
                style={{ background: "none", border: "none", fontSize: 11, letterSpacing: 1, color: T.sub, padding: "4px 2px", textDecoration: "underline" }}>
                ✕ clear filter — show all cards
              </button>
              {customIds.has(filter) && (
                <button onClick={() => { if (window.confirm("Remove this card and all its tracked benefits? This can't be undone.")) removeCard(filter); }}
                  className="rt-mono"
                  style={{ background: "none", border: "none", fontSize: 11, letterSpacing: 1, color: T.red, padding: "4px 2px", textDecoration: "underline" }}>
                  remove this card
                </button>
              )}
            </>
          )}
        </div>

        {managingCards && (
          <ManageCardsPanel T={T} cards={allCards} customIds={customIds}
            onClose={() => setManagingCards(false)}
            onUpdate={updateCardSetting}
            onRemove={(id) => { if (window.confirm("Remove this card and all its tracked benefits? This can't be undone.")) removeCard(id); }} />
        )}

        {addingCard && (
          <AddCardPanel T={T} onCancel={() => setAddingCard(false)}
            onAdd={(card) => { setCustomCards((cs) => [...cs, { ...card, id: "card" + Date.now() }]); setAddingCard(false); }} />
        )}

        {/* Tabs */}
        <nav style={{ display: "flex", gap: 6, margin: "20px 0 14px", flexWrap: "wrap" }} role="tablist">
          {[["benefits", "Deadlines"], ["scorecard", "Fee scorecard"], ["points", "Points & miles"]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              style={{
                border: `1px solid ${T.text}`, borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                background: tab === id ? T.inverseBg : "transparent", color: tab === id ? T.inverseText : T.text,
              }}>{label}</button>
          ))}
        </nav>

        {tab === "benefits" && (
          <section aria-label="Benefit deadlines">
            {/* Annual Fees Due Soon (within ~1 month) */}
            {annualFees.some((af) => af.daysLeft !== null && af.daysLeft <= REMIND_DAYS) && (
              <div style={{ marginBottom: 20, padding: "12px 14px", background: T.panel, borderRadius: 12, border: `1px solid ${T.amberBorder}` }}>
                <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.amberText, fontWeight: 600, marginBottom: 10 }}>
                  ⏰ ANNUAL FEE REMINDER · DUE WITHIN A MONTH
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {annualFees.filter((af) => af.daysLeft !== null && af.daysLeft <= REMIND_DAYS).map((af) => (
                    <div key={af.card.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{af.card.name}</span>
                        <span className="rt-mono" style={{ fontSize: 11, color: T.sub, marginLeft: 8 }}>{money(af.card.fee)}</span>
                      </div>
                      <div className="rt-mono" style={{ textAlign: "right", fontSize: 12, color: af.daysLeft <= 14 ? T.red : T.amber }}>
                        <div style={{ fontWeight: 600 }}>{fmtDate(af.dueDate)}</div>
                        <div style={{ fontSize: 10, color: af.daysLeft <= 14 ? T.red : T.amber }}>{af.daysLeft}d</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rt-mono" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, padding: "0 14px 8px", fontSize: 10, letterSpacing: 2, color: T.sub }}>
              <span>BENEFIT</span><span>EXPIRES</span><span style={{ width: 84, textAlign: "right" }}>STATUS</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((b, i) => {
                const c = cardOf(b.cardId);
                const done = b.amount > 0 && b.remaining === 0;
                const urgent = b.dLeft !== null && b.dLeft <= 7 && !done;
                const soon = b.dLeft !== null && b.dLeft <= 21 && !done && !urgent;
                const isEdit = editing === b.id;
                return (
                  <div key={b.id} className="rt-row" style={{ animationDelay: `${i * 25}ms`, background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, borderLeft: `4px solid ${c.accent}`, overflow: "hidden", opacity: done ? .55 : 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "12px 14px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, background: c.accent, color: "#fff", borderRadius: 4, padding: "2px 6px" }}>{c.name.toUpperCase()}</span>
                          <span className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: T.sub }}>{FREQ[b.freq].label.toUpperCase()}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4, textDecoration: done ? "line-through" : "none" }}>
                          {b.amount > 0 && <span className="rt-mono">{money(b.amount)} · </span>}{b.name}
                        </div>
                        {b.notes && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{b.notes}</div>}
                      </div>
                      <div className="rt-mono" style={{ textAlign: "right", fontSize: 12, color: urgent ? T.red : T.text }}>
                        <div style={{ fontWeight: 600 }}>{fmtDate(b.end)}</div>
                        {b.dLeft !== null && <div style={{ fontSize: 10, color: urgent ? T.red : T.sub }}>{b.dLeft}d left</div>}
                      </div>
                      <div style={{ width: 84, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                        {b.amount > 0 ? (
                          <button onClick={() => setUsed(b, done ? 0 : b.amount)}
                            className="rt-mono"
                            style={{
                              fontSize: 10, letterSpacing: 1, borderRadius: 999, padding: "6px 10px", border: "1px solid",
                              borderColor: done ? T.green : urgent ? T.red : T.borderSoft,
                              background: done ? T.greenBg : urgent ? T.redBg : T.surfaceAlt,
                              color: done ? T.green : urgent ? T.red : T.text, fontWeight: 600,
                            }}>
                            {done ? "USED ✓" : urgent ? "EXPIRING" : soon ? "SOON" : "MARK USED"}
                          </button>
                        ) : <span className="rt-mono" style={{ fontSize: 10, color: T.sub }}>ONGOING</span>}
                        <button onClick={() => setEditing(isEdit ? null : b.id)}
                          style={{ background: "none", border: "none", fontSize: 11, color: T.sub, textDecoration: "underline", padding: 0 }}>
                          {isEdit ? "close" : "edit"}
                        </button>
                      </div>
                    </div>

                    {isEdit && (
                      <EditPanel
                        T={T}
                        benefit={b}
                        usageMap={usage[b.id] || {}}
                        onSetPeriod={(key, amt) => setUsage((u) => ({ ...u, [b.id]: { ...(u[b.id] || {}), [key]: amt } }))}
                        onSave={(patch) => { setBenefits((bs) => bs.map((x) => x.id === b.id ? { ...x, ...patch } : x)); setEditing(null); }}
                        onUsed={(amt) => setUsed(b, amt)}
                        onDelete={() => { setBenefits((bs) => bs.filter((x) => x.id !== b.id)); setEditing(null); }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 14 }}>
              {adding ? (
                <AddPanel T={T} cards={activeCards} filter={filter} onCancel={() => setAdding(false)}
                  onAdd={(nb) => { setBenefits((bs) => [...bs, { ...nb, id: "u" + Date.now() }]); setAdding(false); }} />
              ) : (
                <button onClick={() => setAdding(true)}
                  style={{ width: "100%", padding: 12, borderRadius: 12, border: `1.5px dashed ${T.borderSoft}`, background: "transparent", fontSize: 13, fontWeight: 600, color: T.sub }}>
                  + Add a benefit or credit
                </button>
              )}
            </div>

            <p style={{ fontSize: 11, color: T.faint, marginTop: 18, lineHeight: 1.5 }}>
              Amounts are pre-filled from published card terms as of mid-2026 but issuers change them often — tap "edit" on any row to correct values, and verify against your own benefit terms. Anniversary-based credits (like the Sapphire hotel credit) are tracked here on a calendar year; adjust to your renewal month if it differs. Set each card's real fee amount and renewal month under <strong>⚙ manage cards</strong> so reminders land on time.
            </p>
          </section>
        )}

        {tab === "scorecard" && (
          <section aria-label="Annual fee scorecard">
            <p style={{ fontSize: 13, color: T.sub, margin: "0 0 14px", lineHeight: 1.5 }}>
              How much of each annual fee you've clawed back in {now.getFullYear()} through statement credits. To log what you used in January–June, open any benefit on the Deadlines tab, tap <strong>edit</strong>, and tap the past periods in the year log.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCards.map((c) => {
                const year = String(now.getFullYear());
                const cardBenefits = benefits.filter((b) => b.cardId === c.id);
                const usedYTD = cardBenefits.reduce((s, b) =>
                  s + Object.entries(usage[b.id] || {}).reduce((t, [k, v]) => t + ((k.startsWith(year) || k === "once") ? v : 0), 0), 0);
                const recoverable = cardBenefits.filter((b) => b.freq !== "multiyear").reduce((s, b) =>
                  s + periodsOfYear(b.freq, now.getFullYear()).filter((p) => !p.end || p.end >= now)
                    .reduce((t, p) => t + Math.max(0, b.amount - (usage[b.id]?.[p.key] || 0)), 0), 0);
                const pct = c.fee ? Math.min(100, (usedYTD / c.fee) * 100) : 0;
                const net = usedYTD - c.fee;
                const canBreakEven = usedYTD + recoverable >= c.fee;
                return (
                  <div key={c.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `4px solid ${c.accent}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                      <div className="rt-mono" style={{ fontSize: 12, fontWeight: 600, color: net >= 0 ? T.green : T.text }}>
                        {money(usedYTD)} of {money(c.fee)} fee
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 10, background: T.track, borderRadius: 999, marginTop: 10, overflow: "hidden" }}
                      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} fee recovered`}>
                      <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct}%`, background: net >= 0 ? T.green : c.accent, borderRadius: 999, transition: "width .4s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                      <span className="rt-mono" style={{ fontSize: 10, letterSpacing: 1, color: net >= 0 ? T.green : T.sub }}>
                        {net >= 0 ? `BROKE EVEN · ${money(net)} AHEAD` : `${money(-net)} TO BREAK EVEN`}
                      </span>
                      <span className="rt-mono" style={{ fontSize: 10, letterSpacing: 1, color: canBreakEven || net >= 0 ? T.sub : T.red }}>
                        {money(recoverable)} STILL CLAIMABLE IN {now.getFullYear()}{!canBreakEven && net < 0 ? " — WON'T COVER FEE ALONE" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: T.faint, marginTop: 14, lineHeight: 1.5 }}>
              This counts statement credits only. Points earned, lounge access (Centurion, Admirals Club), elite status, and travel protections aren't in these numbers — so a card can be worth keeping even below the break-even line.
            </p>
          </section>
        )}

        {tab === "points" && (
          <section aria-label="Points balances">
            <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
              <strong className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.amberText }}>HEADS UP · OCT 1, 2026</strong>
              <div style={{ marginTop: 4 }}>Chase Ultimate Rewards transfers to World of Hyatt drop from 1:1 to 4:3 on Oct 1, 2026 for Sapphire Preferred and Ink Preferred. If you have a Hyatt redemption planned, transfer before then.</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {points.map((p) => (
                <div key={p.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: T.sub, marginTop: 2 }}>{p.cards.toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <input
                      className="rt-mono" type="number" min="0" value={p.balance}
                      aria-label={`${p.name} balance`}
                      onChange={(e) => setPoints((ps) => ps.map((x) => x.id === p.id ? { ...x, balance: Number(e.target.value) || 0 } : x))}
                      style={{ width: 130, fontSize: 18, fontWeight: 600, textAlign: "right", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", background: T.surfaceAlt, color: T.text }}
                    />
                    <div className="rt-mono" style={{ fontSize: 10, color: T.sub, marginTop: 3 }}>
                      ≈ {money(p.balance * p.cpp / 100)} at {p.cpp}¢/pt
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rt-mono" style={{ marginTop: 16, background: T.inverseBg, color: T.inverseText, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, letterSpacing: 2 }}>TOTAL ESTIMATED VALUE</span>
              <span style={{ fontSize: 24, fontWeight: 600 }}>{money(points.reduce((s, p) => s + p.balance * p.cpp / 100, 0))}</span>
            </div>
            <p style={{ fontSize: 11, color: T.faint, marginTop: 12, lineHeight: 1.5 }}>
              Cent-per-point values are common published estimates, not guarantees — your redemption value depends on how you use them. Balances save automatically.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ————— Toggle switch ————— */
function Toggle({ T, on, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label ? `Include ${label}` : "Toggle card"}
      onClick={() => onChange(!on)}
      style={{
        width: 46, height: 27, borderRadius: 999, border: "none", position: "relative", cursor: "pointer",
        background: on ? T.green : T.borderSoft, transition: "background .2s ease", flex: "0 0 auto",
      }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: 999,
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)", transition: "left .2s ease",
      }} />
    </button>
  );
}

/* ————— Manage cards panel (toggle + editable fee + renewal month) ————— */
function ManageCardsPanel({ T, cards, customIds, onClose, onUpdate, onRemove }) {
  const lbl = { fontSize: 10, letterSpacing: 1.5, color: T.sub, display: "block", marginBottom: 4 };
  const inp = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.surfaceAlt, color: T.text };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginTop: 10, display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub }}>MANAGE CARDS · INCLUDE, FEE &amp; RENEWAL MONTH</div>
        <button onClick={onClose} className="rt-mono" style={{ background: "none", border: "none", color: T.sub, fontSize: 11, textDecoration: "underline" }}>done</button>
      </div>
      {cards.map((c) => (
        <div key={c.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "start", padding: "12px 0", borderTop: `1px solid ${T.border}` }}>
          <div style={{ paddingTop: 2 }}>
            <Toggle T={T} on={c.enabled} onChange={(v) => onUpdate(c.id, { enabled: v })} label={c.name} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, opacity: c.enabled ? 1 : .5 }}>{c.name}</div>
                <div className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: T.sub }}>
                  {(c.issuer || "").toUpperCase()}{c.enabled ? "" : " · OFF"}
                </div>
              </div>
              {customIds.has(c.id) && (
                <button onClick={() => onRemove(c.id)} className="rt-mono"
                  style={{ background: "none", border: "none", color: T.red, fontSize: 10, textDecoration: "underline", flex: "0 0 auto" }}>remove</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8, opacity: c.enabled ? 1 : .5 }}>
              <div>
                <label className="rt-mono" style={lbl}>ANNUAL FEE ($)</label>
                <input style={inp} type="number" min="0" value={c.fee ?? 0} disabled={!c.enabled}
                  onChange={(e) => onUpdate(c.id, { fee: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="rt-mono" style={lbl}>FEE POSTS IN</label>
                <select style={inp} value={c.annualMonth ?? 0} disabled={!c.enabled}
                  onChange={(e) => onUpdate(c.id, { annualMonth: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="rt-mono" style={{ fontSize: 10, color: T.faint, lineHeight: 1.5, marginTop: 8, letterSpacing: .3 }}>
        You'll get a reminder — a phone notification and an in-app banner — about one month before each included card's fee posts. Cards toggled off are hidden from every tab and won't remind you.
      </div>
    </div>
  );
}

/* ————— Edit panel ————— */
function EditPanel({ T, benefit, usageMap, onSetPeriod, onSave, onUsed, onDelete }) {
  const [name, setName] = useState(benefit.name);
  const [amount, setAmount] = useState(benefit.amount);
  const [freq, setFreq] = useState(benefit.freq);
  const [notes, setNotes] = useState(benefit.notes || "");
  const [used, setPartial] = useState(benefit.used);
  const now = new Date();
  const curKey = periodKey(freq, now);
  const lbl = { fontSize: 10, letterSpacing: 1.5, color: T.sub, display: "block", marginBottom: 4 };
  const inp = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.surfaceAlt, color: T.text };
  return (
    <div style={{ borderTop: `1px solid ${T.border}`, padding: "14px", background: T.panel, display: "grid", gap: 10 }}>
      {amount > 0 && freq !== "multiyear" && (
        <div>
          <label className="rt-mono" style={lbl}>{now.getFullYear()} LOG — TAP EACH PERIOD YOU USED THIS CREDIT</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {periodsOfYear(freq, now.getFullYear()).map((p) => {
              const val = usageMap[p.key] || 0;
              const isFuture = p.end && p.end > now && p.key !== curKey;
              const full = val >= amount;
              const partial = val > 0 && !full;
              return (
                <button key={p.key} disabled={isFuture}
                  onClick={() => onSetPeriod(p.key, val > 0 ? 0 : amount)}
                  aria-pressed={full}
                  title={isFuture ? "Not started yet" : `${p.label}: ${money(val)} of ${money(amount)} used`}
                  className="rt-mono"
                  style={{
                    minWidth: 40, padding: "7px 8px", borderRadius: 8, fontSize: 10, letterSpacing: .5, fontWeight: 600,
                    border: "1px solid", cursor: isFuture ? "default" : "pointer",
                    borderColor: full ? T.green : partial ? T.amber : p.key === curKey ? T.text : T.border,
                    background: full ? T.green : partial ? T.amberBg : T.surface,
                    color: full ? (T === THEMES.dark ? "#101317" : "#fff") : isFuture ? T.borderSoft : T.text,
                  }}>
                  {p.label}{full ? " ✓" : partial ? " ½" : ""}
                </button>
              );
            })}
          </div>
          <div className="rt-mono" style={{ fontSize: 9, letterSpacing: 1, color: T.faint, marginTop: 6 }}>
            ✓ FULLY USED · ½ PARTIAL (SET EXACT $ BELOW FOR THE CURRENT PERIOD) · OUTLINED = CURRENT
          </div>
        </div>
      )}
      <div><label className="rt-mono" style={lbl}>NAME</label><input style={inp} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div><label className="rt-mono" style={lbl}>AMOUNT ($)</label><input style={inp} type="number" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></div>
        <div><label className="rt-mono" style={lbl}>RESETS</label>
          <select style={inp} value={freq} onChange={(e) => setFreq(e.target.value)}>
            {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></div>
        <div><label className="rt-mono" style={lbl}>USED THIS PERIOD ($)</label>
          <input style={inp} type="number" min="0" max={amount} value={used}
            onChange={(e) => { const v = Math.min(Number(e.target.value) || 0, amount); setPartial(v); onUsed(v); }} /></div>
      </div>
      <div><label className="rt-mono" style={lbl}>NOTES</label><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={onDelete} style={{ background: "none", border: "none", color: T.red, fontSize: 12, textDecoration: "underline" }}>Delete benefit</button>
        <button onClick={() => onSave({ name, amount, freq, notes })}
          style={{ background: T.inverseBg, color: T.inverseText, border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600 }}>Save changes</button>
      </div>
    </div>
  );
}

/* ————— Add panel ————— */
function AddPanel({ T, cards, filter, onAdd, onCancel }) {
  const [cardId, setCardId] = useState(filter || (cards[0] && cards[0].id) || "gold");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [freq, setFreq] = useState("monthly");
  const lbl = { fontSize: 10, letterSpacing: 1.5, color: T.sub, display: "block", marginBottom: 4 };
  const inp = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.surfaceAlt, color: T.text };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="rt-mono" style={lbl}>CARD</label>
          <select style={inp} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="rt-mono" style={lbl}>RESETS</label>
          <select style={inp} value={freq} onChange={(e) => setFreq(e.target.value)}>
            {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></div>
      </div>
      <div><label className="rt-mono" style={lbl}>BENEFIT NAME</label><input style={inp} value={name} placeholder="e.g. Saks credit" onChange={(e) => setName(e.target.value)} /></div>
      <div><label className="rt-mono" style={lbl}>AMOUNT ($)</label><input style={inp} type="number" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ background: "none", border: `1px solid ${T.borderSoft}`, borderRadius: 999, padding: "8px 16px", fontSize: 13, color: T.text }}>Cancel</button>
        <button disabled={!name} onClick={() => onAdd({ cardId, name, amount, freq, notes: "" })}
          style={{ background: T.inverseBg, color: T.inverseText, border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600, opacity: name ? 1 : .4 }}>Add benefit</button>
      </div>
    </div>
  );
}

/* ————— Add card panel ————— */
function AddCardPanel({ T, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [fee, setFee] = useState(0);
  const [annualMonth, setAnnualMonth] = useState(0);
  const [earn, setEarn] = useState("");
  const [finish, setFinish] = useState(FINISHES[5]);
  const lbl = { fontSize: 10, letterSpacing: 1.5, color: T.sub, display: "block", marginBottom: 4 };
  const inp = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.surfaceAlt, color: T.text };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "grid", gap: 10, marginTop: 10 }}>
      <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub }}>NEW CARD</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="rt-mono" style={lbl}>CARD NAME</label>
          <input style={inp} value={name} placeholder="e.g. Venture X" onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="rt-mono" style={lbl}>ISSUER</label>
          <input style={inp} value={issuer} placeholder="e.g. Capital One" onChange={(e) => setIssuer(e.target.value)} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="rt-mono" style={lbl}>ANNUAL FEE ($)</label>
          <input style={inp} type="number" min="0" value={fee} onChange={(e) => setFee(Number(e.target.value) || 0)} /></div>
        <div><label className="rt-mono" style={lbl}>FEE POSTS IN</label>
          <select style={inp} value={annualMonth} onChange={(e) => setAnnualMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select></div>
      </div>
      <div><label className="rt-mono" style={lbl}>TOP EARN CATEGORY (SHOWN ON THE CARD)</label>
        <input style={inp} value={earn} placeholder="e.g. 2x EVERYTHING · 10x HOTELS VIA PORTAL" onChange={(e) => setEarn(e.target.value)} /></div>
      <div>
        <label className="rt-mono" style={lbl}>FINISH</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FINISHES.map((f) => (
            <button key={f.id} onClick={() => setFinish(f)} aria-pressed={finish.id === f.id} title={f.label}
              style={{
                width: 52, height: 34, borderRadius: 6, background: f.bg, border: "none",
                boxShadow: finish.id === f.id ? `0 0 0 2.5px ${T.text}` : `0 0 0 1px ${T.border}`,
              }} />
          ))}
        </div>
      </div>
      {/* Live preview */}
      {name && (
        <div style={{ width: 196, height: 128, borderRadius: 12, background: finish.bg, color: finish.ink, padding: "13px 14px 12px", position: "relative", boxShadow: `0 6px 16px ${T.shadow}` }}>
          <div className="rt-mono" style={{ fontSize: 9, letterSpacing: 2, opacity: .75 }}>{(issuer || "ISSUER").toUpperCase()}</div>
          <div style={{ fontWeight: 700, fontSize: cardNameSize(name), marginTop: 2, lineHeight: 1.12, ...cardNameClamp }}>{name}</div>
          {earn && <div className="rt-mono" style={{ fontSize: 8, letterSpacing: .8, marginTop: 5, opacity: .85, fontWeight: 600, lineHeight: 1.4, ...cardNameClamp }}>★ {earn.toUpperCase()}</div>}
          <div className="rt-mono" style={{ position: "absolute", bottom: 12, left: 14, fontSize: 10, opacity: .75 }}>AF {"$" + fee}</div>
          <div style={{ position: "absolute", top: 13, right: 14, width: 26, height: 19, borderRadius: 4, background: "rgba(255,255,255,.35)", border: "1px solid rgba(0,0,0,.15)" }} />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ background: "none", border: `1px solid ${T.borderSoft}`, borderRadius: 999, padding: "8px 16px", fontSize: 13, color: T.text }}>Cancel</button>
        <button disabled={!name} onClick={() => onAdd({ name, issuer, fee, annualMonth, earn: (earn || "SET TOP EARN CATEGORY").toUpperCase(), bg: finish.bg, ink: finish.ink, accent: finish.accent })}
          style={{ background: T.inverseBg, color: T.inverseText, border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600, opacity: name ? 1 : .4 }}>Add card</button>
      </div>
    </div>
  );
}
