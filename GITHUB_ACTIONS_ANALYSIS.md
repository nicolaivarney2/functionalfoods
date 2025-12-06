# GitHub Actions Goma Sync Analysis

## Current Setup

### Workflow: `.github/workflows/goma-scheduled-sync.yml`
- **Schedule:** Daily at `23:50 UTC` (00:50 Danish time next day, or 01:50 during DST)
- **Endpoint:** `/api/admin/goma/scheduled-sync`
- **Authentication:** Uses `CRON_SECRET` header

### Store Schedule (Based on UTC Day)

| Day (UTC) | Danish Day | Stores | Notes |
|-----------|------------|--------|-------|
| Monday (1) | Mandag → Tirsdag | None | No stores scheduled |
| Tuesday (2) | Tirsdag → Onsdag | ABC Lavpris | ✅ |
| Wednesday (3) | Onsdag → Torsdag | 365 Discount | ✅ |
| Thursday (4) | Torsdag → Fredag | MENY, Spar, Kvickly, SuperBrugsen, Løvbjerg | ✅ |
| Friday (5) | Fredag → Lørdag | Netto, Bilka, Brugsen | ✅ |
| Saturday (6) | Lørdag → Søndag | REMA 1000, Lidl | ✅ |
| Sunday (0) | Søndag → Mandag | Nemlig | ✅ |

## Potential Issues

### 1. Timing Issue ⚠️
The workflow runs at **23:50 UTC** (00:50/01:50 Danish time), which is:
- **After midnight** in Denmark
- This means it's running on the **next day** in Danish time
- Stores typically update their offers **during the day** (Thursday, Friday, Saturday, etc.)

**Example:**
- Store updates offers on **Thursday** (Danish time)
- GitHub Action runs Thursday 23:50 UTC = **Friday 00:50 Danish time**
- The code checks `getUTCDay()` which will return **Friday (5)**, not Thursday (4)
- So Thursday stores won't sync until Friday night!

### 2. Day Calculation Mismatch
The `getStoresForToday()` function uses:
```typescript
const dayIndex = now.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
```

But the workflow runs at 23:50 UTC, which is the next day in Danish time.

## Recommended Fix

### Option 1: Run Earlier (Recommended)
Change the cron schedule to run **earlier in the day** to match Danish time:

```yaml
schedule:
  # Run at 02:00 UTC (04:00 Danish time in summer, 03:00 in winter)
  # This ensures we're still on the correct day in Denmark
  - cron: '0 2 * * *'
```

Or even better, run **multiple times per day** to catch updates:

```yaml
schedule:
  # Run at 02:00, 08:00, 14:00, and 20:00 UTC
  - cron: '0 2,8,14,20 * * *'
```

### Option 2: Use Danish Time Zone
Modify `getStoresForToday()` to use Danish time zone instead of UTC:

```typescript
function getStoresForToday(): { dayIndex: number; stores: GomaStoreId[] } {
  // Use Danish time zone (Europe/Copenhagen)
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}))
  const dayIndex = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // ... rest of the code
}
```

### Option 3: Run at Store Update Times
Run at specific times when stores typically update:

```yaml
schedule:
  # Thursday stores (MENY, Spar, etc.) - run Thursday 02:00 UTC
  - cron: '0 2 * * 4'  # Thursday
  # Friday stores (Netto, Bilka, etc.) - run Friday 02:00 UTC  
  - cron: '0 2 * * 5'  # Friday
  # Saturday stores (REMA 1000, Lidl) - run Saturday 02:00 UTC
  - cron: '0 2 * * 6'  # Saturday
  # Sunday stores (Nemlig) - run Sunday 02:00 UTC
  - cron: '0 2 * * 0'  # Sunday
  # Tuesday stores (ABC Lavpris) - run Tuesday 02:00 UTC
  - cron: '0 2 * * 2'  # Tuesday
  # Wednesday stores (365 Discount) - run Wednesday 02:00 UTC
  - cron: '0 2 * * 3'  # Wednesday
```

## Required GitHub Secrets/Variables

Make sure these are configured in GitHub:

1. **`CRON_SECRET`** (Secret)
   - Must match the `CRON_SECRET` in Vercel environment variables
   - Used for authentication

2. **`SITE_URL`** (Variable)
   - Should be set to `https://functionalfoods.dk` (or your production URL)
   - Used to call the API endpoint

## Verification Steps

1. **Check GitHub Actions runs:**
   - Go to GitHub → Actions tab
   - Look for "Goma Scheduled Sync" workflow runs
   - Check if they're running daily and succeeding

2. **Check Vercel logs:**
   - Go to Vercel dashboard → Your project → Functions
   - Check `/api/admin/goma/scheduled-sync` logs
   - Look for successful imports and which stores were synced

3. **Check database:**
   - Verify products are being added to `products` and `product_offers` tables
   - Check `updated_at` timestamps to see when last sync happened

## Current Status

✅ **Workflow is configured correctly** (structure-wise)
⚠️ **Timing might be off** (runs too late, might miss the correct day)
❓ **Need to verify** if it's actually running and succeeding

## Recommendation

I recommend **Option 1** (run earlier) combined with checking the day calculation. The simplest fix is to:
1. Change cron to `'0 2 * * *'` (02:00 UTC = 04:00 Danish time)
2. This ensures we're still on the correct day when checking `getUTCDay()`

