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
// The wallet starts empty on first launch — cards are added from CARD_CATALOG.
const CARDS = [];

/* ————— Catalog of add-able travel cards (grouped by issuer) —————
   Fees, earning rates, and credits reflect published terms as of mid-2026 and are
   editable/removable after adding. Renewal month defaults to January — set your real
   month under "manage cards". */
const CAT_COLORS = {
  chaseBlue:   { bg: "linear-gradient(135deg,#3A66B0 0%,#284E8E 55%,#183463 100%)", ink: "#EAF0FA", accent: "#3A66B0" },
  chaseNavy:   { bg: "linear-gradient(135deg,#1E3352 0%,#152740 55%,#0D1A2E 100%)", ink: "#D6DEEA", accent: "#29456F" },
  united:      { bg: "linear-gradient(135deg,#2A4A7F 0%,#1B3358 55%,#101F38 100%)", ink: "#E6EDF6", accent: "#3A5C93" },
  southwest:   { bg: "linear-gradient(135deg,#20336B 0%,#16244C 55%,#0D1730 100%)", ink: "#EAEFFA", accent: "#D4132A" },
  marriott:    { bg: "linear-gradient(135deg,#7A1F2B 0%,#57141D 55%,#380C12 100%)", ink: "#F3DFE2", accent: "#A32C39" },
  hyatt:       { bg: "linear-gradient(135deg,#1C6EA4 0%,#134E75 55%,#0C3149 100%)", ink: "#E5F1F9", accent: "#2A7FB5" },
  ihg:         { bg: "linear-gradient(135deg,#1C7F8C 0%,#125863 55%,#0A363D 100%)", ink: "#E2F3F5", accent: "#2A96A3" },
  aeroplan:    { bg: "linear-gradient(135deg,#B4232A 0%,#84181E 55%,#530F13 100%)", ink: "#F7E2E3", accent: "#C8323A" },
  britishair:  { bg: "linear-gradient(135deg,#1D3A6E 0%,#142A50 55%,#0C1B34 100%)", ink: "#E6ECF6", accent: "#B0122B" },
  amexPlat:    { bg: "linear-gradient(135deg,#EDEFF2 0%,#C9CDD3 50%,#A7ACB4 100%)", ink: "#2A2D33", accent: "#8A9099" },
  amexGold:    { bg: "linear-gradient(135deg,#E7D8A6 0%,#CBA85C 45%,#A6832F 100%)", ink: "#3A2E10", accent: "#A6832F" },
  amexGreen:   { bg: "linear-gradient(135deg,#0B6B4F 0%,#074C38 55%,#042E22 100%)", ink: "#DDF1E9", accent: "#12925F" },
  delta:       { bg: "linear-gradient(135deg,#123A6B 0%,#0C2749 55%,#06162E 100%)", ink: "#E5EDF7", accent: "#C8102E" },
  hilton:      { bg: "linear-gradient(135deg,#104C97 0%,#0B356B 55%,#061F42 100%)", ink: "#E4EDF8", accent: "#2E6FB8" },
  citiDark:    { bg: "linear-gradient(135deg,#33333D 0%,#22222A 55%,#141419 100%)", ink: "#E8E9EC", accent: "#5B6472" },
  citiLight:   { bg: "linear-gradient(135deg,#8794A3 0%,#5E6B7A 55%,#404A57 100%)", ink: "#141A22", accent: "#46607E" },
  aaGraphite:  { bg: "linear-gradient(135deg,#45494F 0%,#2C2F34 55%,#1B1D21 100%)", ink: "#E7E9EC", accent: "#B4232A" },
  capNavy:     { bg: "linear-gradient(135deg,#26406B 0%,#1A2F52 55%,#101F38 100%)", ink: "#EAF0F8", accent: "#C8102E" },
  capDark:     { bg: "linear-gradient(135deg,#3A3F45 0%,#26292E 55%,#16181B 100%)", ink: "#E9EAEC", accent: "#C8102E" },
  alaska:      { bg: "linear-gradient(135deg,#0E7C7B 0%,#095857 55%,#04302F 100%)", ink: "#E1F4F3", accent: "#1B4D8F" },
  jetblue:     { bg: "linear-gradient(135deg,#0037A0 0%,#00266E 55%,#00163F 100%)", ink: "#E4EBFA", accent: "#2A6FD6" },
  hawaiian:    { bg: "linear-gradient(135deg,#6A1B9A 0%,#4A116E 55%,#2C0842 100%)", ink: "#F0E2F7", accent: "#9C3FC4" },
  frontier:    { bg: "linear-gradient(135deg,#0B7A3B 0%,#075627 55%,#043418 100%)", ink: "#E1F5E8", accent: "#12A254" },
  virgin:      { bg: "linear-gradient(135deg,#C8102E 0%,#8E0A20 55%,#560613 100%)", ink: "#F8E1E4", accent: "#E4344B" },
  spirit:      { bg: "linear-gradient(135deg,#3A3A3A 0%,#242424 55%,#141414 100%)", ink: "#F4E9C6", accent: "#F1C400" },
  airfrance:   { bg: "linear-gradient(135deg,#0C1B4B 0%,#081235 55%,#040A20 100%)", ink: "#E5E9F6", accent: "#E4344B" },
};
const GE = { name: "Global Entry / TSA PreCheck credit", amount: 120, freq: "multiyear", notes: "Reimbursed once every ~4 years." };
const CARD_CATALOG = [
  { group: "Amex Membership Rewards", items: [
    { name: "Amex Gold", issuer: "American Express", fee: 325, earn: "4x DINING · 4x U.S. SUPERMARKETS",
      earnDetails: ["4x Dining worldwide", "4x U.S. supermarkets (up to $25k/yr)", "3x Flights booked direct or via Amex Travel", "1x Everything else"], ...CAT_COLORS.amexGold,
      benefits: [
        { name: "Dining credit (Grubhub, Five Guys, Cheesecake Factory, Wonder…)", amount: 10, freq: "monthly", notes: "Enrollment required." },
        { name: "Uber Cash", amount: 10, freq: "monthly", notes: "Add card to Uber wallet; expires monthly." },
        { name: "Dunkin' credit", amount: 7, freq: "monthly", notes: "U.S. Dunkin' locations. Enrollment required." },
        { name: "Resy dining credit", amount: 50, freq: "semiannual", notes: "$50 Jan–Jun and $50 Jul–Dec at U.S. Resy restaurants." },
      ] },
    { name: "Amex Platinum", issuer: "American Express", fee: 895, earn: "5x FLIGHTS (AIRLINE DIRECT / AMEX TRAVEL)",
      earnDetails: ["5x Flights booked direct or via Amex Travel (up to $500k/yr)", "5x Prepaid hotels via Amex Travel", "1x Everything else"], ...CAT_COLORS.amexPlat,
      benefits: [
        { name: "Airline incidental fee credit", amount: 200, freq: "annual", notes: "Select one airline; covers incidentals like bags & seat fees." },
        { name: "Uber Cash", amount: 15, freq: "monthly", notes: "$15/mo + $20 bonus in December." },
        { name: "Uber One membership credit", amount: 120, freq: "annual" },
        { name: "Hotel credit (FHR / Hotel Collection)", amount: 300, freq: "semiannual", notes: "Prepaid Amex Travel bookings; THC needs a 2-night min." },
        { name: "Resy dining credit", amount: 100, freq: "quarterly", notes: "U.S. Resy partner restaurants; enrollment required." },
        { name: "Digital entertainment credit", amount: 25, freq: "monthly", notes: "Eligible subscriptions (Peacock, Audible, NYT…)." },
        { name: "lululemon credit", amount: 75, freq: "quarterly", notes: "U.S. lululemon purchases; enrollment required." },
        { name: "Walmart+ membership credit", amount: 13, freq: "monthly" },
        { name: "CLEAR Plus credit", amount: 209, freq: "annual" },
        { ...GE },
      ] },
    { name: "Amex Green", issuer: "American Express", fee: 150, earn: "3x TRAVEL · TRANSIT · DINING",
      earnDetails: ["3x Travel", "3x Transit", "3x Dining worldwide", "1x Everything else"], ...CAT_COLORS.amexGreen,
      benefits: [{ name: "CLEAR Plus credit", amount: 199, freq: "annual" }] },
    { name: "Business Platinum", issuer: "American Express", fee: 895, earn: "5x FLIGHTS & PREPAID HOTELS (AMEX TRAVEL) · 1.5x LARGE PURCHASES",
      earnDetails: ["5x Flights & prepaid hotels via Amex Travel", "1.5x on purchases of $5,000+ (up to $2M/yr)", "1x Everything else"], ...CAT_COLORS.amexPlat,
      benefits: [
        { name: "Airline fee credit", amount: 200, freq: "annual" },
        { name: "Dell Technologies credit", amount: 400, freq: "semiannual", notes: "$200 Jan–Jun and Jul–Dec on U.S. Dell purchases." },
        { name: "Indeed credit", amount: 360, freq: "quarterly", notes: "$90 per quarter on Indeed." },
        { name: "Wireless credit", amount: 120, freq: "monthly", notes: "$10/mo on U.S. wireless carriers." },
        { name: "Adobe credit", amount: 150, freq: "annual" },
        { ...GE }, { name: "Centurion + Priority Pass lounge access", amount: 0, freq: "multiyear" },
      ] },
    { name: "Business Gold", issuer: "American Express", fee: 375, earn: "4x TOP 2 CATEGORIES · 1x ELSE",
      earnDetails: ["4x on your 2 top eligible categories each month (up to $150k/yr)", "1x Everything else"], ...CAT_COLORS.amexGold,
      benefits: [
        { name: "Flexible Business credit", amount: 240, freq: "monthly", notes: "$20/mo across FedEx, Grubhub & office-supply stores." },
        { name: "Walmart+ membership credit", amount: 155, freq: "monthly", notes: "$12.95/mo covers a Walmart+ plan." },
      ] },
  ] },
  { group: "Chase Ultimate Rewards", items: [
    { name: "Sapphire Reserve", issuer: "Chase", fee: 795, earn: "8x CHASE TRAVEL · 4x FLIGHTS & HOTELS · 3x DINING",
      earnDetails: ["8x Chase Travel", "4x Flights & hotels booked direct", "3x Dining", "1x Everything else"], ...CAT_COLORS.chaseBlue,
      benefits: [
        { name: "Annual travel credit", amount: 300, freq: "annual", notes: "Automatic on the first $300 of travel each year." },
        { name: "The Edit hotel credit", amount: 250, freq: "semiannual", notes: "$250 Jan–Jun and Jul–Dec on prepaid The Edit stays (2+ nights)." },
        { name: "StubHub / viagogo credit", amount: 150, freq: "semiannual", notes: "$150 Jan–Jun and Jul–Dec." },
        { name: "DoorDash credits", amount: 5, freq: "monthly", notes: "Restaurant + retail promos with activated DashPass." },
        { ...GE, name: "Global Entry / TSA PreCheck / NEXUS credit" }, { name: "Priority Pass Select lounge access", amount: 0, freq: "multiyear" },
      ] },
    { name: "Sapphire Preferred", issuer: "Chase", fee: 95, earn: "3x DINING · GAS · VACATION RENTALS",
      earnDetails: ["5x Chase Travel", "3x Dining", "3x Online groceries", "3x Select streaming", "2x All other travel", "1x Everything else"], ...CAT_COLORS.chaseBlue,
      benefits: [
        { name: "Chase Travel hotel credit", amount: 100, freq: "annual", notes: "Hotel credit via Chase Travel; resets each account anniversary — adjust timing to yours." },
        { name: "DoorDash non-restaurant promo", amount: 10, freq: "monthly", notes: "Requires activated DashPass." },
        { name: "Apple TV — 1 year free", amount: 13, freq: "monthly", notes: "Activate by the deadline." },
        { ...GE, name: "Global Entry / TSA PreCheck / NEXUS credit" },
      ] },
    { name: "Sapphire Reserve for Business", issuer: "Chase", fee: 795, earn: "8x CHASE TRAVEL · 5x LYFT · 4x SOCIAL/SEARCH ADS",
      earnDetails: ["8x Chase Travel", "5x Lyft", "4x Social media & search advertising", "3x Dining & travel", "1x Everything else"], ...CAT_COLORS.chaseBlue,
      benefits: [
        { name: "Annual travel credit", amount: 300, freq: "annual" },
        { name: "The Edit hotel credit", amount: 250, freq: "semiannual", notes: "$250 Jan–Jun and Jul–Dec on prepaid The Edit stays." },
        { ...GE, name: "Global Entry / TSA PreCheck / NEXUS credit" }, { name: "Priority Pass Select lounge access", amount: 0, freq: "multiyear" },
      ] },
    { name: "Ink Business Preferred", issuer: "Chase", fee: 95, earn: "3x TRAVEL · SHIPPING · ADS · INTERNET",
      earnDetails: ["3x Travel", "3x Shipping", "3x Internet, cable & phone", "3x Advertising (search & social)", "3x on first $150k/yr combined", "1x Everything else"], ...CAT_COLORS.chaseNavy,
      benefits: [{ name: "Cell phone protection", amount: 0, freq: "multiyear", notes: "Pay your phone bill with the card for up to $1,000/claim coverage." }] },
    { name: "Ink Business Cash", issuer: "Chase", fee: 0, earn: "5x OFFICE SUPPLY / INTERNET / PHONE · 2x GAS & DINING",
      earnDetails: ["5x Office supply, internet, cable & phone (first $25k/yr)", "2x Gas & dining (first $25k/yr)", "1x Everything else"], ...CAT_COLORS.chaseNavy, benefits: [] },
    { name: "Ink Business Unlimited", issuer: "Chase", fee: 0, earn: "1.5x EVERY PURCHASE",
      earnDetails: ["1.5x Unlimited on all purchases"], ...CAT_COLORS.chaseNavy, benefits: [] },
    { name: "Ink Business Premier", issuer: "Chase", fee: 195, earn: "2.5% ON $5K+ PURCHASES · 5x TRAVEL",
      earnDetails: ["5x Travel via Chase", "2.5% on purchases of $5,000+", "2% on everything else"], ...CAT_COLORS.chaseNavy, benefits: [] },
  ] },
  { group: "Capital One Miles", items: [
    { name: "Venture Rewards", issuer: "Capital One", fee: 95, earn: "2x ALL PURCHASES (unlimited)",
      earnDetails: ["5x Hotels & rental cars booked via Capital One Travel", "2x Miles on every other purchase"], ...CAT_COLORS.capNavy,
      benefits: [{ ...GE, notes: "Once every ~4 years. Capital One reimburses the fee." }] },
    { name: "Venture X", issuer: "Capital One", fee: 395, earn: "10x HOTELS & CARS (CAP ONE TRAVEL) · 5x FLIGHTS · 2x ELSE",
      earnDetails: ["10x Hotels & rental cars via Capital One Travel", "5x Flights & vacation rentals via Capital One Travel", "2x Everything else"], ...CAT_COLORS.capDark,
      benefits: [
        { name: "Annual travel credit (Capital One Travel)", amount: 300, freq: "annual" },
        { name: "Anniversary bonus miles", amount: 100, freq: "annual", notes: "10,000 miles (~$100) each anniversary." },
        { ...GE }, { name: "Priority Pass + Capital One Lounge access", amount: 0, freq: "multiyear" },
      ] },
    { name: "VentureOne Rewards", issuer: "Capital One", fee: 0, earn: "1.25x EVERYTHING · 5x TRAVEL (PORTAL)",
      earnDetails: ["5x Hotels & rental cars via Capital One Travel", "1.25x Miles on every purchase"], ...CAT_COLORS.capNavy, benefits: [] },
    { name: "Venture X Business", issuer: "Capital One", fee: 395, earn: "10x HOTELS & CARS (PORTAL) · 5x FLIGHTS · 2x ELSE",
      earnDetails: ["10x Hotels & rental cars via Capital One Travel", "5x Flights via Capital One Travel", "2x Everything else"], ...CAT_COLORS.capDark,
      benefits: [
        { name: "Annual travel credit (Capital One Travel)", amount: 300, freq: "annual" },
        { name: "Anniversary bonus miles", amount: 100, freq: "annual", notes: "10,000 miles (~$100) each anniversary." },
        { ...GE }, { name: "Priority Pass + Capital One Lounge access", amount: 0, freq: "multiyear" },
      ] },
    { name: "Spark Miles (Business)", issuer: "Capital One", fee: 95, earn: "2x EVERYTHING · 5x TRAVEL (PORTAL)",
      earnDetails: ["5x Hotels & rental cars via Capital One Travel", "2x Miles on every purchase"], ...CAT_COLORS.capNavy,
      benefits: [{ ...GE }] },
  ] },
  { group: "Citi ThankYou Points", items: [
    { name: "Citi Strata Elite", issuer: "Citi", fee: 595, earn: "12x CITI TRAVEL HOTELS/CARS · 6x RESTAURANTS (weekends) · 1.5x ELSE",
      earnDetails: ["12x Hotels, car rentals & attractions via Citi Travel", "6x Restaurants (Fri–Sun)", "3x Restaurants (other days)", "1.5x Everything else"], ...CAT_COLORS.citiDark,
      benefits: [
        { name: "Annual hotel benefit (Citi Travel)", amount: 300, freq: "annual", notes: "$300 off a single hotel stay booked via Citi Travel." },
        { name: "Splurge credit", amount: 200, freq: "annual", notes: "$200 across select partners (American Airlines, Live Nation, 1stDibs…)." },
        { ...GE }, { name: "Lounge access (Admirals Club day passes + Priority Pass)", amount: 0, freq: "multiyear" },
      ] },
    { name: "Citi Strata Premier", issuer: "Citi", fee: 95, earn: "10x CITI TRAVEL · 3x AIR / DINING / GROCERY / GAS / EV",
      earnDetails: ["10x Hotels, car rentals & attractions via Citi Travel", "3x Air travel, dining, supermarkets, gas & EV charging", "1x Everything else"], ...CAT_COLORS.citiLight,
      benefits: [{ name: "Annual hotel credit", amount: 100, freq: "annual", notes: "$100 off a single $500+ hotel stay via Citi Travel." }] },
  ] },
  { group: "American Airlines AAdvantage", items: [
    { name: "AAdvantage Executive World Elite", issuer: "Citi / American Airlines", fee: 595, earn: "4x AMERICAN AIRLINES PURCHASES",
      earnDetails: ["4x American Airlines purchases", "1x Everything else"], ...CAT_COLORS.aaGraphite,
      benefits: [
        { name: "Admirals Club membership", amount: 0, freq: "multiyear", notes: "Full membership + 2 guests." },
        { name: "Avis / Budget rental credit", amount: 120, freq: "annual", notes: "On eligible prepaid rentals." },
        { name: "Lyft credit", amount: 10, freq: "monthly", notes: "$10 back after 3 eligible rides each month." },
        { name: "Grubhub credit", amount: 10, freq: "monthly" },
        { ...GE },
      ] },
    { name: "AAdvantage Platinum Select World Elite", issuer: "Citi / American Airlines", fee: 99, earn: "2x AMERICAN AIRLINES · RESTAURANTS · GAS",
      earnDetails: ["2x American Airlines purchases", "2x Restaurants", "2x Gas stations", "1x Everything else"], ...CAT_COLORS.citiLight,
      benefits: [
        { name: "Free checked bag (+ up to 4 guests)", amount: 0, freq: "multiyear", notes: "Domestic AA flights." },
        { name: "$125 AA flight discount", amount: 125, freq: "annual", notes: "Earned after $20k spend during the membership year." },
      ] },
    { name: "Citi AAdvantage MileUp", issuer: "Citi / American Airlines", fee: 0, earn: "2x AA · GROCERY",
      earnDetails: ["2x American Airlines purchases", "2x U.S. supermarkets", "1x Everything else"], ...CAT_COLORS.citiLight, benefits: [] },
    { name: "Citi / AAdvantage Business", issuer: "Citi / American Airlines", fee: 99, earn: "2x AA · TELECOM / CAR RENTAL / GAS",
      earnDetails: ["2x American Airlines purchases", "2x Telecom, cable, car rental & gas", "1x Everything else"], ...CAT_COLORS.aaGraphite,
      benefits: [
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
        { name: "Companion certificate after $30k spend", amount: 0, freq: "annual" },
      ] },
    { name: "AAdvantage Aviator Red", issuer: "Barclays / American Airlines", fee: 99, earn: "2x AMERICAN AIRLINES",
      earnDetails: ["2x American Airlines purchases", "1x Everything else"], ...CAT_COLORS.aaGraphite,
      benefits: [
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
        { name: "Companion certificate after spend", amount: 0, freq: "annual" },
      ] },
  ] },
  { group: "Delta SkyMiles", items: [
    { name: "Delta SkyMiles Gold", issuer: "Amex / Delta", fee: 150, earn: "2x DELTA · DINING · GROCERY",
      earnDetails: ["2x Delta purchases", "2x Dining worldwide", "2x U.S. supermarkets", "1x Everything else"], ...CAT_COLORS.delta,
      benefits: [
        { name: "Delta flight credit", amount: 200, freq: "annual", notes: "$200 Delta credit after $10k annual spend." },
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
      ] },
    { name: "Delta SkyMiles Platinum", issuer: "Amex / Delta", fee: 350, earn: "3x DELTA & HOTELS · 2x DINING / GROCERY",
      earnDetails: ["3x Delta purchases", "3x Hotels", "2x Dining & U.S. supermarkets", "1x Everything else"], ...CAT_COLORS.delta,
      benefits: [
        { name: "Annual companion certificate (Main Cabin)", amount: 0, freq: "annual" },
        { name: "Delta Stays credit", amount: 150, freq: "annual" },
        { name: "Rideshare credit", amount: 120, freq: "monthly", notes: "$10/mo on U.S. rideshare." },
        { name: "Resy dining credit", amount: 120, freq: "monthly", notes: "$10/mo at U.S. Resy restaurants." },
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
      ] },
    { name: "Delta SkyMiles Reserve", issuer: "Amex / Delta", fee: 650, earn: "3x DELTA · 1x ELSE",
      earnDetails: ["3x Delta purchases", "1x Everything else"], ...CAT_COLORS.delta,
      benefits: [
        { name: "Delta Sky Club access", amount: 0, freq: "multiyear" },
        { name: "Annual companion certificate (First/Comfort+/Main)", amount: 0, freq: "annual" },
        { name: "Resy dining credit", amount: 240, freq: "monthly", notes: "$20/mo at U.S. Resy restaurants." },
        { name: "Delta Stays credit", amount: 200, freq: "annual" },
        { name: "Rideshare credit", amount: 120, freq: "monthly" },
      ] },
    { name: "Delta SkyMiles Blue", issuer: "Amex / Delta", fee: 0, earn: "2x DELTA · DINING",
      earnDetails: ["2x Delta purchases", "2x Dining worldwide", "1x Everything else"], ...CAT_COLORS.delta, benefits: [] },
    { name: "Delta SkyMiles Reserve Business", issuer: "Amex / Delta", fee: 650, earn: "3x DELTA · 1x ELSE",
      earnDetails: ["3x Delta purchases", "1x Everything else"], ...CAT_COLORS.delta,
      benefits: [
        { name: "Delta Sky Club access", amount: 0, freq: "multiyear" },
        { name: "Annual companion certificate", amount: 0, freq: "annual" },
        { name: "Delta Stays credit", amount: 200, freq: "annual" },
      ] },
    { name: "Delta SkyMiles Gold Business", issuer: "Amex / Delta", fee: 150, earn: "2x DELTA · U.S. SHIPPING / ADS / DINING",
      earnDetails: ["2x Delta purchases", "2x U.S. shipping, advertising & dining", "1x Everything else"], ...CAT_COLORS.delta,
      benefits: [
        { name: "Delta flight credit", amount: 200, freq: "annual", notes: "After $10k annual spend." },
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
      ] },
  ] },
  { group: "United MileagePlus", items: [
    { name: "United Explorer", issuer: "Chase / United", fee: 150, earn: "2x UNITED · DINING · HOTELS",
      earnDetails: ["2x United purchases", "2x Dining", "2x Hotel stays", "1x Everything else"], ...CAT_COLORS.united,
      benefits: [
        { name: "First checked bag free (you + companion)", amount: 0, freq: "multiyear" },
        { name: "United Club one-time passes (2/yr)", amount: 0, freq: "annual" },
        { ...GE },
      ] },
    { name: "United Quest", issuer: "Chase / United", fee: 350, earn: "3x UNITED · 2x TRAVEL & DINING",
      earnDetails: ["3x United purchases", "2x Other travel", "2x Dining & streaming", "1x Everything else"], ...CAT_COLORS.united,
      benefits: [
        { name: "United travel credit", amount: 200, freq: "annual", notes: "Rideshare + United credits per current terms." },
        { name: "First & second checked bags free", amount: 0, freq: "multiyear" },
        { ...GE },
      ] },
    { name: "United Club Infinite", issuer: "Chase / United", fee: 525, earn: "4x UNITED · 2x TRAVEL & DINING",
      earnDetails: ["4x United purchases", "2x Other travel", "2x Dining", "1x Everything else"], ...CAT_COLORS.united,
      benefits: [
        { name: "United Club membership", amount: 0, freq: "multiyear" },
        { name: "Two checked bags free", amount: 0, freq: "multiyear" },
        { ...GE },
      ] },
    { name: "United Gateway", issuer: "Chase / United", fee: 0, earn: "2x UNITED · GAS · TRANSIT",
      earnDetails: ["2x United purchases", "2x Gas stations", "2x Local transit", "1x Everything else"], ...CAT_COLORS.united, benefits: [] },
    { name: "United Business", issuer: "Chase / United", fee: 99, earn: "2x UNITED · DINING / GAS / OFFICE / TRANSIT",
      earnDetails: ["2x United purchases", "2x Dining, gas, office supply & transit", "1x Everything else"], ...CAT_COLORS.united,
      benefits: [{ name: "First checked bag free", amount: 0, freq: "multiyear" }] },
  ] },
  { group: "Southwest Rapid Rewards", items: [
    { name: "Southwest Rapid Rewards Priority", issuer: "Chase / Southwest", fee: 149, earn: "3x SOUTHWEST · 2x TRANSIT & DINING",
      earnDetails: ["3x Southwest purchases", "2x Local transit, rideshare & dining", "1x Everything else"], ...CAT_COLORS.southwest,
      benefits: [
        { name: "Annual Southwest travel credit", amount: 75, freq: "annual" },
        { name: "Upgraded boardings (4/yr)", amount: 0, freq: "annual" },
        { name: "Anniversary points (7,500)", amount: 0, freq: "annual" },
      ] },
    { name: "Southwest Rapid Rewards Premier", issuer: "Chase / Southwest", fee: 99, earn: "3x SOUTHWEST · 2x TRANSIT & DINING",
      earnDetails: ["3x Southwest purchases", "2x Transit, rideshare & dining", "1x Everything else"], ...CAT_COLORS.southwest,
      benefits: [{ name: "Anniversary points (6,000)", amount: 0, freq: "annual" }] },
    { name: "Southwest Rapid Rewards Plus", issuer: "Chase / Southwest", fee: 69, earn: "2x SOUTHWEST · 2x TRANSIT & DINING",
      earnDetails: ["2x Southwest purchases", "2x Transit, rideshare & dining", "1x Everything else"], ...CAT_COLORS.southwest,
      benefits: [{ name: "Anniversary points (3,000)", amount: 0, freq: "annual" }] },
    { name: "Southwest Business Premier", issuer: "Chase / Southwest", fee: 99, earn: "3x SOUTHWEST · 2x TRANSIT & DINING",
      earnDetails: ["3x Southwest purchases", "2x Transit, rideshare & dining", "1x Everything else"], ...CAT_COLORS.southwest,
      benefits: [{ name: "Anniversary points (6,000)", amount: 0, freq: "annual" }] },
    { name: "Southwest Business Performance", issuer: "Chase / Southwest", fee: 199, earn: "4x SOUTHWEST · 3x RIDESHARE · 2x ADS/INTERNET/PHONE",
      earnDetails: ["4x Southwest purchases", "3x Rideshare", "2x Social media ads, internet, cable & phone", "1x Everything else"], ...CAT_COLORS.southwest,
      benefits: [
        { name: "Upgraded boardings (4/yr)", amount: 0, freq: "annual" },
        { name: "Inflight Wi-Fi credits (365/yr)", amount: 0, freq: "annual" },
        { name: "Anniversary points (9,000)", amount: 0, freq: "annual" },
      ] },
  ] },
  { group: "Alaska Mileage Plan", items: [
    { name: "Alaska Airlines Visa", issuer: "Bank of America / Alaska", fee: 95, earn: "3x ALASKA · 2x GAS / GROCERY / DINING",
      earnDetails: ["3x Alaska purchases", "2x Gas, EV charging, groceries & dining", "1x Everything else"], ...CAT_COLORS.alaska,
      benefits: [
        { name: "Annual Companion Fare ($99 + taxes)", amount: 0, freq: "annual" },
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
      ] },
  ] },
  { group: "JetBlue TrueBlue", items: [
    { name: "JetBlue Plus", issuer: "Barclays / JetBlue", fee: 99, earn: "6x JETBLUE · 2x DINING & GROCERY",
      earnDetails: ["6x JetBlue purchases", "2x Dining & groceries", "1x Everything else"], ...CAT_COLORS.jetblue,
      benefits: [
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
        { name: "Anniversary points (5,000)", amount: 0, freq: "annual" },
      ] },
  ] },
  { group: "Air Canada Aeroplan", items: [
    { name: "Aeroplan", issuer: "Chase / Air Canada", fee: 95, earn: "3x AIR CANADA · 3x DINING & GROCERY",
      earnDetails: ["3x Air Canada / Aeroplan", "3x Dining & groceries", "1x Everything else"], ...CAT_COLORS.aeroplan,
      benefits: [
        { name: "First checked bag free (Air Canada)", amount: 0, freq: "multiyear" },
        { ...GE },
      ] },
  ] },
  { group: "British Airways Avios", items: [
    { name: "British Airways Visa Signature", issuer: "Chase / British Airways", fee: 95, earn: "3x BRITISH AIRWAYS · 2x TRAVEL",
      earnDetails: ["3x British Airways / Aer Lingus / Iberia", "2x Hotel & other travel", "1x Everything else"], ...CAT_COLORS.britishair,
      benefits: [{ name: "Travel Together companion ticket after spend", amount: 0, freq: "annual" }] },
  ] },
  { group: "Other airline miles", items: [
    { name: "Hawaiian Airlines World Elite", issuer: "Barclays / Hawaiian", fee: 99, earn: "3x HAWAIIAN · 2x DINING / GAS / GROCERY",
      earnDetails: ["3x Hawaiian Airlines purchases", "2x Dining, gas & groceries", "1x Everything else"], ...CAT_COLORS.hawaiian,
      benefits: [
        { name: "First checked bag free", amount: 0, freq: "multiyear" },
        { name: "Annual companion discount", amount: 0, freq: "annual" },
      ] },
    { name: "Frontier Airlines World Mastercard", issuer: "Barclays / Frontier", fee: 89, earn: "5x FRONTIER · 3x RESTAURANTS",
      earnDetails: ["5x Frontier purchases", "3x Restaurants", "2x Groceries", "1x Everything else"], ...CAT_COLORS.frontier, benefits: [] },
    { name: "Virgin Atlantic World Elite", issuer: "Synchrony / Virgin Atlantic", fee: 99, earn: "3x VIRGIN ATLANTIC",
      earnDetails: ["3x Virgin Atlantic purchases", "1.5x Everything else"], ...CAT_COLORS.virgin,
      benefits: [{ name: "Companion / upgrade voucher after spend", amount: 0, freq: "annual" }] },
    { name: "Air France KLM World Elite", issuer: "Bank of America / Air France KLM", fee: 89, earn: "3x AIR FRANCE KLM · 2x GROCERY / GAS / DINING",
      earnDetails: ["3x Air France & KLM purchases", "2x Groceries, gas & dining", "1x Everything else"], ...CAT_COLORS.airfrance,
      benefits: [{ name: "Anniversary companion / miles bonus", amount: 0, freq: "annual" }] },
    { name: "Free Spirit Travel More", issuer: "Bank of America / Spirit", fee: 79, earn: "3x SPIRIT · 2x DINING",
      earnDetails: ["3x Spirit purchases", "2x Dining", "1x Everything else"], ...CAT_COLORS.spirit,
      benefits: [{ name: "Anniversary points (5,000)", amount: 0, freq: "annual" }] },
  ] },
  { group: "Marriott Bonvoy", items: [
    { name: "Marriott Bonvoy Boundless", issuer: "Chase / Marriott", fee: 95, earn: "6x MARRIOTT · 3x GROCERY / GAS / DINING",
      earnDetails: ["6x Marriott stays", "3x Grocery, gas & dining (on first $6k/yr)", "2x Everything else"], ...CAT_COLORS.marriott,
      benefits: [
        { name: "Anniversary free night (35k)", amount: 0, freq: "annual" },
        { name: "Silver Elite status", amount: 0, freq: "multiyear" },
      ] },
    { name: "Marriott Bonvoy Brilliant", issuer: "Amex / Marriott", fee: 650, earn: "6x MARRIOTT · 3x DINING & FLIGHTS",
      earnDetails: ["6x Marriott stays", "3x Dining worldwide & flights booked direct", "2x Everything else"], ...CAT_COLORS.marriott,
      benefits: [
        { name: "Dining credit", amount: 300, freq: "monthly", notes: "$25/mo at restaurants worldwide." },
        { name: "Annual free night (85k)", amount: 0, freq: "annual" },
        { name: "Platinum Elite status", amount: 0, freq: "multiyear" },
        { ...GE },
      ] },
    { name: "Marriott Bonvoy Bevy", issuer: "Amex / Marriott", fee: 250, earn: "6x MARRIOTT · 4x DINING & GROCERY",
      earnDetails: ["6x Marriott stays", "4x Dining & U.S. supermarkets", "2x Everything else"], ...CAT_COLORS.marriott,
      benefits: [{ name: "Gold Elite status", amount: 0, freq: "multiyear" }] },
    { name: "Marriott Bonvoy Business", issuer: "Amex / Marriott", fee: 125, earn: "6x MARRIOTT · 4x GAS / DINING / SHIPPING / WIRELESS",
      earnDetails: ["6x Marriott stays", "4x Gas, dining, shipping & wireless", "2x Everything else"], ...CAT_COLORS.marriott,
      benefits: [
        { name: "Annual free night (35k)", amount: 0, freq: "annual" },
        { name: "Gold Elite status", amount: 0, freq: "multiyear" },
      ] },
  ] },
  { group: "World of Hyatt", items: [
    { name: "World of Hyatt", issuer: "Chase / Hyatt", fee: 95, earn: "4x HYATT · 2x DINING / FLIGHTS / TRANSIT / FITNESS",
      earnDetails: ["4x Hyatt stays", "2x Dining, flights, transit & fitness", "1x Everything else"], ...CAT_COLORS.hyatt,
      benefits: [
        { name: "Anniversary free night (Cat 1–4)", amount: 0, freq: "annual" },
        { name: "Discoverist status", amount: 0, freq: "multiyear" },
      ] },
    { name: "World of Hyatt Business", issuer: "Chase / Hyatt", fee: 199, earn: "4x HYATT · 2x TOP 3 SPEND CATEGORIES",
      earnDetails: ["4x Hyatt stays", "2x on your top 3 eligible spend categories", "1x Everything else"], ...CAT_COLORS.hyatt,
      benefits: [
        { name: "Hyatt statement credits", amount: 100, freq: "semiannual", notes: "$50 twice a year on Hyatt spend." },
        { name: "Discoverist status", amount: 0, freq: "multiyear" },
      ] },
  ] },
  { group: "Hilton Honors", items: [
    { name: "Hilton Honors", issuer: "Amex / Hilton", fee: 0, earn: "7x HILTON · 5x DINING / GROCERY / GAS",
      earnDetails: ["7x Hilton stays", "5x U.S. dining, supermarkets & gas", "3x Everything else"], ...CAT_COLORS.hilton, benefits: [] },
    { name: "Hilton Honors Surpass", issuer: "Amex / Hilton", fee: 150, earn: "12x HILTON · 6x DINING / GROCERY / GAS",
      earnDetails: ["12x Hilton stays", "6x U.S. dining, supermarkets & gas", "4x U.S. online retail", "3x Everything else"], ...CAT_COLORS.hilton,
      benefits: [
        { name: "Hilton credit", amount: 200, freq: "quarterly", notes: "$50 per quarter on Hilton purchases." },
        { name: "Gold status", amount: 0, freq: "multiyear" },
      ] },
    { name: "Hilton Honors Aspire", issuer: "Amex / Hilton", fee: 550, earn: "14x HILTON · 7x FLIGHTS / CAR RENTAL / DINING",
      earnDetails: ["14x Hilton stays", "7x Flights, car rentals & U.S. dining", "3x Everything else"], ...CAT_COLORS.hilton,
      benefits: [
        { name: "Hilton resort credit", amount: 400, freq: "semiannual", notes: "$200 Jan–Jun and Jul–Dec at Hilton resorts." },
        { name: "Airline flight credit", amount: 200, freq: "quarterly", notes: "$50 per quarter on flights." },
        { name: "CLEAR Plus credit", amount: 199, freq: "annual" },
        { name: "Annual free night reward", amount: 0, freq: "annual" },
        { name: "Diamond status", amount: 0, freq: "multiyear" },
      ] },
    { name: "Hilton Honors Business", issuer: "Amex / Hilton", fee: 195, earn: "12x HILTON · 5x TRAVEL / GAS / DINING / SHIPPING / PHONE",
      earnDetails: ["12x Hilton stays", "5x Travel, gas, dining, shipping, wireless & U.S. business categories", "3x Everything else"], ...CAT_COLORS.hilton,
      benefits: [
        { name: "Hilton credit", amount: 240, freq: "quarterly", notes: "$60 per quarter on Hilton purchases." },
        { name: "Gold status", amount: 0, freq: "multiyear" },
      ] },
  ] },
  { group: "IHG One Rewards", items: [
    { name: "IHG One Rewards Premier", issuer: "Chase / IHG", fee: 99, earn: "10x IHG · 5x TRAVEL / DINING / GAS",
      earnDetails: ["10x IHG stays", "5x Travel, dining & gas", "3x Everything else"], ...CAT_COLORS.ihg,
      benefits: [
        { name: "Anniversary free night (40k)", amount: 0, freq: "annual" },
        { name: "Platinum Elite status", amount: 0, freq: "multiyear" },
        { ...GE },
      ] },
  ] },
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

const DEFAULT_BENEFITS = [];

const DEFAULT_POINTS = [];

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

/* ————— "Which card should I use?" — best card per spend category ————— */
const SPEND_CATS = [
  { key: "dining", label: "Restaurants" },
  { key: "groceries", label: "Groceries" },
  { key: "gas", label: "Gas" },
  { key: "flights", label: "Flights" },
  { key: "hotels", label: "Hotels" },
  { key: "travel", label: "Other travel" },
  { key: "transit", label: "Transit" },
  { key: "streaming", label: "Streaming" },
  { key: "online", label: "Online shopping" },
  { key: "everything", label: "Everything else" },
];
// Baseline cents-per-point by rewards program (keys match CARD_CATALOG group names),
// so a 4x Amex point can be compared fairly against a 2x airline mile.
const REWARDS_CPP = {
  "Amex Membership Rewards": 2.0, "Chase Ultimate Rewards": 2.05, "Capital One Miles": 1.85,
  "Citi ThankYou Points": 1.8, "American Airlines AAdvantage": 1.5, "Delta SkyMiles": 1.2,
  "United MileagePlus": 1.35, "Southwest Rapid Rewards": 1.35, "Alaska Mileage Plan": 1.45,
  "JetBlue TrueBlue": 1.3, "Air Canada Aeroplan": 1.5, "British Airways Avios": 1.3,
  "Other airline miles": 1.2, "Marriott Bonvoy": 0.8, "World of Hyatt": 1.7,
  "Hilton Honors": 0.5, "IHG One Rewards": 0.5,
};
const DEFAULT_CPP = 1.4;
// Parse a card's earning categories into a { category: multiplier } map from its earnDetails.
function cardRates(card) {
  const src = (card.earnDetails && card.earnDetails.length) ? card.earnDetails : (card.earn ? card.earn.split("·") : []);
  const rates = {}; let base = 1;
  for (const raw of src) {
    const s = String(raw).toLowerCase();
    const m = s.match(/(\d+(?:\.\d+)?)\s*x/);
    if (!m) continue;
    const rate = parseFloat(m[1]);
    if (/everything else|all other purchase|every other purchase|all purchases|every purchase|unlimited/.test(s)) base = Math.max(base, rate);
    const add = (c) => { rates[c] = Math.max(rates[c] || 0, rate); };
    if (/dining|restaurant/.test(s)) add("dining");
    if (/supermarket|grocer/.test(s)) add("groceries");
    if (/\bgas\b|ev charging/.test(s)) add("gas");
    if (/flight|airfare|air travel|airline|united|delta|american airlines|southwest|jetblue|alaska|hawaiian|frontier|virgin atlantic|air france|air canada|british airways|spirit/.test(s)) add("flights");
    if (/hotel|stay|resort|rental car|car rental|marriott|hilton|hyatt|\bihg\b/.test(s)) add("hotels");
    if (/travel/.test(s)) add("travel");
    if (/transit|rideshare|lyft/.test(s)) add("transit");
    if (/stream/.test(s)) add("streaming");
    if (/online retail|online shop|online groc/.test(s)) add("online");
  }
  rates.everything = base;
  return rates;
}
function rateFor(card, cat) {
  const r = cardRates(card);
  if (cat === "everything") return r.everything || 1;
  if (r[cat] != null) return r[cat];
  if ((cat === "flights" || cat === "hotels" || cat === "transit") && r.travel != null) return r.travel;
  return r.everything || 1;
}
// Effective value per $1 spent (in cents): earn multiplier × the program's cents-per-point.
function cardValue(card, cat) {
  return rateFor(card, cat) * (REWARDS_CPP[card.rewards] ?? DEFAULT_CPP);
}

/* ————— Add-to-calendar (Google Calendar link + .ics — no account connection) ————— */
function ymd(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
// Builds a Google Calendar "add event" link and an .ics data URI for an all-day
// reminder on `date`, with a 30-day-ahead alarm baked into the .ics.
function calendarLinks(title, details, date) {
  if (!date) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const s = ymd(start), e = ymd(end);
  const clean = (x) => String(x || "").replace(/[\r\n]+/g, " ");
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(clean(title))}&dates=${s}/${e}&details=${encodeURIComponent(clean(details))}`;
  const now = new Date();
  const stamp = `${ymd(now)}T090000Z`;
  const uid = `nexus-${s}-${Math.abs(String(title).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))}@nexusrewards`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nexus//Rewards//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${s}`, `DTEND;VALUE=DATE:${e}`,
    `SUMMARY:${clean(title)}`, `DESCRIPTION:${clean(details)}`,
    "BEGIN:VALARM", "TRIGGER:-P30D", "ACTION:DISPLAY", `DESCRIPTION:${clean(title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return { google, icsUri: "data:text/calendar;charset=utf-8," + encodeURIComponent(ics) };
}

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
  // Auto-charge bookkeeping: { [benefitId]: last period key we auto-checked }
  const [autoStamp, setAutoStamp] = useState({});
  const [editingPoint, setEditingPoint] = useState(null);
  const [showP2, setShowP2] = useState(true);
  const [detailCard, setDetailCard] = useState(null); // card id whose full details are open
  const [bestOpen, setBestOpen] = useState(false); // "which card should I use?" panel
  const [mode, setMode] = useState("light");
  const saveTimer = useRef(null);
  const T = THEMES[mode];

  // Merge base cards with the user's per-card settings (enabled / fee / month).
  const applySettings = (c) => {
    const s = cardSettings[c.id] || {};
    const p2 = s.p2 !== undefined ? s.p2 : (c.p2 || false);
    const nickname = s.nickname !== undefined ? s.nickname : (c.nickname || "");
    return {
      ...c,
      enabled: s.enabled !== undefined ? s.enabled : true,
      fee: s.fee !== undefined ? s.fee : c.fee,
      annualMonth: s.annualMonth !== undefined ? s.annualMonth : c.annualMonth,
      p2, nickname,
      displayName: nickname || c.name,
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
          if (data.autoStamp) setAutoStamp(data.autoStamp);
          if (typeof data.showP2 === "boolean") setShowP2(data.showP2);
          if (Array.isArray(data.points) && data.points.length) setPoints(data.points);
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
        await window.storage.set(STORAGE_KEY, JSON.stringify({ benefits, usage, points, theme: mode, customCards, cardSettings, autoStamp, showP2 }));
      } catch (e) { console.error("Save failed", e); }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [benefits, usage, points, mode, customCards, cardSettings, autoStamp, showP2, loaded]);

  // Auto-charge: for benefits marked auto, tick off the current period once, at
  // the start of each new period. The user can still manually untick it afterward
  // (we only auto-apply once per period, tracked by autoStamp), and turning auto
  // off stops future auto-ticks.
  useEffect(() => {
    if (!loaded) return;
    const pending = benefits.filter(
      (b) => b.auto && b.freq !== "multiyear" && b.amount > 0 && autoStamp[b.id] !== periodKey(b.freq, now)
    );
    if (!pending.length) return;
    setUsage((u) => {
      const n = { ...u };
      pending.forEach((b) => { const k = periodKey(b.freq, now); n[b.id] = { ...(n[b.id] || {}), [k]: b.amount }; });
      return n;
    });
    setAutoStamp((s) => {
      const n = { ...s };
      pending.forEach((b) => { n[b.id] = periodKey(b.freq, now); });
      return n;
    });
  }, [loaded, benefits, autoStamp]);

  // Keep real iOS reminders in sync whenever cards / fees / months change.
  useEffect(() => {
    if (!loaded) return;
    syncFeeNotifications(allCards);
  }, [allCards, loaded]);

  const now = new Date();

  const rows = useMemo(() => {
    return benefits
      // Only credits with a dollar value are checkable here; non-monetary perks
      // (points multipliers, lounge access, etc.) live on the card details view.
      .filter((b) => activeIds.has(b.cardId) && b.amount > 0 && (!filter || b.cardId === filter))
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

  // To-do by time: only credits NOT yet fully used this period, grouped by how
  // often they reset (soonest to lapse first). Checking one off drops it here.
  const TODO_ORDER = ["monthly", "quarterly", "semiannual", "annual"];
  const TODO_LABELS = { monthly: "This month", quarterly: "This quarter", semiannual: "This half-year", annual: "This year" };
  const todo = useMemo(() => {
    const buckets = { monthly: [], quarterly: [], semiannual: [], annual: [] };
    benefits.forEach((b) => {
      if (!activeIds.has(b.cardId) || b.amount <= 0 || b.freq === "multiyear") return;
      const key = periodKey(b.freq, now);
      const used = usage[b.id]?.[key] || 0;
      const remaining = Math.max(0, b.amount - used);
      if (remaining <= 0) return; // already checked off → not a to-do
      const end = periodEnd(b.freq, now);
      if (buckets[b.freq]) buckets[b.freq].push({ ...b, key, remaining, end, dLeft: daysLeft(end) });
    });
    TODO_ORDER.forEach((f) => buckets[f].sort((a, z) => (a.dLeft - z.dLeft) || (z.remaining - a.remaining)));
    return buckets;
  }, [benefits, usage, activeIds]);
  const todoCount = TODO_ORDER.reduce((s, f) => s + todo[f].length, 0);
  const todoTotal = TODO_ORDER.reduce((s, f) => s + todo[f].reduce((t, i) => t + i.remaining, 0), 0);

  const atStake = useMemo(() =>
    benefits.reduce((sum, b) => {
      if (b.freq === "multiyear" || !activeIds.has(b.cardId)) return sum;
      const used = usage[b.id]?.[periodKey(b.freq, now)] || 0;
      return sum + Math.max(0, b.amount - used);
    }, 0), [benefits, usage, activeIds]);

  const setUsed = (b, amt) =>
    setUsage((u) => ({ ...u, [b.id]: { ...(u[b.id] || {}), [b.key]: amt } }));

  // Turn auto-charge on/off for a benefit. Turning it on immediately checks off
  // the current period; turning it off just stops future auto-ticks.
  const setAuto = (b, value) => {
    setBenefits((bs) => bs.map((x) => x.id === b.id ? { ...x, auto: value } : x));
    if (value && b.freq !== "multiyear" && b.amount > 0) {
      const k = periodKey(b.freq, now);
      setUsage((u) => ({ ...u, [b.id]: { ...(u[b.id] || {}), [k]: b.amount } }));
      setAutoStamp((s) => ({ ...s, [b.id]: k }));
    }
  };

  const cardOf = (id) => allCards.find((c) => c.id === id) ||
    { id, name: "Card", issuer: "", fee: 0, earn: "", accent: T.borderSoft, bg: T.surfaceAlt, ink: T.text };

  // Points & miles editing
  const updatePoint = (id, patch) => setPoints((ps) => ps.map((p) => p.id === id ? { ...p, ...patch } : p));
  const addPoint = () => {
    const id = "pt" + Date.now();
    setPoints((ps) => [...ps, { id, name: "New program", cards: "", balance: 0, cpp: 1.0, p2: false }]);
    setEditingPoint(id);
  };
  const removePoint = (id) => setPoints((ps) => ps.filter((p) => p.id !== id));
  const lblP = { fontSize: 10, letterSpacing: 1.5, color: T.sub, display: "block", marginBottom: 4 };
  const inpP = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.surfaceAlt, color: T.text };
  const visiblePoints = points.filter((p) => showP2 || !p.p2);

  const updateCardSetting = (id, patch) =>
    setCardSettings((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }));

  const removeCard = (id) => {
    setCustomCards((cs) => cs.filter((c) => c.id !== id));
    setBenefits((bs) => bs.filter((b) => b.cardId !== id));
    setCardSettings((s) => { const n = { ...s }; delete n[id]; return n; });
    setFilter(null);
  };

  // Add a card from the catalog, bringing its benefits along.
  const addCatalogCard = (tpl, rewards, p2) => {
    const id = "card" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
    const { benefits: tplBenefits, ...cardFields } = tpl;
    setCustomCards((cs) => [...cs, { ...cardFields, id, annualMonth: tpl.annualMonth ?? 0, rewards: rewards || "", p2: !!p2 }]);
    if (tplBenefits && tplBenefits.length) {
      setBenefits((bs) => [...bs, ...tplBenefits.map((b, i) => ({ ...b, id: id + "-b" + i, cardId: id, notes: b.notes || "" }))]);
    }
    // keep the picker open so several cards (e.g. all of P2's) can be added in a row
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
              <button key={c.id} onClick={() => { setFilter(active ? null : c.id); setDetailCard(null); }} aria-pressed={active}
                style={{
                  flex: "0 0 auto", width: 196, height: 128, borderRadius: 12, border: "none",
                  background: c.bg, color: c.ink, textAlign: "left", padding: "13px 14px 12px",
                  position: "relative", boxShadow: active ? `0 0 0 3px ${T.text}, 0 8px 20px ${T.shadow}` : `0 6px 16px ${T.shadow}`,
                  transform: active ? "translateY(-3px)" : "none", transition: "all .2s ease",
                }}>
                <div className="rt-mono" style={{ fontSize: 9, letterSpacing: 2, opacity: .75 }}>{c.issuer.toUpperCase()}</div>
                <div style={{ fontWeight: 700, fontSize: cardNameSize(c.displayName), marginTop: 2, lineHeight: 1.12, ...cardNameClamp }}>{c.displayName}</div>
                <div className="rt-mono" style={{ fontSize: 8, letterSpacing: .8, marginTop: 5, opacity: .85, fontWeight: 600, lineHeight: 1.4, ...cardNameClamp }}>
                  ★ {c.earn}
                </div>
                <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="rt-mono" style={{ fontSize: 10, opacity: .75 }}>AF {money(c.fee)}</span>
                  <span className="rt-mono" style={{ fontSize: 12, fontWeight: 600 }}>{money(cardStake)} left</span>
                </div>
                {c.p2 && <span className="rt-mono" style={{ position: "absolute", top: 12, right: 46, fontSize: 8, letterSpacing: 1, fontWeight: 700, background: "rgba(0,0,0,.28)", color: "#fff", borderRadius: 4, padding: "2px 5px" }}>P2</span>}
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
          {activeCards.length > 0 && (
            <button onClick={() => { setBestOpen((v) => !v); setManagingCards(false); setAddingCard(false); }} className="rt-mono"
              aria-expanded={bestOpen}
              style={{ background: "none", border: "none", fontSize: 11, letterSpacing: 1, color: bestOpen ? T.text : T.sub, padding: "4px 2px", textDecoration: "underline" }}>
              ⚡ which card?
            </button>
          )}
          <button onClick={() => { setManagingCards((v) => !v); setAddingCard(false); setBestOpen(false); }} className="rt-mono"
            aria-expanded={managingCards}
            style={{ background: "none", border: "none", fontSize: 11, letterSpacing: 1, color: managingCards ? T.text : T.sub, padding: "4px 2px", textDecoration: "underline" }}>
            ⚙ manage cards {allCards.length > activeCards.length ? `(${activeCards.length}/${allCards.length} on)` : ""}
          </button>
          {filter && (
            <>
              <button onClick={() => setDetailCard(detailCard === filter ? null : filter)} className="rt-mono"
                aria-expanded={detailCard === filter}
                style={{ background: "none", border: "none", fontSize: 11, letterSpacing: 1, color: detailCard === filter ? T.text : T.sub, padding: "4px 2px", textDecoration: "underline" }}>
                ⓘ card details
              </button>
              <button onClick={() => { setFilter(null); setDetailCard(null); }} className="rt-mono"
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
          <AddCardPanel T={T}
            ownedCounts={allCards.reduce((m, c) => { const k = (c.name || "").toLowerCase(); m[k] = (m[k] || 0) + 1; return m; }, {})}
            onCancel={() => setAddingCard(false)}
            onAdd={(card) => { setCustomCards((cs) => [...cs, { ...card, id: "card" + Date.now() + "-" + Math.floor(Math.random() * 1e6) }]); }}
            onAddCatalog={addCatalogCard} />
        )}

        {detailCard && (
          <CardDetailPanel T={T} card={cardOf(detailCard)} benefits={benefits} onClose={() => setDetailCard(null)} />
        )}

        {bestOpen && (
          <BestCardPanel T={T} cards={activeCards} onClose={() => setBestOpen(false)} />
        )}

        {/* Tabs */}
        <nav style={{ display: "flex", gap: 6, margin: "20px 0 14px" }} role="tablist">
          {[["benefits", "Deadlines"], ["todo", "To-do"], ["scorecard", "Scorecard"], ["points", "Points"]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              style={{
                flex: 1, border: `1px solid ${T.text}`, borderRadius: 999, padding: "8px 6px", fontSize: 12.5, fontWeight: 600,
                whiteSpace: "nowrap", textAlign: "center",
                background: tab === id ? T.inverseBg : "transparent", color: tab === id ? T.inverseText : T.text,
              }}>{label}</button>
          ))}
        </nav>

        {tab === "benefits" && (
          <section aria-label="Benefit deadlines">
            {activeCards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "44px 20px", color: T.sub }}>
                <div className="rt-serif" style={{ fontSize: 30, color: T.text }}>Your wallet is empty.</div>
                <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>Tap <strong>+ Add card</strong> above to add the cards you carry — their credits, deadlines, and perks all show up here.</div>
              </div>
            ) : (<>
            {/* Annual Fees Due Soon (within ~1 month) */}
            {annualFees.some((af) => af.daysLeft !== null && af.daysLeft <= REMIND_DAYS) && (
              <div style={{ marginBottom: 20, padding: "12px 14px", background: T.panel, borderRadius: 12, border: `1px solid ${T.amberBorder}` }}>
                <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.amberText, fontWeight: 600, marginBottom: 10 }}>
                  ⏰ ANNUAL FEE REMINDER · DUE WITHIN A MONTH
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {annualFees.filter((af) => af.daysLeft !== null && af.daysLeft <= REMIND_DAYS).map((af) => (
                    <div key={af.card.id} style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{af.card.displayName || af.card.name}</span>
                          <span className="rt-mono" style={{ fontSize: 11, color: T.sub, marginLeft: 8 }}>{money(af.card.fee)}</span>
                        </div>
                        <div className="rt-mono" style={{ textAlign: "right", fontSize: 12, color: af.daysLeft <= 14 ? T.red : T.amber }}>
                          <div style={{ fontWeight: 600 }}>{fmtDate(af.dueDate)}</div>
                          <div style={{ fontSize: 10, color: af.daysLeft <= 14 ? T.red : T.amber }}>{af.daysLeft}d</div>
                        </div>
                      </div>
                      <AddToCalendar T={T} compact date={af.dueDate}
                        title={`${af.card.displayName || af.card.name} annual fee — ${money(af.card.fee)}`}
                        details={`Nexus reminder: your ${money(af.card.fee)} annual fee posts around ${fmtDate(af.dueDate)}. Decide whether to keep, downgrade, or cancel.`} />
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
                          {b.auto && <span className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: T.green, border: `1px solid ${T.green}`, borderRadius: 4, padding: "1px 5px" }}>⟳ AUTO</span>}
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
                        onSetAuto={(v) => setAuto(b, v)}
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
            </>)}
          </section>
        )}

        {tab === "todo" && (
          <section aria-label="To-do by time">
            <div className="rt-mono" style={{ background: T.inverseBg, color: T.inverseText, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 11, letterSpacing: 2 }}>{todoCount === 0 ? "NOTHING PENDING" : `${todoCount} TO USE`}</span>
              <span style={{ fontSize: 24, fontWeight: 600 }}>{money(todoTotal)}</span>
            </div>

            {todoCount === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.sub }}>
                <div className="rt-serif" style={{ fontSize: 28, color: T.text }}>{activeCards.length === 0 ? "Nothing to track yet." : "All caught up."}</div>
                <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{activeCards.length === 0 ? "Add the cards you carry with + Add card, and their credits will show up here as a to-do list." : "Every active credit for the current period is checked off. Nice."}</div>
              </div>
            ) : (
              TODO_ORDER.map((f) => {
                const items = todo[f];
                if (!items.length) return null;
                const bucketSum = items.reduce((t, i) => t + i.remaining, 0);
                return (
                  <div key={f} style={{ marginBottom: 18 }}>
                    <div className="rt-mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px", fontSize: 10, letterSpacing: 2, color: T.sub }}>
                      <span>{TODO_LABELS[f].toUpperCase()} · {items.length}</span>
                      <span>{money(bucketSum)} LEFT</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((item, i) => {
                        const c = cardOf(item.cardId);
                        const urgent = item.dLeft !== null && item.dLeft <= 7;
                        const soon = item.dLeft !== null && item.dLeft <= 21 && !urgent;
                        return (
                          <div key={item.id} className="rt-row" style={{ animationDelay: `${i * 25}ms`, background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, borderLeft: `4px solid ${c.accent}`, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "12px 14px" }}>
                            <button onClick={() => setUsed(item, item.amount)} aria-label={`Mark ${item.name} used`}
                              title="Mark used"
                              style={{ width: 26, height: 26, borderRadius: 999, border: `2px solid ${urgent ? T.red : T.borderSoft}`, background: "transparent", display: "grid", placeItems: "center", flex: "0 0 auto", color: T.sub, fontSize: 13 }}>
                              ○
                            </button>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <span className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, background: c.accent, color: "#fff", borderRadius: 4, padding: "2px 6px" }}>{c.name.toUpperCase()}</span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                                <span className="rt-mono">{money(item.remaining)} · </span>{item.name}
                              </div>
                            </div>
                            <div className="rt-mono" style={{ textAlign: "right", fontSize: 12, color: urgent ? T.red : T.text }}>
                              <div style={{ fontWeight: 600 }}>{fmtDate(item.end)}</div>
                              {item.dLeft !== null && <div style={{ fontSize: 10, color: urgent ? T.red : soon ? T.amber : T.sub }}>{item.dLeft}d left</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
            <p style={{ fontSize: 11, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>
              Only credits you haven't fully used yet show here, soonest to reset first. Tap the circle to check one off — it drops from this list and is marked used on the Deadlines tab too. Recurring perks (lounge access, phone protection) aren't listed since there's nothing to "use up."
            </p>
          </section>
        )}

        {tab === "scorecard" && (
          <section aria-label="Annual fee scorecard">
            {activeCards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "44px 20px", color: T.sub }}>
                <div className="rt-serif" style={{ fontSize: 28, color: T.text }}>No cards to score yet.</div>
                <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Add a card and this tab tracks how much of each annual fee you've earned back in credits.</div>
              </div>
            ) : (<>
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
            </>)}
          </section>
        )}

        {tab === "points" && (
          <section aria-label="Points balances">
            {/* Toggle to include/exclude partner (P2) accounts */}
            {points.some((p) => p.p2) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Include P2's accounts</div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Show your partner's balances in the list and the total.</div>
                </div>
                <Toggle T={T} on={showP2} onChange={setShowP2} label="P2 accounts" />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visiblePoints.map((p) => {
                const isEdit = editingPoint === p.id;
                return (
                  <div key={p.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {p.name}
                          {p.p2 && <span className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: T.amberText, background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 4, padding: "1px 5px" }}>P2</span>}
                        </div>
                        {p.cards && <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: T.sub, marginTop: 2 }}>{p.cards.toUpperCase()}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <input
                          className="rt-mono" type="number" min="0" value={p.balance}
                          aria-label={`${p.name} balance`}
                          onChange={(e) => updatePoint(p.id, { balance: Number(e.target.value) || 0 })}
                          style={{ width: 130, fontSize: 18, fontWeight: 600, textAlign: "right", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", background: T.surfaceAlt, color: T.text }}
                        />
                        <div className="rt-mono" style={{ fontSize: 10, color: T.sub, marginTop: 3 }}>
                          ≈ {money(p.balance * p.cpp / 100)} at {p.cpp}¢/pt
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 6, textAlign: "right" }}>
                      <button onClick={() => setEditingPoint(isEdit ? null : p.id)}
                        style={{ background: "none", border: "none", fontSize: 11, color: T.sub, textDecoration: "underline", padding: 0 }}>
                        {isEdit ? "close" : "edit"}
                      </button>
                    </div>
                    {isEdit && (
                      <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 8, paddingTop: 12, display: "grid", gap: 10 }}>
                        <div><label className="rt-mono" style={lblP}>PROGRAM NAME</label>
                          <input style={inpP} value={p.name} onChange={(e) => updatePoint(p.id, { name: e.target.value })} /></div>
                        <div><label className="rt-mono" style={lblP}>SUBTITLE (CARDS / SOURCE)</label>
                          <input style={inpP} value={p.cards} placeholder="e.g. Gold + Platinum" onChange={(e) => updatePoint(p.id, { cards: e.target.value })} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div><label className="rt-mono" style={lblP}>VALUE (¢ / POINT)</label>
                            <input style={inpP} type="number" min="0" step="0.05" value={p.cpp} onChange={(e) => updatePoint(p.id, { cpp: Number(e.target.value) || 0 })} /></div>
                          <div>
                            <label className="rt-mono" style={lblP}>PARTNER (P2)</label>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", background: T.surfaceAlt }}>
                              <span className="rt-mono" style={{ fontSize: 11, color: T.sub }}>P2's account</span>
                              <Toggle T={T} on={!!p.p2} onChange={(v) => updatePoint(p.id, { p2: v })} label="P2 account" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <button onClick={() => { removePoint(p.id); setEditingPoint(null); }}
                            style={{ background: "none", border: "none", color: T.red, fontSize: 12, textDecoration: "underline", padding: 0 }}>Delete program</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={addPoint}
              style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 12, border: `1.5px dashed ${T.borderSoft}`, background: "transparent", fontSize: 13, fontWeight: 600, color: T.sub }}>
              + Add a points or miles program
            </button>

            <div className="rt-mono" style={{ marginTop: 16, background: T.inverseBg, color: T.inverseText, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, letterSpacing: 2 }}>TOTAL ESTIMATED VALUE</span>
              <span style={{ fontSize: 24, fontWeight: 600 }}>{money(visiblePoints.reduce((s, p) => s + p.balance * p.cpp / 100, 0))}</span>
            </div>
            <p style={{ fontSize: 11, color: T.faint, marginTop: 12, lineHeight: 1.5 }}>
              Tap <strong>edit</strong> on any program to rename it, set its value per point, mark it as your partner's (P2), or remove it — and use <strong>+ Add</strong> for any program not listed. Cent-per-point values are estimates; everything saves automatically.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ————— Add-to-calendar button (opens Google Calendar; .ics for Apple/Outlook) ————— */
function AddToCalendar({ T, title, details, date, compact }) {
  const links = calendarLinks(title, details, date);
  if (!links) return null;
  const open = (url) => { try { window.open(url, "_system"); } catch (e) { try { window.open(url, "_blank"); } catch (_) { window.location.href = url; } } };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={() => open(links.google)} className="rt-mono"
        style={{ background: "none", border: `1px solid ${T.borderSoft}`, borderRadius: 999, color: T.text,
          fontSize: compact ? 10 : 11, letterSpacing: .5, padding: compact ? "3px 10px" : "5px 12px", cursor: "pointer" }}>
        ＋ add to calendar
      </button>
      <a href={links.icsUri} download="nexus-reminder.ics" className="rt-mono"
        style={{ fontSize: compact ? 10 : 11, color: T.sub, textDecoration: "underline" }}>Apple / .ics</a>
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
                <div style={{ fontWeight: 700, fontSize: 14, opacity: c.enabled ? 1 : .5, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {c.displayName}
                  {c.p2 && <span className="rt-mono" style={{ fontSize: 8, letterSpacing: 1, fontWeight: 700, background: T.amberBg, color: T.amberText, border: `1px solid ${T.amberBorder}`, borderRadius: 4, padding: "1px 5px" }}>P2</span>}
                </div>
                <div className="rt-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: T.sub }}>
                  {(c.issuer || "").toUpperCase()}{c.enabled ? "" : " · OFF"}
                </div>
              </div>
              <button onClick={() => onRemove(c.id)} className="rt-mono"
                style={{ background: "none", border: `1px solid ${T.red}`, borderRadius: 999, color: T.red, fontSize: 10, letterSpacing: .5, padding: "3px 9px", flex: "0 0 auto" }}>Delete</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "end", opacity: c.enabled ? 1 : .5 }}>
              <div>
                <label className="rt-mono" style={lbl}>ANNUAL FEE</label>
                <div className="rt-mono" style={{ fontSize: 15, fontWeight: 600, padding: "6px 2px" }}>{money(c.fee)}</div>
              </div>
              <div>
                <label className="rt-mono" style={lbl}>FEE POSTS IN</label>
                <select style={inp} value={c.annualMonth ?? 0} disabled={!c.enabled}
                  onChange={(e) => onUpdate(c.id, { annualMonth: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", opacity: c.enabled ? 1 : .5 }}>
              <div>
                <label className="rt-mono" style={lbl}>NICKNAME (TO TELL DUPLICATES APART)</label>
                <input style={inp} value={c.nickname || ""} placeholder={`e.g. ${c.name} #2`} disabled={!c.enabled}
                  onChange={(e) => onUpdate(c.id, { nickname: e.target.value })} />
              </div>
              <div style={{ textAlign: "center" }}>
                <label className="rt-mono" style={{ ...lbl, marginBottom: 6 }}>P2'S CARD</label>
                <Toggle T={T} on={!!c.p2} onChange={(v) => onUpdate(c.id, { p2: v })} label={`${c.displayName} as P2`} />
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

/* ————— "Which card should I use?" panel ————— */
function BestCardPanel({ T, cards, onClose }) {
  const [cat, setCat] = useState("dining");
  const label = (SPEND_CATS.find((s) => s.key === cat) || {}).label || "";
  const ranked = cards
    .map((c) => ({ card: c, rate: rateFor(c, cat), value: cardValue(c, cat) }))
    .sort((a, b) => b.value - a.value || b.rate - a.rate);
  const fmtRate = (r) => (Number.isInteger(r) ? r : r.toFixed(1)) + "×";
  // Cards within ~0.05¢ of the top value are treated as a tie and shown as equal.
  const topVal = ranked.length ? ranked[0].value : 0;
  const winners = ranked.filter((r) => Math.abs(r.value - topVal) < 0.05);
  const rest = ranked.filter((r) => Math.abs(r.value - topVal) >= 0.05);
  const tie = winners.length > 1;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginTop: 10, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub }}>WHICH CARD SHOULD I USE FOR…</div>
        <button onClick={onClose} className="rt-mono" style={{ background: "none", border: "none", color: T.sub, fontSize: 11, textDecoration: "underline" }}>close</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SPEND_CATS.map((s) => (
          <button key={s.key} onClick={() => setCat(s.key)} aria-pressed={cat === s.key}
            style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: "7px 12px", cursor: "pointer",
              border: `1px solid ${cat === s.key ? T.text : T.borderSoft}`,
              background: cat === s.key ? T.inverseBg : "transparent", color: cat === s.key ? T.inverseText : T.text }}>
            {s.label}
          </button>
        ))}
      </div>

      {winners.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {tie && (
            <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.amberText }}>
              ⚖ TIE FOR {label.toUpperCase()} · {winners.length} CARDS EQUAL
            </div>
          )}
          {winners.map((w) => (
            <div key={w.card.id} style={{ background: w.card.bg, color: w.card.ink, borderRadius: 12, padding: "16px 18px", boxShadow: `0 6px 16px ${T.shadow}` }}>
              <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, opacity: .8 }}>
                {tie ? "EQUAL BEST" : "BEST"} FOR {label.toUpperCase()}{w.card.p2 ? " · P2" : ""}
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4, lineHeight: 1.15 }}>{w.card.displayName}</div>
              <div className="rt-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                {fmtRate(w.rate)} points · ≈ {w.value.toFixed(1)}¢ back per $1
              </div>
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub, marginBottom: 6 }}>OTHER CARDS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rest.slice(0, 5).map((r) => (
              <div key={r.card.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderLeft: `4px solid ${r.card.accent}`, borderRadius: 10, padding: "9px 12px" }}>
                <span style={{ fontWeight: 600, fontSize: 13, minWidth: 0 }}>{r.card.displayName}{r.card.p2 && <span className="rt-mono" style={{ fontSize: 8, letterSpacing: 1, color: T.amberText, marginLeft: 6 }}>P2</span>}</span>
                <span className="rt-mono" style={{ fontSize: 12, color: T.sub, flex: "0 0 auto" }}>{fmtRate(r.rate)} · ≈{r.value.toFixed(1)}¢</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: T.faint, lineHeight: 1.5, margin: 0 }}>
        Ranked by estimated value per $1 spent — the card's earn rate for {label.toLowerCase()} multiplied by a typical value for its points/miles. Point values are estimates; your real value depends on how you redeem.
      </p>
    </div>
  );
}

/* ————— Card details (earning categories + every perk) ————— */
function CardDetailPanel({ T, card, benefits, onClose }) {
  const credits = benefits.filter((b) => b.cardId === card.id && b.amount > 0);
  const perks = benefits.filter((b) => b.cardId === card.id && b.amount <= 0);
  const earnList = card.earnDetails && card.earnDetails.length ? card.earnDetails : (card.earn ? [card.earn] : []);
  const sec = { fontSize: 10, letterSpacing: 2, color: T.sub, fontWeight: 600, margin: "16px 0 8px" };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `4px solid ${card.accent}`, borderRadius: 12, padding: 16, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub }}>{(card.issuer || "").toUpperCase()}{card.p2 ? " · P2" : ""}</div>
          <div className="rt-serif" style={{ fontSize: 26, lineHeight: 1.05, marginTop: 2 }}>{card.displayName || card.name}</div>
        </div>
        <button onClick={onClose} className="rt-mono" style={{ background: "none", border: "none", color: T.sub, fontSize: 11, textDecoration: "underline", flex: "0 0 auto" }}>close</button>
      </div>

      <div className="rt-mono" style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12, color: T.sub, flexWrap: "wrap" }}>
        <span>ANNUAL FEE <strong style={{ color: T.text }}>{money(card.fee)}</strong></span>
        <span>FEE POSTS <strong style={{ color: T.text }}>{card.annualMonth != null ? MONTHS[card.annualMonth] : "—"}</strong></span>
      </div>
      {card.fee > 0 && card.annualMonth != null && (
        <div style={{ marginTop: 10 }}>
          <AddToCalendar T={T} date={nextFeeDate(card.annualMonth)}
            title={`${card.displayName || card.name} annual fee — ${money(card.fee)}`}
            details={`Nexus reminder: your ${money(card.fee)} annual fee posts around ${fmtDate(nextFeeDate(card.annualMonth))}. Decide whether to keep, downgrade, or cancel.`} />
        </div>
      )}

      {earnList.length > 0 && (
        <>
          <div className="rt-mono" style={sec}>EARNING CATEGORIES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {earnList.map((e, i) => (
              <span key={i} className="rt-mono" style={{ fontSize: 11, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 10px" }}>{e}</span>
            ))}
          </div>
        </>
      )}

      {credits.length > 0 && (
        <>
          <div className="rt-mono" style={sec}>STATEMENT CREDITS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {credits.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
                  {b.notes && <div style={{ fontSize: 11, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{b.notes}</div>}
                </div>
                <div className="rt-mono" style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{money(b.amount)}</div>
                  <div style={{ fontSize: 9, letterSpacing: 1, color: T.sub }}>{FREQ[b.freq].label.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {perks.length > 0 && (
        <>
          <div className="rt-mono" style={sec}>OTHER PERKS &amp; BENEFITS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {perks.map((b) => (
              <div key={b.id}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
                {b.notes && <div style={{ fontSize: 11, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{b.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: T.faint, marginTop: 16, lineHeight: 1.5 }}>
        Earning rates and perks reflect published terms as of mid-2026 — verify against your own card. Only credits with a dollar value show on the Deadlines and To-do tabs; the rest lives here.
      </p>
    </div>
  );
}

/* ————— Edit panel ————— */
function EditPanel({ T, benefit, usageMap, onSetPeriod, onSave, onUsed, onSetAuto, onDelete }) {
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
      {amount > 0 && freq !== "multiyear" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: T.surfaceAlt, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div className="rt-mono" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 600, color: benefit.auto ? T.green : T.text }}>⟳ AUTO-CHARGE</div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Checks off automatically at the start of each period.</div>
          </div>
          <Toggle T={T} on={!!benefit.auto} onChange={(v) => onSetAuto(v)} label={benefit.name} />
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
      {amount > 0 && freq !== "multiyear" && benefit.end && (
        <div>
          <label className="rt-mono" style={lbl}>REMIND ME ON MY CALENDAR</label>
          <AddToCalendar T={T} date={benefit.end}
            title={`Use ${money(amount)} ${name}`}
            details={`Nexus: use your ${money(amount)} ${name} before it resets on ${fmtDate(benefit.end)}.${notes ? " " + notes : ""}`} />
        </div>
      )}
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

/* ————— Add card: catalog picker (with custom-card fallback) ————— */
function AddCardPanel({ T, ownedCounts, onAddCatalog, onAdd, onCancel }) {
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(false);
  const [forP2, setForP2] = useState(false);
  const inp = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, background: T.surfaceAlt, color: T.text };
  if (custom) return <CustomCardForm T={T} p2={forP2} onAdd={onAdd} onCancel={() => setCustom(false)} />;
  const q = query.trim().toLowerCase();
  const groups = CARD_CATALOG.map((g) => ({
    group: g.group,
    items: g.items.filter((it) => !q || it.name.toLowerCase().includes(q) || it.issuer.toLowerCase().includes(q)),
  })).filter((g) => g.items.length);
  const seg = (on) => ({ flex: 1, textAlign: "center", padding: "7px 4px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
    background: on ? T.inverseBg : "transparent", color: on ? T.inverseText : T.sub, border: "none" });
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "grid", gap: 10, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub }}>ADD A CARD · PICK FROM THE LIST</div>
        <button onClick={onCancel} className="rt-mono" style={{ background: "none", border: "none", color: T.sub, fontSize: 11, textDecoration: "underline" }}>done</button>
      </div>
      {/* Whose card is this? */}
      <div>
        <label className="rt-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: T.sub, display: "block", marginBottom: 4 }}>ADDING FOR</label>
        <div style={{ display: "flex", gap: 4, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3 }}>
          <button style={seg(!forP2)} onClick={() => setForP2(false)}>My card</button>
          <button style={seg(forP2)} onClick={() => setForP2(true)}>P2's card</button>
        </div>
      </div>
      <input style={inp} value={query} placeholder="Search cards or issuers (e.g. United, Hilton, Venture X)…" onChange={(e) => setQuery(e.target.value)} />
      <div style={{ maxHeight: 400, overflowY: "auto", display: "grid", gap: 4, margin: "0 -4px", padding: "0 4px" }}>
        {groups.length === 0 && <div style={{ fontSize: 13, color: T.sub, padding: "12px 2px" }}>No matches. Try another search, or create a custom card below.</div>}
        {groups.map((g) => (
          <div key={g.group}>
            <div className="rt-mono" style={{ fontSize: 10, letterSpacing: 2, color: T.sub, padding: "12px 2px 6px" }}>{g.group.toUpperCase()}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {g.items.map((it) => {
                const owned = ownedCounts[it.name.toLowerCase()] || 0;
                return (
                  <button key={it.name} onClick={() => onAddCatalog(it, g.group, forP2)}
                    style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", textAlign: "left",
                      background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ width: 30, height: 20, borderRadius: 4, background: it.bg, flex: "0 0 auto", boxShadow: `0 0 0 1px ${T.border}` }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 13.5, lineHeight: 1.2 }}>{it.name}{owned > 0 && <span className="rt-mono" style={{ fontSize: 9, color: T.green, marginLeft: 6 }}>✓ {owned} in wallet</span>}</span>
                      <span className="rt-mono" style={{ fontSize: 9, letterSpacing: 1, color: T.sub }}>{it.issuer.toUpperCase()}</span>
                    </span>
                    <span className="rt-mono" style={{ fontSize: 11, color: T.sub, flex: "0 0 auto" }}>{it.fee > 0 ? money(it.fee) + "/yr" : "NO FEE"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setCustom(true)}
        style={{ width: "100%", padding: 11, borderRadius: 10, border: `1.5px dashed ${T.borderSoft}`, background: "transparent", fontSize: 13, fontWeight: 600, color: T.sub }}>
        ＋ Create a custom card instead
      </button>
      <p style={{ fontSize: 11, color: T.faint, lineHeight: 1.5, margin: 0 }}>
        Tap a card to add it — the list stays open so you can add several (all of P2's, or two of the same business card). Tap <strong>done</strong> when finished. Everything is editable afterward under manage cards.
      </p>
    </div>
  );
}

/* ————— Custom card form ————— */
function CustomCardForm({ T, p2, onAdd, onCancel }) {
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
        <button disabled={!name} onClick={() => onAdd({ name, issuer, fee, annualMonth, earn: (earn || "SET TOP EARN CATEGORY").toUpperCase(), bg: finish.bg, ink: finish.ink, accent: finish.accent, p2: !!p2 })}
          style={{ background: T.inverseBg, color: T.inverseText, border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600, opacity: name ? 1 : .4 }}>Add card</button>
      </div>
    </div>
  );
}
