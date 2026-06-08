# v1.61 BP Target Simulation & Versioning — Command Log

## Baseline
- **Branch:** `xiaomi/v1-61-bp-target-simulation-versioning`
- **Baseline commit (main):** `5ee609c`

---

## New Features

### 1. BP Simulation
- Toggle button in toolbar: [Simulate] 
- Two modes: **Multiply** (倍數調整) and **Direct Amount** (直接設定)
- Three scopes: **All Years** (全部年份), **From Year** (從某年開始), **Single Year** (單一年份)
- Simulation results are shown in the grid but NOT saved to Firestore
- "Apply Simulation" computes the values, "Reset" restores original saved data
- Simulation data is a separate `simResult` state, independent from `savedRecord`

### 2. Version History
- [Versions] button in toolbar shows version count
- Modal dialog with version list (name + timestamp)
- "Save Version" stores current grid data to localStorage
- "Restore" loads a version's data into the grid
- "Delete" removes a version (permission-controlled)

### 3. Permissions
- Viewer: can see the UI but can't save/restore/delete
- Editor: can save, restore, and delete own versions
- Owner: full access to all versions

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/BpTargets.tsx` | Added simulation state, handlers, UI controls; version history modal; toolbar buttons |
| `frontend/src/i18n/zhTW.ts` | Added 24 new bpTargets.* keys (simulation + versioning) |
| `frontend/src/i18n/en.ts` | Added 24 new bpTargets.* keys (simulation + versioning) |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.61.0` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.61.0` |
| `frontend/package.json` | Version `1.54.0` → `1.61.0` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.61.0` |

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ Pass |
| `npm run build` | ✅ Pass (957ms) |
| `npm test -- --run` | ✅ 61 files, 1532 tests passed |

## Deployment

```
firebase deploy --only hosting
```
