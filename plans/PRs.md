# Product Development PRs - Organized by Domain

This document organizes all feedback items from `feedback.md` into actionable PRs grouped by development domain. Each PR is designed to be handled independently by a single agent or with minimal cross-agent coordination.

## Quick Reference: PR Priority Order

**First Priority**: #0 (Test Environment Setup)  
**Sprint 1 (Critical)**: #1 → #2  
**Sprint 2 (High Priority)**: #3 → #4  
**Sprint 3 (Polish)**: #5

| PR # | Title | Agent | Priority | Domain |
|------|-------|-------|----------|--------|
| #0 | Test Environment Setup | Tester | **Critical** | **First** |
| #1 | Game Engine & Performance | Engineer | High | Game Engine |
| #2 | Offline & PWA Support | Engineer | High | PWA |
| #3 | Level Design & Balance | Designer | High | Level Design |
| #4 | Win Screen & Level Transitions | Designer | High | Level Design |
| #5 | Assets & Publishing Workflow | Creative | Medium | Assets |

---

## Domain: Game Engine / Level Builder / Dev Mode

### PR #1: Game Engine & Performance
**Assigned to**: Engineer  
**Priority**: High  
**Domain**: Game Engine / Level Builder / Dev Mode

**Goal**: Fix core game engine issues, performance problems, and camera/controls bugs

#### Tasks

**Performance & Memory Management:**
1. **Memory leak fix**: Make sure all elements are cleared between levels - phone & browser get laggy after playing a few levels
2. **Cleanup validation**: Add cleanup logging/validation to ensure all Three.js objects are disposed

**Bubble Interaction & Physics:**
3. **Pop area scaling**: Larger pop target area when bubbles are small - make area scale inversely with visual diameter
4. **Bubble popping detection**: Often feels like trying to pop a bubble but no matter how much tapping, it's unpoppable unless rotating field - maybe something about planes & how far away bubble is? Perhaps bubbles should be popped as if they're on a 2D plane?
5. **Slomo physics**: Slomo should slow all physics (including hazards)

**Camera & Controls:**
6. **Replay level bug**: When replaying a level, zoom & orbit don't work
7. **Zoom fix**: Fix zoom at most zoomed out
8. **Camera reset**: Ensure camera resets properly when starting/replaying levels

#### Files to Modify
- `app/js/game.js` (cleanup functions, raycasting logic, slomo implementation, camera/controls initialization)
- `app/js/hazards.js` (hazard physics in slomo)

#### Acceptance Criteria
- [ ] No memory leaks (test by playing 10+ levels in sequence)
- [ ] Performance remains stable across multiple levels
- [ ] All Three.js objects properly disposed
- [ ] Pop area scales correctly with bubble size
- [ ] Bubbles are consistently poppable (no unpoppable bubbles)
- [ ] Slomo affects all physics including hazards
- [ ] Zoom and orbit work when replaying levels
- [ ] Zoom at most zoomed out works correctly
- [ ] Camera resets properly on level start/replay
- [ ] Tested on mobile and desktop

---

## Domain: Offline / PWA Support

### PR #2: Offline & PWA Support
**Assigned to**: Engineer  
**Priority**: High  
**Domain**: Offline / PWA Support

**Goal**: Fix offline functionality and ensure PWA works correctly

#### Tasks
1. **Offline mode**: Still not working - debug and fix Service Worker caching/offline behavior
2. **Service Worker validation**: Verify all assets are cached correctly
3. **PWA manifest**: Ensure manifest.json is properly configured and working

#### Files to Modify
- `app/js/sw.js` (Service Worker)
- `app/assets/manifest.json` (if needed)
- Test offline functionality

#### Acceptance Criteria
- [ ] Game works offline after first load
- [ ] All assets cached correctly
- [ ] Service Worker updates properly
- [ ] Tested on multiple browsers (Chrome, Firefox, Safari)
- [ ] Tested on mobile devices
- [ ] PWA install prompt works

---

## Domain: Level Design

### PR #3: Level Design & Balance
**Assigned to**: Designer  
**Priority**: High  
**Domain**: Level Design

**Goal**: Rebalance levels, improve hazard system, enhance special bubbles, and optimize visual clarity

#### Tasks

**Level Balance & Difficulty:**
1. **Level 2**: Reduce comet size
2. **Level 3**: Increase difficulty (currently easier than Level 2)
3. **Level 8**: Increase difficulty (too easy to be level 8)
4. **Level 11**: Reduce comet diameter (comets way too big)
5. **Level 21**: Make easier OR make it the final level with more special bubbles (repulsor levels only work with special bubbles because bubbles move so fast)
6. **General**: Some levels have gotten too easy & some too difficult - review and rebalance entire progression
7. **Repulsor radius**: Makes levels hard - review and adjust repulsor configurations across levels

**Hazard System Improvements:**
8. **Comet limit**: No more than 1 comet per level (enforce in level builder and validation)
9. **Hazard balance**: Need 1-2 more hazards, but scale back on repulsors and bumpers
10. **Radiation hazard**: Design and implement - removes/eats bubbles (requires bubble respawn to be enabled for that level), maybe with blast aura every x seconds that eats y% of bubbles and then respawns z bubbles
11. **Asteroid belt**: eliminate this hazard for now -- we may revisit it in the future, but comment out any logic related to this hazard type and document this, so i know to come back to it in the future / have some history.
12. **Magnetize conversion**: Magnetize bubble is a hindrance rather than a help for players - convert it into a hazard instead of special bubble and apply it to 1 or 2 levels. It should still work for X seconds at a time and then bubbles will stop being magnetized / float freely again. the magnetizing point should be random in the field though, and move a little -- like the bubble does.

**Special Bubble System:**
13. **Megabubble**: Create special bubble to increase diameter of all existing bubbles temporarily.
14. **Color separation**: Need fixed array of bubble colors, and fixed set of special bubble colors that don't intersect (Level 9: special and regular bubbles too similar)
15. **Special/bonus levels**: Need visual distinction - maybe increase time to 90s too? And add some social bubbles into the mix so you can pop more stuff?

**Visual Clarity:**
16. **Level 4**: Multi-wormhole is very busy on screen - any level with multiple hazards actually
17. **Visual optimization**: Review and optimize visual presentation when multiple hazards are present

#### Files to Modify
- `app/data/levels.json` (rebalance levels, update hazard configs, mark special/bonus levels)
- `app/data/hazards.json` (add new hazards: radiation, asteroid belt, magnetize hazard)
- `app/data/specialbubbles.json` (add megabubble, remove magnetize from special bubbles)
- `app/data/config.json` or new color config (separate color arrays)
- `app/js/hazards.js` (implement new hazards, visual effects optimization)
- `app/js/game.js` (implement megabubble effect)
- `app/js/builder.js` (update builder to validate comet limit)

#### Acceptance Criteria
- [ ] All levels tested and difficulty feels appropriate
- [ ] Level progression feels smooth and challenging
- [ ] Comet sizes appropriate for each level
- [ ] Repulsor levels are playable without requiring special bubbles
- [ ] Comet limit enforced (max 1 per level)
- [ ] New hazards implemented and working (radiation, asteroid belt, magnetize hazard)
- [ ] Magnetize converted to hazard
- [ ] Level builder validates comet limit
- [ ] Megabubble implemented and working
- [ ] Color arrays separated (no overlap)
- [ ] Special/bonus levels visually distinct
- [ ] Multiple hazards don't create visual clutter
- [ ] Screen remains readable with multiple hazards
- [ ] All hazards tested in game and builder
- [ ] All special bubbles tested

---

### PR #4: Win Screen & Level Transitions
**Assigned to**: Designer  
**Priority**: High  
**Domain**: Level Design

**Goal**: Improve win screen UX, transitions, and level advancing flow

#### Tasks
1. **Win screen transition**: Better/smoother transition from playing to win screen - feels choppy and just interrupts your play midclick
2. **Win screen layout**: The whole win overlay feels wrong - too much text, too many individual lines, different font sizes
3. **Button spacing**: More vertical space between buttons on win screen overlay - too easy to hit buttons and advance without getting a chance to read.
4. **Next level button**: Too easy to click past win screen into next level. Button to goto next level shouldn't be in the middle of the screen. Alternatively, use a Netflix autoplay-style button where progress bar automatically fills over 15s before proceeding unless you explicitly take action
5. **Credits cleanup**: Remove links in credits from win screens -- links take you out of game, which is weird.
6. **Level transitions**: Better transition between levels

#### Files to Modify
- `app/index.html` (CSS/styling)
- `app/js/game.js` (transition logic)

#### Acceptance Criteria
- [ ] Smooth transitions (no choppiness)
- [ ] Clean, readable win screen layout
- [ ] Proper button spacing
- [ ] Next level button placement/behavior improved (Netflix autoplay style or better placement)
- [ ] Credits links removed from win screens
- [ ] Level transitions smooth
- [ ] Tested on mobile and desktop

---

## Domain: Assets / Publishing Workflow

### PR #5: Assets & Publishing Workflow
**Assigned to**: Creative  
**Priority**: Medium  
**Domain**: Assets / Publishing Workflow

**Goal**: Improve audio assets, visual assets, and publishing/asset generation workflow

#### Tasks

**Audio Assets:**
1. **Better music**: Better music, precompose? (improve soundtrack quality)
2. **Music pause**: Pause music on win screen overlays.

**Visual Assets:**
1. **App icon**: Better app icon SVG
2. **Special level visuals**: Visual distinction for special/bonus levels (visual assets)

**Publishing Workflow:**
5. **Icon generation**: Ensure icon generation script works correctly with new icon
6. **Audio generation**: Ensure audio generation pipeline works correctly
7. **Asset validation**: Add validation to ensure all required assets are generated

#### Files to Modify
- `app/js/soundtrack.js` (improve music generation)
- `app/js/audio-manager.js` (pause on overlay)
- `app/js/game.js` (trigger pause)
- `app/assets/icon.svg` (redesign)
- `app/index.html` (special level visual indicators)
- `tools/generate-icons.sh` (if needed)
- `tools/generate-audio-headless.js` (if needed)

#### Acceptance Criteria
- [ ] Music quality improved
- [ ] Music pauses on win screen overlay
- [ ] Audio pipeline working correctly
- [ ] New app icon designed and generated
- [ ] Special/bonus levels have visual distinction
- [ ] Icons work across all platforms
- [ ] New icon is SVG and compatible with existing icon generation script
- [ ] All asset generation scripts work correctly
- [ ] Asset validation passes

---

## PR #0: Test Environment Setup
**Assigned to**: Tester  
**Priority**: **Critical - First Priority**  
**Domain**: Testing Infrastructure

**📄 Full implementation plan**: See [PR0_test_env_setup.md](./PR0_test_env_setup.md)

### Quick Summary

**Goal**: Create automated test infrastructure that can test all levels programmatically via `npm run test:levels`

**Key Tasks**:
1. Set up Puppeteer-based test automation
2. Create level-by-level test script
3. Implement JSON validation
4. Generate test reports with screenshots
5. Enable quick test modes (all levels, first 5, single level)
6. Default to mobile viewport testing (configurable for all viewports)

**Files Created**:
- `scripts/test-levels.js` - Main test runner
- `scripts/test-utils.js` - Test utilities  
- `test-config.json` - Test configuration

**Files Modified**:
- `package.json` - Add test scripts

**Usage**:
```bash
npm run test:levels        # Test all levels (mobile only)
npm run test:quick         # Test first 5 levels (mobile only)
npm run test:all-viewports # Test all levels across all viewports
npm run test:single -- --level=5  # Test single level
```

For complete implementation details, code examples, and troubleshooting, see [PR0_test_env_setup.md](./PR0_test_env_setup.md).

---

## Summary by Agent

### Designer
**PRs**: #3 (lead), #4 (lead)
- PR #3: Level Design & Balance (complete ownership)
- PR #4: Win Screen & Level Transitions (complete ownership)

**Total Tasks**: ~17 tasks

### Engineer
**PRs**: #1 (lead), #2 (lead)
- PR #1: Game Engine & Performance (complete ownership)
- PR #2: Offline & PWA Support (complete ownership)

**Total Tasks**: ~8 tasks

### Creative
**PRs**: #5 (lead)
- PR #5: Assets & Publishing Workflow (complete ownership)

**Total Tasks**: ~7 tasks

### Tester
**PRs**: #0 (first priority, then ongoing)
- PR #0: Test Environment Setup (first priority - must complete before other PRs)
- Ongoing: Manual testing and QA across all PRs

**Total Tasks**: Test infrastructure setup + QA across all PRs

---

## Priority Ranking

### First Priority: Test Infrastructure (PR #0)
**Goal**: Set up automated testing before fixing bugs

**PR #0: Test Environment Setup** - Must be done first to enable proper QA for all subsequent PRs

### Sprint 1: Critical Engine & PWA (PRs #1-2)
**Goal**: Fix game-breaking issues and core functionality

1. **PR #1: Game Engine & Performance** - Memory leaks, unpoppable bubbles, camera/controls broken
2. **PR #2: Offline & PWA Support** - Core PWA feature not working

### Sprint 2: Level Design (PRs #3-4)
**Goal**: Fix level balance and player experience

3. **PR #3: Level Design & Balance** - Game balance, new hazards, special bubbles, visual clarity
4. **PR #4: Win Screen & Level Transitions** - Choppy transitions, poor layout, accidental clicks

### Sprint 3: Polish (PR #5)
**Goal**: Audio and visual polish

5. **PR #5: Assets & Publishing Workflow** - Better music, app icon, asset generation

### Ongoing
**PR #0: Testing & QA** - Continuous testing across all PRs

---

## Notes

- **Pulsars are very fun** - Keep as-is, no changes needed
- **Wormholes are ok** - Keep as-is, no changes needed
- All tasks should be tested by Tester before merging
- Each PR is designed to be handled independently by the assigned agent
- Minimal cross-agent coordination required (Designer owns level design completely, Engineer owns engine completely, etc.)
