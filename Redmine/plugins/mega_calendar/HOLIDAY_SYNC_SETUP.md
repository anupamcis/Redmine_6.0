# Holiday Sync Setup Guide

## Issue Fixed
The `uninitialized constant PublicHoliday::ErpPublicHolidays` error has been resolved.

## What Was Changed

### 1. Created `ErpPublicHolidays` Class
**File**: `lib/erp_public_holidays.rb`

This class now serves as:
- A placeholder for ERP integration
- A sample implementation for development/testing
- Returns sample Indian holidays in development mode

### 2. Updated `PublicHoliday` Model
**File**: `app/models/public_holiday.rb`

Added error handling:
- Checks if `ErpPublicHolidays` is defined
- Gracefully handles missing class
- Better error logging

### 3. Updated `HolidaysController`
**File**: `app/controllers/holidays_controller.rb`

Improved error messages:
- Shows specific error if ERP integration is missing
- Provides guidance on manual holiday entry

## How to Use

### Option 1: Use Sample Holidays (Development)
The system now works with sample holidays in development mode:

1. Go to: `http://localhost:4000/holidays`
2. Click "Sync Holidays" (admin only)
3. Sample holidays will be imported

### Option 2: Implement Real ERP Integration
Edit `lib/erp_public_holidays.rb` and implement your ERP API:

```ruby
def get_holiday_list
  # Replace this with your actual ERP API call
  response = YourErpApi.get_holidays(year: Date.today.year)
  
  # Format: Array of hashes with "name" and "date" (MM/DD/YYYY)
  response.map do |holiday|
    {
      "name" => holiday.holiday_name,
      "date" => holiday.date.strftime("%m/%d/%Y")
    }
  end
end
```

### Option 3: Add Holidays Manually
Use the Redmine admin interface:
1. Go to: `http://localhost:4000/holidays`
2. Add holidays manually through the web interface

## Testing

1. **Check if error is fixed**:
   - Navigate to `http://localhost:4000/holidays`
   - You should no longer see the `NameError`

2. **Test sync (Development)**:
   - Login as admin
   - Go to `http://localhost:4000/holidays/sync_hoildays`
   - Sample holidays should be imported

3. **View holidays**:
   - Check the "General" tab in holidays page
   - Holidays should appear in the calendar

## API Format Expected

```ruby
[
  { "name" => "Holiday Name", "date" => "01/26/2026" },
  { "name" => "Another Holiday", "date" => "08/15/2026" }
]
```

## Troubleshooting

- **Still getting error?** - Restart the Redmine server
- **Holidays not showing?** - Check `production.log` for errors
- **Need custom holidays?** - Edit the `get_sample_holidays` method in `lib/erp_public_holidays.rb`

## Next Steps

1. Test the holidays page
2. Implement actual ERP integration (if needed)
3. Or use manual holiday management




