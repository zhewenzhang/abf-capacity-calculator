# v1.51.3 Release Version Sync Hotfix Command Log

## 1. Task Goal

Synchronize visible app version and package metadata after the v1.51 Designbyte + DeepSeek release.

## 2. Root Cause

v1.51.2 was merged and deployed to Firebase Hosting, but the live page still shows `v1.45.0`.

Cause: Version number was not synchronized in source files.

## 3. Files to Modify

1. `frontend/src/App.tsx` — `const APP_VERSION = 'v1.45.0';` → `'v1.51.3'`
2. `frontend/src/services/snapshotService.ts` — `const APP_VERSION = 'v1.45.0';` → `'v1.51.3'`
3. `frontend/package.json` — `"version": "1.45.0"` → `"1.51.3"`
4. `frontend/package-lock.json` — `"version": "1.45.0"` → `"1.51.3"` (2 locations)
5. `README.md` — Add v1.51.3 release note (optional)

## 4. Command Log

### Step 0 - Status Freeze

Command:

```powershell
git status --short
git branch --show-current
git log -1 --oneline
```

Result:

```text
(clean)
main
bbe1a0e docs: update v1.51.2 post deploy canary log
```

### Step 2 - Modify Version Numbers

Modified files:

1. `frontend/src/App.tsx` — `const APP_VERSION = 'v1.51.3';`
2. `frontend/src/services/snapshotService.ts` — `const APP_VERSION = 'v1.51.3';`
3. `frontend/package.json` — `"version": "1.51.3"`
4. `frontend/package-lock.json` — `"version": "1.51.3"` (2 locations)
5. `README.md` — Added v1.51.x release notes

### Step 3 - Version Consistency Check

Command:

```powershell
grep -r "v1\.45\.0|1\.45\.0" frontend/src/App.tsx frontend/src/services/snapshotService.ts frontend/package.json frontend/package-lock.json
grep -r "v1\.51\.3|1\.51\.3" frontend/src/App.tsx frontend/src/services/snapshotService.ts frontend/package.json frontend/package-lock.json
```

Result:

```text
No v1.45.0 found ✅

v1.51.3 found in:
- frontend/src/App.tsx:const APP_VERSION = 'v1.51.3';
- frontend/src/services/snapshotService.ts:const APP_VERSION = 'v1.51.3';
- frontend/package.json:  "version": "1.51.3",
- frontend/package-lock.json:  "version": "1.51.3",
- frontend/package-lock.json:      "version": "1.51.3",
```

### Step 4 - Red-Line Check

Command:

```powershell
git diff --name-only -- firestore.rules
git diff --name-only -- frontend/src/core/calculationEngine.ts
git diff --name-only -- frontend/src/core/aiProviderAdapter.ts
```

Result:

```text
(empty - no changes to red-line files) ✅
```

### Step 5 - Automated Verification

Command:

```powershell
cd frontend
npm run test
npm run lint -- --quiet
npm run build
cd ..
node docs/demo/validate-demo-seed.mjs
```

Result:

```text
Test: 1430 tests passed, 58 test files ✅
Lint: 0 errors ✅
Build: built in 1.67s ✅
Seed validation: PASS (8/8 checks) ✅
```

### Step 6 - Diff Check

Command:

```powershell
git diff --stat
git diff --name-only
git status --short
```

Result:

```text
 README.md                                | 4 ++++
 frontend/package-lock.json               | 4 ++--
 frontend/package.json                    | 2 +-
 frontend/src/App.tsx                     | 2 +-
 frontend/src/services/snapshotService.ts | 2 +-
 5 files changed, 9 insertions(+), 5 deletions(-)

README.md
frontend/package-lock.json
frontend/package.json
frontend/src/App.tsx
frontend/src/services/snapshotService.ts
?? docs/release/V1_51_3_VERSION_SYNC_HOTFIX_COMMAND_LOG.md
```

Confirmed: Only version-related files modified.

### Step 7 - Commit

Command:

```powershell
git add frontend/src/App.tsx frontend/src/services/snapshotService.ts frontend/package.json frontend/package-lock.json README.md docs/release/V1_51_3_VERSION_SYNC_HOTFIX_COMMAND_LOG.md
git commit -m "chore: sync visible version for v1.51.3"
```

Result:

```text
(to be filled)
```

### Step 8 - Push Main

Command:

```powershell
git push origin main
```

Result:

```text
(to be filled)
```

### Step 9 - Deploy

Command:

```powershell
firebase deploy --only hosting
```

Result:

```text
(to be filled)
```

### Step 10 - Post-Deploy Version Check

(to be filled)

## 5. Final Conclusion

```text
Modified files: 5 (App.tsx, snapshotService.ts, package.json, package-lock.json, README.md)
Version consistency: PASS (no v1.45.0 found, v1.51.3 confirmed)
Test/Lint/Build: PASS (1430 tests, 0 lint errors, build 1.67s)
Commit hash: (to be filled)
Push status: (to be filled)
Deploy URL: (to be filled)
Post-deploy version check: (to be filled)
Hotfix required: (to be filled)
```
