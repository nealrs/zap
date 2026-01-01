# High Score System

## Overview

Bubble Zap 3D tracks your performance using **browser local storage**:
- **Saved locally** on your device (no uploads, no tracking)
- **Persistent** across game sessions
- **Two types**: Global best score + per-level records

---

## What's Tracked

### 🌟 Global High Score
- Your **best score across all levels**
- Displayed in top-right HUD: **🌟 Best: [score]**

### 📋 Per-Level Records
- Your **best score on each specific level**
- Shown on level intro: **"Best: X pops"**
- Each of the 10 levels tracked independently

---

## Score Messages

### During Gameplay
- **Top-right corner**: Shows global best
- **Level intro screen**: Shows level-specific record

### After Completing a Level
- **🎉 NEW LEVEL RECORD!** - Beat this level's previous best
- **✓ Matched your level record!** - Tied your best
- **🌟 NEW GLOBAL HIGH SCORE!** - All-time personal best!

---

## Managing Scores

### View Scores in Console
Press **F12**, then type:
```javascript
getHighScores()                          // View all scores
getHighScores().global                   // Global best
getHighScores().levels["Event Horizon"]  // Specific level
```

### Reset Scores
**Browser Console**:
```javascript
localStorage.removeItem('bubblezap_scores');
```

**DevTools**:
1. F12 → Application tab
2. Local Storage → Your domain
3. Delete `bubblezap_scores` entry
4. Refresh page (F5)

---

## Storage Format

Scores are stored as JSON in localStorage:
```javascript
{
  "global": 45,
  "levels": {
    "The Void": 15,
    "Event Horizon": 24,
    "Dual Vortex": 28
    // ... etc
  }
}
```

---

## Tips & Goals

### Strategy
1. Learn hazard patterns on each level
2. Speed run to beat records
3. Use special bubbles strategically on hard levels

### Target Goals
- 🥉 **Bronze**: 25+ pops across 5 levels
- 🥈 **Silver**: 35+ pops across 8 levels  
- 🥇 **Gold**: 45+ pops (beat Level 10!)
- 🌟 **Perfect**: 50+ pops

---

## FAQ

**Q: Do scores sync across devices?**  
A: No. Scores are local to each browser.

**Q: What if I clear browser data?**  
A: Scores will be deleted. Back up manually if needed:
```javascript
copy(JSON.stringify(getHighScores(), null, 2))
```

**Q: Does the game track anything else?**  
A: No. Only pop counts. No analytics, no user tracking.

**Q: Why aren't scores persisting?**  
A: Check if you're in private/incognito mode. Scores won't persist there.

---

## Compatibility

- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Requires localStorage API (standard in all browsers)
- ✅ ~100 bytes storage for all 10 levels
- ✅ Fully offline capable
- ⚠️ Won't persist in private/incognito mode
