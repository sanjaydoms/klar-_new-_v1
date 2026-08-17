# KLAR B2C — QA Findings

Branch: `sudheer/b2c-new` | Tested: desktop 1440px + mobile 375px, dev + production build
Not tested: Login + Flight search end-to-end — auth service (:5010) and flight service (:5011) were down.

---

## WEBSITE — B2C (Guest Login)

1. Manage your bookings — redirection is wrong
   - `/my-bookings` sits outside any `ProtectedRoute` — guest reaches it with no login prompt
2. `/b2b` — B2C route issue
   - `routes.config.ts:4` → `LOGIN: '/b2b'`
   - `auth.api.ts:106` sends `clientType: 'B2B'` on every consumer signup — **audit existing users in DB**
   - `/b2b` hardcoded in 6 more files: ProtectedRoute, PublicRoute, interceptors, ProfileDropdown
3. No create account in Google and Mobile — only Email has a signup branch
4. Wishlist redirects directly — user needs to add dates and people
   - `hotelUtils.ts` stores no dates/occupancy
   - Wishlist is localStorage only, no backend sync — lost on cache clear, doesn't follow user to phone
   - Hotels only; can't save flight/cab/package
5. Coming back from any tab returns to landing page
   - All 6 tabs live at `/` with `activeTab` in local React state; URL never changes, so Back has nothing to return to
   - Fix: put tab in URL — `/?tab=hotels`
6. `/dashboard` and `/` — two routes for landing page (`routes/index.tsx:124` and `:131`) — SEO duplicate content
7. **Privacy Policy page does not exist — it serves "Report a Security Issue"**
   - `pages/Terms/PrivacyPolicy.tsx` contains the `ReportSecurityIssue` component — **legal exposure**
8. `/profile` is a placeholder in production — "User profile coming soon…"
9. `/settings` hangs forever on "Loading profile…" — no timeout, no error state
10. `/profile` and `/settings` also reachable by guests
11. 404 page says "Go to Dashboard" — reinforces the duplicate landing route

---

## FLIGHTS

1. Type "bombay" → need Mumbai. Same for bangalore, mysuru
   - `flightApi.ts:43` uses plain `.includes()` substring match, no alias table
   - All legacy names fail: bombay→Mumbai, bangalore→Bengaluru, mysore→Mysuru, madras→Chennai, calcutta→Kolkata
2. Background inconsistent while typing — width and height change
   - `flightApi.ts:46` filters **1.9 MB airports.json synchronously on every keystroke**
   - Dropdown has no fixed height → layout reflows
3. Indian airports should be on top — "goa" comes second
   - `flightApi.ts:202` merges global results BEFORE local Indian ones
   - `searchGlobalAirports` already `.slice(0,20)`'d before the merge — Indian airports cut off first
   - **No scoring at all** — results come back in raw JSON file order
4. Calendar should open on input click, not just icon
   - Native `<input type="date">` in **7 places** — Chrome only opens picker from the icon
   - `react-day-picker` is already shipped (886 kB, loaded and unused here)
5. Travellers tab overlapping the inputs
   - `FlightSearchSection.tsx:569` → `mb-24` is a hardcoded 96px nudge
   - Line 1214 does the same dropdown as `top-full mt-2` — two behaviours in one file
6. Need fuzzy logic while typing, India priority — confirmed absent
7. Dashboard alignment should fit viewport height even after inputs given — same cause as #5
8. "Book Your Flights" section has no use — redirects to dashboard
9. **Items 1, 3 and 6 are one root cause** — `flightApi.ts:43-61`. Fix once, resolves all three
10. `FlightSearchSection.tsx` is **1,790 lines** with 3–4 duplicated copies of the same form
    - Extract shared `<DateField>` + `<TravellerPopover>` BEFORE fixing 4, 5, 7 — or they regress

---

## FOOTER

1. Terms of Service — not found
2. Escalation Channel — not found
3. Report a Security Issue — not found
   - **Root cause:** `FooterLinks.tsx:177` and `:201` generate URLs from label text:
     `` href={`/${text.toLowerCase().replace(/\s+/g,'-')}`} ``
   - Pages exist and are routed — the slugs just don't match:

   | Label | Generates | Actual route |
   |---|---|---|
   | Terms of Service | `/terms-of-service` | `/terms-and-conditions` |
   | Escalation Channel | `/escalation-channel` | `/escalation` |
   | Report Security Issues | `/report-security-issues` | `/report-security` |

   - Fix: explicit `{ label, path: ROUTES.X }` map — one change fixes all three

4. Footer redirection links not working
   - `FooterLinks.tsx:116` → `navigate('flights/oneway')` — **no leading slash**, so it's relative
   - From `/hotels/search` it resolves to `/hotels/flights/oneway` → 404
   - Breaks all ~55 "Delhi to Chennai flight" links on every page except `/`
5. "ABOUT THE SITE" came twice — `FooterLinks.tsx:78-97`, two near-identical arrays
6. "IMPORTANT LINKS" not working — `FooterLinks.tsx:207` passes **no `href`**; all 6 are no-ops
7. No LinkedIn — icon file is `Vector.svg`, unrecognisable
8. No Facebook — **the Facebook icon is `/Footer_logos/Yatra.svg`** (`Footer2.tsx:22`) — competitor's logo
9. Social icons total ~700 KB — `Vector (2).svg` (Instagram) alone is **441 KB**, should be ~2 KB
10. **6 separate page-level footer components** — root cause of every footer inconsistency
    - `layout/Footer.tsx`, `Footer2.tsx`, `HotelFooter.tsx`, `InsuranceFooter.tsx`, `PackagesFooter.tsx`, `ToursAndPackagesFooter.tsx`

---

## ABOUT US

1. Add "Industries We Serve" — section does not exist
2. "What We Offer" — add cabs, cruise, charter, tours and packages
   - Cruise and charter aren't built — mark "Coming Soon" rather than implying bookable

---

## HOTELS

1. Dashboard and OTA should be same height and width
2. Footer different in flights and hotels — `layout/Footer.tsx` (13 lines) vs `HotelFooter.tsx` (365 lines)
3. Header and navbar merging on scroll — **FIXED**, see below
4. Hotel search deep links don't work — `?city=Goa` shows "Selected Location", 0 properties
5. Hotel destination autocomplete shows nothing — no dropdown, no request fires
6. **A 22 MB JPEG loads on the Hotels tab** — `HotelsContent.tsx:324` → `grand-beaufort.jpg`
7. Mobile + desktop inputs both mount — two "City, Property or Location" inputs in DOM

---

## TOURS AND PACKAGES

1. "Search Packages" — change to "Book Your Package"
   - 3 files: `ToursAndPackagesSearchSection.tsx:170`, `ToursPackagesContent.tsx:50`, `MobileToursAndPackagesSearchSection.tsx:228`
   - Confirmed it doesn't search — picks Domestic/International then goes to `/tours-contact-form`
2. Cards are not redirecting
3. Pagination is not working
4. "Plan My Journey" not working — `ToursContent.tsx:400` wrapped in `<Link to="/">`
5. Uses its own footer — `ToursAndPackagesFooter.tsx`

---

## CABS

1. No footer — confirmed, no footer component rendered on cab pages

---

## VISA

1. Flights footer showing in visa — visa has no footer of its own
2. "Contact Expert" not working — `VisaPlans.tsx:336` IS wired to `/visa/form`; recheck once :5010 is up
3. "Plan My Journey" — `VisaContent.tsx:306` only does `console.log`, no navigation

---

## INSURANCE

1. "Choose your plan" is static — make dynamic, or label "for reference only"
2. "Plan My Travel" not working — `InsuranceConnect.tsx:378` goes to `/insurance/search`, which shows "No Plans Available"
3. Empty-state copy wrong — "Try adjusting your **tracking configurations**" is boilerplate from another product

---

## NAVIGATION / COPY

1. Landing says "TOURS & PACKAGES", hotel pages say "HOLIDAY" — same destination

---

## PERFORMANCE (measured)

1. Production landing page = **4.7 MB across 49 requests**
   - FCP 1.15s on localhost with zero latency → **7–8 seconds on real Indian 4G**
2. Single JS chunk is **4.28 MB raw / 1.03 MB gzip**; every other chunk is under 340 kB
   - **Lazy routes are defeated** — `routes/index.tsx` has ~45 *eager* imports next to its 34 `lazy()` calls
3. Riding along in that chunk on the homepage:
   - `airport-codes/airports.json` — 1.9 MB raw JSON, statically imported in 4 files
   - `jspdf` 675 kB + `html2canvas` 343 kB — used once, on another page
   - `react-icons/fa` 1.38 MB + `lucide-react` 1.03 MB — two icon libraries, neither tree-shaken
4. `public/` is **86 MB** — jpg 55.4 MB (75 files, avg 756 KB), png 26.2 MB (669 files)
5. **47 of 61 images lack `loading="lazy"`**; 7 have no width/height
6. Logo `KLARBlue.png` is **4483px wide, rendered at 121px**

### Image weight on the landing page

**1.30 MB across 21 files — and 684 KB of that (53%) is footer social icons.**

| File | Size |
|---|---|
| `Footer_logos/Vector (2).svg` | **431 KB** (one Instagram icon) |
| `book_your_flight_img_1.jpg` | 293 KB |
| `book_your_flight_img_2.jpg` | 190 KB |
| `logo/KLARBlue.png` | 146 KB |
| other 5 social icons | 214 KB |

Mobile is worse — **1.88 MB**, because `MobileBg.png` (917 KB) loads on top.

| Fix | Now | After | Saved |
|---|---|---|---|
| Re-export 9 footer icons as real SVG | 684 KB | ~10 KB | **674 KB** |
| Resize logo to 242px | 146 KB | ~8 KB | **138 KB** |
| Hero JPGs → WebP | 483 KB | ~80 KB | **403 KB** |
| `MobileBg.png` → WebP | 917 KB | ~60 KB | **857 KB** |

Repo-wide, converting the JPGs and PNGs takes `public/` from **86 MB to ~10–12 MB**.

---

## ACCESSIBILITY

1. **32 of 133 tap targets under 32px** on mobile (guideline 44px)
2. **No button on the landing page has an `aria-label`**
3. Guest form: **no field has `required`**, none have `name`/`autocomplete` — browser autofill broken
4. Good: all 61 images have alt text; **no horizontal scroll at 375px**; zero console errors

---
---

# PHASE 2 — HOTELS FUNNEL (search → results → detail → review)

Walked end-to-end as a guest: Goa, 1 night, 1 room / 2 adults.
**Not clicked:** "COMPLETE BOOKING" — would create a real booking/payment.

## RESULTS PAGE

1. **Only 20 of 7,226 properties are reachable** — header says "Showing 7,226 Properties", footer says "PAGE 1 | 20 PROPERTIES LISTED". Scrolled to bottom twice, waited 12s — nothing more loads. **99.7% of inventory unreachable. Biggest funnel bug.**
2. Three contradictory counts on one screen — 7,226 / 20 / every filter says "(22)"
3. Filter counts computed on the loaded page only, not the result set
4. **Two price conventions side by side — customers cannot compare**
   - RateGain: "₹1,850 INCL. TAXES & FEES"
   - TripJack: "₹2,516 + ₹130 taxes & fees"
5. Banner contradicts the cards — banner says rates are *exclusive* of taxes, RG cards say *inclusive*
6. Duplicate navbar — **FIXED**
7. "LOCATION" in the sticky search bar renders empty
8. Stray semicolons in filter labels — **FIXED**
9. "Beach(1)" listed under Top Locations — not a location
10. Meal Plans showed truncated "Co (10)" — **FIXED**
11. Entire 200-word hotel description dumped onto each results card
12. 98 large images load at once — no virtualisation
13. Google Maps static API key visible in image URLs — confirm HTTP-referrer restrictions are set

## DETAIL PAGE

14. Tab title read "Klar B2B" — **FIXED**
15. **All five content tabs were dead** — **FIXED**
16. Address printed twice with trailing semicolons — **FIXED**
17. **URL leaks the supplier** — `/hotels/RG:82535678-...`, shareable and indexable
18. **Three currency formats in one funnel** — `₹2,516` / `INR 1850.28` / `₹ 2,670`
19. Grammar — "Fits 2 Adult - 0 Child"
20. Stray characters in amenities — "Billiards , 24h dining café X"
21. 17 of 21 images not lazy-loaded

## REVIEW BOOKING PAGE

22. **PRICING BUG — discounts displayed but never applied** — **FIXED**
23. **Internal discount codes leaked** — "Special discount **(9009)**" — **FIXED**
24. **26 country dial codes had a double plus** — "AX (++358-18)" — **FIXED**
25. One dial code contained prose — "DO (++1-809 and 1-829)" — **FIXED**
26. ~35 Special Request checkboxes ungrouped — sensitive medical items (insulin, CPAP, allergies) mixed with "honeymoon couple"
27. **No form field has `required`** — no validation on the guest form
28. **No `name`/`autocomplete` attributes** — autofill completely broken. Major mobile friction
29. Placeholder-as-label — Last Name's placeholder is literally "Required"
30. No `aria-label` on any of the 11 form inputs
31. **Card is the only payment method — no UPI**
32. A 15-minute countdown runs — expiry behaviour not tested

## WHAT WORKS WELL

- Search → results → detail → review navigates cleanly, no dead ends
- Results in ~8s with real inventory, filters, map view, 4 sort options
- 15-minute price-hold countdown is a good trust signal
- Review page fully responsive at 375px — **no horizontal scroll**
- "Similar Properties" cross-sell is a nice touch

---
---

# FIXES APPLIED — commit `3fdcabe`

| # | Fix | File |
|---|---|---|
| 1 | Removed duplicate navbar (two `fixed top-0 z-90` navs stacked) | `HotelSearchPage.tsx` |
| 2 | Fixed navbar offset — `pt-16` (64px) was short of the real 68/80px navbar | `HotelLayout.tsx` |
| 3 | All 5 detail-page tabs now scroll to their sections | `HotelDetailPage.tsx` |
| 4 | Tabs whose section doesn't render are hidden instead of dead | `HotelDetailPage.tsx` |
| 5 | Removed duplicate `id="section-rooms"` (invalid HTML) | `HotelDetailPage.tsx` |
| 6 | **Discount lines now reconcile with the total** | `HotelReviewBooking.tsx` |
| 7 | Internal promo codes stripped from offer names | `HotelReviewBooking.tsx` |
| 8 | Country dial codes: no more `++`, prose codes truncated | `HotelReviewBooking.tsx` |
| 9 | Address de-duplicated + semicolons stripped, 4 render sites | `hotelUtils.ts` + 4 components |
| 10 | Locality filter labels cleaned (display only; filter key unchanged) | `HotelFilters.tsx` |
| 11 | Meal-plan board codes mapped; bare codes bucketed as "Other" | `HotelFilters.tsx` |
| 12 | Page titles no longer reset to "Klar B2B" | `HotelSearchPage.tsx`, `CabSearchResultsPage.tsx` |

### Pricing, before and after

```
BEFORE                                AFTER
Base Fare            INR 1850.28      Base Fare            INR 1859.38
Special discount (9009)   -INR 3.41   Special discount          -INR 3.41
Exclusive discount (9005) -INR 5.69   Exclusive discount        -INR 5.69
Total Amount         INR 1850.28      Total Amount         INR 1850.28
      ^ does not add up                     ^ 1859.38 - 9.10 = 1850.28
```

The total was always correct — the *breakdown* was wrong. `basePrice` came from
`roomsToBook[0]` while the offer rows rendered from `selectedRoom` (router state);
when those disagreed the discounts appeared not to apply. Both now derive from the
same array.

**Typecheck:** 1347 pre-existing errors before and after — no new ones.

---

# CORRECTIONS

Three earlier findings were wrong. Correcting them so the report stays trustworthy.

- **"Supplier names exposed to customers" — FALSE ALARM.** Both the supplier filter (`HotelFilters.tsx:1234`) and the RG/TJ card badges (`HotelCard.tsx:477`) are gated behind `window.location.hostname === 'localhost'`. Dev-only; never render in production. Only the `RG:` URL prefix is real, and that is cosmetic.
- **"Star Category filter has no labels" — FALSE ALARM.** It renders `<FaStar>` SVG icons. Text-only extraction could not see SVGs.
- **"Country code not defaulted to India" — FALSE ALARM.** `profileCountryCode` initialises to `'IN'`.

Also: **hotel Search from the landing page works** — an earlier claim that it did nothing was a mis-click, not a bug.

---

# STILL OPEN

- **Pagination — still only 20 of 7,226 properties.** Investigated: the infrastructure is all present and correctly wired (`currentPage`, `hasMore`, `onPageChange`, an `IntersectionObserver` sentinel in `HotelList.tsx`). `hasMore` comes from `response.hasMore ?? false`, so the backend is returning false/undefined. **The fix is backend-side paging, not UI.**
- Two tax conventions across suppliers, and the banner that contradicts both
- Three currency formats across the funnel
- Guest form: no `required`, no `name`/`autocomplete`
- No UPI payment option
- Full hotel description still dumped on results cards
- 22 MB `grand-beaufort.jpg` still loading on the Hotels tab
- **"CO" board code** — left unmapped deliberately. It is RateGain's fallback default (`rateGainAdapter.ts:441`), not a confirmed meal plan. **Needs confirmation from RateGain.**
