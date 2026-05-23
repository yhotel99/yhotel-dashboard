# Occupancy Calculation Fix - Summary

## Problem
The previous implementation used a date range overlap approach with `Math.ceil` for night calculations, which caused:
- Incorrect occupancy rates (0% when bookings exist, or 100% incorrectly)
- Wrong period day count (1-day report showed 0 days)
- Didn't account for multi-room bookings
- Used `Math.ceil` which could overcount nights

## Solution - Industry Standard Daily-Based Approach

### Key Changes

#### 1. Fixed Period Day Calculation
```typescript
// OLD (WRONG): 1-day report = 0 days
const periodDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

// NEW (CORRECT): 1-day report = 1 day (inclusive)
const periodDays = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
```

#### 2. Daily Iteration Method
Instead of calculating overlap ranges, the new implementation:
- Iterates each day in the report period
- For each day D, checks if: `check_in <= D AND check_out > D`
- Counts occupied rooms per day (respecting multi-room bookings)
- Sums total occupied room-nights

#### 3. Multi-Room Booking Support
```typescript
// Handles bookings with multiple rooms via booking_rooms junction table
const roomCount = booking.booking_rooms?.length || 1;
```

#### 4. Correct Check-out Handling
```typescript
// Check-out day is NOT counted as occupied (industry standard)
if (checkIn <= currentDay && checkOut > currentDay) {
  // Room is occupied on this day
}
```

#### 5. Valid Status Filtering
Only counts bookings with status:
- `confirmed`
- `checked_in`
- `checked_out`

Ignores: `cancelled`, `no_show`, `pending`

### Formula
```
Occupancy (%) = (Total Occupied Room-Nights / Total Available Room-Nights) × 100

Where:
- Total Occupied Room-Nights = Sum of occupied rooms across all days
- Total Available Room-Nights = Total Rooms × Number of Days
```

## Technical Implementation

### Data Fetching
```typescript
// Fetch bookings that overlap with period (optimized query)
supabase
  .from("bookings")
  .select("id, check_in, check_out, status, booking_rooms(room_id)")
  .is("deleted_at", null)
  .lt("check_in", toISO)
  .gt("check_out", fromISO)
```

### Daily Calculation
```typescript
const calculateOccupiedRoomNights = (bookings, periodStart, periodEnd) => {
  const occupancyMap = new Map<string, number>();
  
  for (const booking of bookings) {
    const roomCount = booking.booking_rooms?.length || 1;
    
    // Iterate each day
    const currentDay = new Date(periodStart);
    while (currentDay <= periodEnd) {
      // Check if room is occupied on this day
      if (checkIn <= currentDay && checkOut > currentDay) {
        occupancyMap.set(dayKey, (occupancyMap.get(dayKey) || 0) + roomCount);
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }
  
  return Array.from(occupancyMap.values()).reduce((sum, count) => sum + count, 0);
};
```

## Performance
- Time complexity: O(n × d) where n = bookings, d = days in period
- Space complexity: O(d) for the occupancy map
- Efficient for typical hotel reporting periods (1-90 days)

## Validation
The new implementation ensures:
- ✅ Occupancy = 0% when no valid bookings exist
- ✅ Occupancy > 0% when bookings exist
- ✅ Occupancy ≤ 100% (capped)
- ✅ 1-day report counts as 1 day, not 0
- ✅ Multi-room bookings counted correctly
- ✅ Check-out day not counted as occupied
- ✅ Only valid booking statuses included

## Other Metrics (Unchanged)
- Gross Revenue: Sum of `total_amount` by `created_at`
- Total Bookings: Count by `created_at`
- Total Refunded: Sum of refunded amounts
- Growth calculations: Comparison with previous period
