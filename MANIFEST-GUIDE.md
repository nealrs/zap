# PWA Manifest Configuration Guide

This guide explains all parameters in `app/assets/manifest.json` and what needs to be updated for different platforms.

## Current Status

✅ = Already configured  
⚠️ = Needs your input  
📝 = Optional but recommended

---

## Core Identity (✅ Configured)

### `name`
**Value**: `"Bubble Zap 3D"`  
**Purpose**: Full app name shown in install prompts and app launchers  
**Platform**: All  
**Max Length**: ~45 characters recommended

### `short_name`
**Value**: `"BubbleZap"`  
**Purpose**: Name shown on home screen where space is limited  
**Platform**: All  
**Max Length**: ~12 characters recommended

### `description`
**Value**: `"A fast-paced physics-based bubble popping game with hazardous obstacles"`  
**Purpose**: Shown in app stores, install prompts, and search results  
**Platform**: All, especially Google Play  
**Max Length**: 132 characters recommended  
**Action**: You may want to make this more compelling/marketing-focused

---

## Discovery & Categorization

### `categories` (✅ Configured)
**Value**: `["games", "entertainment"]`  
**Purpose**: Helps users discover your app in app stores and launchers  
**Platform**: Chrome Web Store, Microsoft Store, Play Store  
**Valid Categories**:
- `games` - Gaming apps
- `entertainment` - Entertainment apps
- `education` - Educational apps
- `productivity` - Productivity tools
- `social` - Social networking
- `news` - News apps
- `shopping` - E-commerce
- `sports` - Sports apps
- `finance` - Financial apps
- `music` - Music apps
- `photo` - Photography apps
- `travel` - Travel apps
- `business` - Business tools

### `lang` (✅ Configured)
**Value**: `"en-US"`  
**Purpose**: Primary language of the app  
**Platform**: All  
**Format**: ISO 639-1 language code + ISO 3166-1 country code  
**Action**: Change if app is in different language (e.g., `"es-ES"` for Spanish)

### `dir` (✅ Configured)
**Value**: `"ltr"`  
**Purpose**: Text direction (left-to-right or right-to-left)  
**Platform**: All  
**Options**: `"ltr"` or `"rtl"`  
**Action**: Change to `"rtl"` if app uses Arabic, Hebrew, etc.

---

## Content Rating (⚠️ TODO)

### `iarc_rating_id` (⚠️ Needs Configuration)
**Value**: `"TODO_ADD_IARC_RATING"`  
**Purpose**: International Age Rating Coalition ID for age-appropriate content  
**Platform**: Microsoft Store, Google Play  
**Required For**: App store submission  

**How to Get**:
1. Visit https://www.globalratings.com/
2. Complete questionnaire about your game content
3. Get a unique rating ID (e.g., `"e84b072d-71b3-4d3e-86ae-31a8ce4e53b7"`)
4. Replace `TODO_ADD_IARC_RATING` with your ID

**Questions You'll Answer**:
- Does the game contain violence?
- Are there in-app purchases?
- Is there user-generated content?
- Does it require internet?

**Action**: 
- If submitting to stores: **REQUIRED** - Get rating ID
- If only web PWA: Can remove this field entirely

---

## Screenshots (⚠️ TODO)

### `screenshots` (⚠️ Needs Screenshots)
**Purpose**: Visual previews shown in install prompts and app listings  
**Platform**: Chrome (Android), Edge, Play Store  
**Impact**: Significantly increases install conversion rates

**Current Placeholders**:
```json
{
  "src": "TODO_ADD_SCREENSHOT_PATH",
  "sizes": "540x720",
  "type": "image/png",
  "form_factor": "narrow",
  "label": "Bubble Zap gameplay on mobile"
}
```

**Requirements**:
- **Narrow (Mobile)**:
  - Sizes: 540x720px minimum, 1080x1920px recommended
  - Aspect ratio: 3:4 (portrait) or 9:16 (tall portrait)
  - Format: PNG or JPEG
  - Use: Mobile install prompts
  
- **Wide (Desktop)**:
  - Sizes: 1280x720px minimum, 1920x1080px recommended
  - Aspect ratio: 16:9 (landscape)
  - Format: PNG or JPEG
  - Use: Desktop/tablet install prompts

**How to Create**:
1. Take screenshots during actual gameplay
2. Capture level selector, gameplay, victory screens
3. Save to `app/assets/` folder
4. Update paths in manifest:
   ```json
   "src": "/assets/screenshot-mobile-gameplay.png"
   ```

**Action**: 
1. Capture 2-4 screenshots (mobile + desktop)
2. Optimize file sizes (keep under 1MB each)
3. Update `src` paths and `label` descriptions
4. Or remove `screenshots` array if not needed

---

## App Shortcuts (✅ Configured)

### `shortcuts`
**Purpose**: Quick actions from home screen long-press (Android) or right-click (desktop)  
**Platform**: Android, Windows, ChromeOS  
**Limit**: 4 shortcuts maximum

**Current Shortcuts**:
1. **Play Game** - Opens main game
2. **Dev Mode** - Opens developer menu

**How Users Access**:
- **Android**: Long-press app icon
- **Windows**: Right-click app icon
- **ChromeOS**: Right-click or long-press

**Action**: 
- These are good as-is
- Could add more (e.g., "Continue Last Level", "High Scores")
- Can remove "Dev Mode" if you want dev tools hidden from users

---

## Display Modes (✅ Configured)

### `display`
**Value**: `"fullscreen"`  
**Purpose**: Primary display mode  
**Options**:
- `fullscreen` - Hides browser UI completely (best for games)
- `standalone` - Looks like native app (has status bar)
- `minimal-ui` - Shows minimal browser controls
- `browser` - Regular browser tab

### `display_override` (✅ Configured)
**Value**: `["fullscreen", "standalone", "minimal-ui"]`  
**Purpose**: Fallback chain if platform doesn't support preferred mode  
**Platform**: Modern browsers with PWA support  
**How It Works**: Tries each mode in order until one is supported

---

## Visual Theme (✅ Configured)

### `background_color`
**Value**: `"#000000"`  
**Purpose**: Splash screen background while app loads  
**Format**: Hex color code  
**Action**: Already matches your dark game aesthetic

### `theme_color`
**Value**: `"#000000"`  
**Purpose**: Colors browser UI (address bar on Android, taskbar on Windows)  
**Format**: Hex color code  
**Action**: Could change to `"#1a1a2e"` to match your gradient background

---

## Orientation (✅ Configured)

### `orientation`
**Value**: `"portrait-primary"`  
**Purpose**: Locks app to portrait mode  
**Options**:
- `portrait-primary` - Vertical, right-side-up
- `landscape-primary` - Horizontal
- `any` - Allows rotation
- `portrait` - Any portrait orientation
- `landscape` - Any landscape orientation

**Action**: Perfect for your mobile-first game

---

## Related Applications (✅ Configured)

### `related_applications`
**Value**: `[]` (empty array)  
**Purpose**: Links to native app versions (iOS App Store, Google Play)  
**Use Case**: If you have native versions of your game

**Example** (if you had native apps):
```json
"related_applications": [
  {
    "platform": "play",
    "url": "https://play.google.com/store/apps/details?id=com.example.bubblezap",
    "id": "com.example.bubblezap"
  },
  {
    "platform": "itunes",
    "url": "https://apps.apple.com/app/bubble-zap/id123456789"
  }
]
```

### `prefer_related_applications`
**Value**: `false`  
**Purpose**: If `true`, directs users to native app instead of PWA  
**Action**: Keep as `false` unless you have native apps

---

## Icons (✅ Configured)

### `icons`
**Current Icons**:
- 192x192px (minimum required)
- 512x512px (recommended)

**Purpose**: `any maskable`
- `any` - Standard icon display
- `maskable` - Safe zone for adaptive icons (Android)

**Action**: 
- Already configured via `generate-icons.sh`
- Could add more sizes if needed:
  - 72x72 (older Android)
  - 96x96 (low-DPI devices)
  - 128x128 (ChromeOS)
  - 384x384 (high-DPI devices)

---

## Additional Parameters You Could Add

### `scope`
**Current**: `"/"`  
**Purpose**: Defines which URLs are part of your app  
**Already Configured**: No changes needed

### `start_url`
**Current**: `"/index.html"`  
**Purpose**: URL that opens when app launches  
**Already Configured**: No changes needed

### `share_target` (📝 Optional)
**Purpose**: Allows users to share content TO your app  
**Platform**: Android  
**Use Case**: If you wanted to let users share bubble scores/screenshots

**Example**:
```json
"share_target": {
  "action": "/share",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url"
  }
}
```

### `protocol_handlers` (📝 Optional)
**Purpose**: Register custom URL schemes (e.g., `bubblezap://level/3`)  
**Platform**: Desktop Chrome, Edge  
**Use Case**: Deep linking to specific levels

**Example**:
```json
"protocol_handlers": [
  {
    "protocol": "web+bubblezap",
    "url": "/level?id=%s"
  }
]
```

---

## Recommended Action Items

### High Priority (Do This)
1. ✅ ~~Add `categories` and `lang`~~ - Already done
2. ⚠️ **Add screenshots** - Take 2-4 gameplay screenshots
3. ⚠️ **Get IARC rating** - If submitting to stores
4. ✅ ~~Add `display_override`~~ - Already done
5. ✅ ~~Add shortcuts~~ - Already done

### Medium Priority (Should Do)
- Update `description` to be more marketing-focused
- Add more icon sizes (72x72, 96x96, 128x128, 384x384)
- Test install experience on Android and iOS
- Verify all paths are correct when deployed

### Low Priority (Nice to Have)
- Add `share_target` for score sharing
- Add `protocol_handlers` for deep links
- Create app store listings (if applicable)
- Add more screenshots (4-8 total is ideal)

---

## Platform-Specific Notes

### Android (Chrome)
- Uses: `name`, `short_name`, `description`, `icons`, `screenshots`, `shortcuts`, `categories`
- Supports: Maskable icons, splash screen, install prompt
- **Tip**: Screenshots significantly boost install rates

### iOS (Safari)
- Limited manifest support
- Uses: `name`, `icons` (via meta tags)
- Ignores: Most other fields
- **Note**: iOS requires separate meta tags in HTML (already in your `index.html`)

### Windows (Edge)
- Uses: All manifest fields
- Supports: Shortcuts, store submission
- **Tip**: Good for desktop gaming experience

### Desktop (Chrome, Edge, Brave)
- Uses: `name`, `short_name`, `icons`, `screenshots`, `shortcuts`
- Supports: Window controls, taskbar integration
- **Tip**: Wide screenshots look great on desktop

---

## Testing Your Manifest

### Browser DevTools
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Manifest" in sidebar
4. Verify all fields parse correctly
5. Check for warnings

### Validation Tools
- https://manifest-validator.appspot.com/
- Chrome DevTools "Manifest" tab
- Lighthouse PWA audit

### Install Testing
1. Deploy to HTTPS server
2. Open in Chrome (mobile or desktop)
3. Look for install prompt
4. Install and test user experience

---

## Quick Reference

**Must Update**:
- `screenshots` - Add real screenshots
- `iarc_rating_id` - Get rating or remove field

**Optional Updates**:
- `description` - Make more compelling
- `theme_color` - Could use `#1a1a2e` instead of black

**Already Perfect**:
- `name`, `short_name` - Good length and clarity
- `categories` - Correct for a game
- `icons` - Proper sizes and formats
- `display` - Fullscreen is ideal for games
- `orientation` - Portrait is correct
- `shortcuts` - Useful quick actions

---

**Last Updated**: January 2026  
**Manifest Version**: Web App Manifest (W3C Standard)  
**Compatibility**: Chrome 90+, Edge 90+, Safari 15.4+ (limited), Firefox 90+
