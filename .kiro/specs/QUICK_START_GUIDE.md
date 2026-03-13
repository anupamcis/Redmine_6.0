# Dashboard Improvements - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Verify Files Exist
All these files should now exist:
```
✅ redmine-frontend/src/utils/velocityHistory.js
✅ redmine-frontend/src/utils/projectHealthConfig.js
✅ redmine-frontend/src/utils/workingDaysCalculator.js
✅ redmine-frontend/src/components/settings/DashboardSettingsModal.js
✅ redmine-frontend/src/pages/myProjects/MyProjectsPage.js (updated)
```

### Step 2: Start the App
```bash
cd redmine-frontend
npm start
```

### Step 3: Open Dashboard
Navigate to: `http://localhost:3000/projects`

### Step 4: Click Settings
Look for the "Settings" button in the top-right corner of the page.

### Step 5: Configure
- **Health Tab**: Adjust project health thresholds
- **Holidays Tab**: Add your organization's holidays

---

## 🎯 Key Features

### 1. Velocity Tracking
**What**: Tracks team velocity over time
**Where**: Team Velocity card (bottom right of dashboard)
**Benefit**: Shows real trend instead of 0%
**Note**: Needs 24 hours to show trend

### 2. Health Configuration
**What**: Customize project health criteria
**Where**: Settings → Health Thresholds tab
**Benefit**: Match your team's standards
**Example**: Change "Healthy" from 80% to 85%

### 3. Holiday Calendar
**What**: Exclude holidays from working days
**Where**: Settings → Holidays tab
**Benefit**: Accurate working days calculation
**Example**: Add "2024-12-25" for Christmas

---

## 📊 What Changed

### Before
```
Team Velocity: 50%
Trend: 0% this month ❌
```

### After
```
Team Velocity: 50%
Trend: +5% this month ✅
```

---

## ⚙️ Settings Guide

### Health Thresholds Tab

**Healthy Projects**
- Min Completion: 80% (default) - Adjust as needed
- Max Open/Closed Ratio: 0.5 (default) - Lower = healthier

**Moderate Projects**
- Min Completion: 50% (default)
- Max Open/Closed Ratio: 1.5 (default)

**Inactivity Levels**
- Low Risk: 1 day (default)
- Medium Risk: 2 days (default)
- High Risk: 7 days (default)
- Critical: 30 days (default)

### Holidays Tab

**Add Holiday**
- Format: `YYYY-MM-DD` (specific date) or `MM-DD` (recurring)
- Example: `2024-12-25` or `12-25`

**Load Preset**
- Select country: US, UK, CA, IN
- Click "Load Preset"
- Common holidays added automatically

---

## 🧪 Quick Test

### Test 1: Settings Modal
1. Click "Settings" button
2. Modal should open
3. Switch between tabs
4. Close modal

### Test 2: Change Health Threshold
1. Open Settings → Health tab
2. Change "Healthy" min completion to 85
3. Click "Save Changes"
4. Close modal
5. Check if project health cards updated

### Test 3: Add Holiday
1. Open Settings → Holidays tab
2. Type "2024-12-25" in input
3. Click "Add"
4. Holiday appears in list
5. Click "Save Changes"

---

## 🐛 Troubleshooting

### Settings button not visible?
- Clear browser cache
- Reload page
- Check browser console for errors

### Velocity trend shows 0%?
- This is normal for first 24 hours
- Wait for historical data to accumulate
- Check again tomorrow

### Settings not saving?
- Check if localStorage is enabled
- Try incognito/private mode
- Check browser console for errors

### Modal not opening?
- Check browser console
- Verify all files were created
- Try hard refresh (Ctrl+Shift+R)

---

## 💾 Data Storage

All settings are stored in browser localStorage:

```javascript
// View stored data
console.log(localStorage.getItem('redmine_velocity_history'));
console.log(localStorage.getItem('redmine_health_config'));
console.log(localStorage.getItem('redmine_holidays'));

// Clear all settings (reset)
localStorage.removeItem('redmine_velocity_history');
localStorage.removeItem('redmine_health_config');
localStorage.removeItem('redmine_holidays');
location.reload();
```

---

## 📱 Mobile Support

All features work on mobile:
- ✅ Settings modal is responsive
- ✅ Touch-friendly buttons
- ✅ Scrollable content
- ✅ Works on tablets

---

## 🔒 Privacy & Security

- ✅ All data stored locally (localStorage)
- ✅ No data sent to external servers
- ✅ No tracking or analytics
- ✅ Data stays in your browser

---

## 📈 Expected Results

### Immediately
- Settings button appears
- Modal opens and closes
- Settings can be changed
- Changes persist after reload

### After 24 Hours
- Velocity trend shows real data
- Historical comparison available
- Trend percentage updates

### After 1 Week
- More accurate velocity trends
- Better historical insights
- Reliable working days data

---

## 🎓 Tips & Best Practices

### Health Thresholds
- Start with defaults (80%, 50%)
- Adjust based on team feedback
- Review monthly and refine

### Holidays
- Load country preset first
- Add organization-specific holidays
- Update at start of each year

### Velocity Tracking
- Check weekly for trends
- Compare month-over-month
- Use for sprint planning

---

## 🆘 Need Help?

### Check Documentation
- `my-projects-dashboard-specification.md` - Full technical spec
- `dashboard-improvements-summary.md` - Implementation details
- `INTEGRATION_COMPLETE.md` - Integration status

### Debug Commands
```javascript
// Test velocity tracking
import { saveVelocitySnapshot, getVelocityHistory } from './utils/velocityHistory';
saveVelocitySnapshot(75, 100, 75);
console.log(getVelocityHistory());

// Test health config
import { getHealthConfig } from './utils/projectHealthConfig';
console.log(getHealthConfig());

// Test working days
import { getLastWorkingDays } from './utils/workingDaysCalculator';
console.log(getLastWorkingDays(5));
```

---

## ✅ Success Checklist

- [ ] Settings button visible in header
- [ ] Settings modal opens
- [ ] Can switch between tabs
- [ ] Can change health thresholds
- [ ] Can add/remove holidays
- [ ] Changes save successfully
- [ ] Changes persist after reload
- [ ] No console errors
- [ ] Works on mobile
- [ ] Velocity trend updates (after 24h)

---

## 🎉 You're All Set!

The dashboard improvements are now active and ready to use.

**Next Steps**:
1. Configure your health thresholds
2. Add your organization's holidays
3. Wait 24 hours for velocity trends
4. Share with your team!

**Questions?** Check the full documentation in `.kiro/specs/`

---

**Happy tracking! 📊**
