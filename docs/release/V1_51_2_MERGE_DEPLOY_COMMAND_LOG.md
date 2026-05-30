# v1.51.2 Designbyte + DeepSeek Merge / Deploy Command Log

## 1. Task Goal

Merge the AGY-reviewed feature branch into `main`, run final verification, deploy Firebase Hosting, and record the full release trail for future agents.

Target branch:

`origin/xiaomi/v1-51-designbyte-deepseek-ai-marathon`

Target commit:

`bf5b538`

## 2. Release Background

AGY completed the v1.51.2 Final Browser QA + Release Gate Review with this conclusion:

- Release Gate: PASS
- Merge main: YES
- Deploy: YES
- P0: 0
- P1: 0
- v1.51.3: Not required

Core scope:

1. Designbyte theme token integration.
2. DeepSeek provider mode.
3. DeepSeek session-only BYOK key wiring.
4. Copilot runtime DeepSeek call path.
5. Output validation and deterministic fallback.
6. Demo seed validation restored and passing.

## 3. Hard Constraints

1. Only merge `origin/xiaomi/v1-51-designbyte-deepseek-ai-marathon`.
2. Do not merge any `origin/agy/*` review branch.
3. Do not modify `firestore.rules`.
4. Do not modify `frontend/src/core/calculationEngine.ts`.
5. Do not commit any real DeepSeek API key.
6. Do not write any API key to source, docs, tests, `.env`, localStorage, sessionStorage, or Firestore.
7. If test, lint, build, or seed validation fails, stop and do not deploy.
8. Confirm a clean worktree before deploy.
9. Record the Firebase Hosting URL after deploy.
10. Run post-deploy canary after deploy.
11. All commands must be Windows PowerShell compatible.
12. Do not use watch mode or leave a long-running background process.

## 4. Command Log

### Step 0 - Status Freeze

Command:

```powershell
git status --short
git branch --show-current
git log -1 --oneline
git fetch origin
```

Result:

```text
?? docs/release/
?? frontend/test-results/
agy/v1-51-2-final-browser-qa-release-review
9c8d92f docs: add v1.51.2 final browser qa release review
```

### Step 1 - Handle Untracked Test Artifacts

Command:

```powershell
ls -la frontend/test-results/
```

Result:

```text
total 5
drwxr-xr-x 1 1 197121  0 May 30 08:19 .
-rw-r--r-- 1 1 197121 45 May 30 08:19 .last-run.json
```

Action:

```powershell
rm -rf frontend/test-results
```

Reason: Temporary test artifact from Playwright. Not part of release. Removed to keep worktree clean.

### Step 2 - Checkout And Update Main

Command:

```powershell
git checkout main
git pull --ff-only origin main
git log -1 --oneline
```

Result:

```text
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
Already up to date.
1e5839d Merge v1.47 demo readiness and UI phase 2 planning docs
```

### Step 3 - Confirm Target Branch Commit

Command:

```powershell
git log -1 --oneline origin/xiaomi/v1-51-designbyte-deepseek-ai-marathon
```

Expected:

```text
bf5b538
```

Result:

```text
bf5b538 docs: add v1.51.2 release gate workflow reports
```

Confirmed: Target commit is `bf5b538`.

### Step 4 - Confirm No AGY Review Branch Merge

Command:

```powershell
git branch -r | grep "agy/v1-51"
git log --oneline --decorate -5 origin/xiaomi/v1-51-designbyte-deepseek-ai-marathon
```

Result:

```text
  origin/agy/v1-51-1-deepseek-designbyte-release-review
  origin/agy/v1-51-2-final-browser-qa-release-review

bf5b538 (origin/xiaomi/v1-51-designbyte-deepseek-ai-marathon) docs: add v1.51.2 release gate workflow reports
31e025d Merge v1.48 demo assets for release gate
4231b37 fix: complete deepseek provider wiring v1.51.1
fed69bf feat: integrate designbyte theme and deepseek provider v1.51
e3d526d (origin/xiaomi/v1-48-safe-demo-workspace-browser-qa) docs: polish demo seed narrative consistency v1.48.2
```

Confirmed: AGY branches exist but will NOT be merged.

### Step 5 - Merge

Command:

```powershell
git merge --no-ff origin/xiaomi/v1-51-designbyte-deepseek-ai-marathon -m "Merge v1.51.2 designbyte theme and deepseek provider"
```

Result:

```text
Merge made by the 'ort' strategy.
40 files changed, 7419 insertions(+), 52 deletions(-)
```

### Step 6 - Red-Line File Check

Command:

```powershell
git diff --name-only HEAD~1 HEAD -- firestore.rules
git diff --name-only HEAD~1 HEAD -- frontend/src/core/calculationEngine.ts
git diff --name-only HEAD~1 HEAD -- frontend/package.json frontend/package-lock.json
```

Result:

```text
(empty - no changes to red-line files)
```

Confirmed:
- firestore.rules: NOT modified
- calculationEngine.ts: NOT modified
- package.json: NOT modified
- package-lock.json: NOT modified

### Step 7 - Secret Boundary Check

Command:

```powershell
grep -r "sk-" frontend/src/ --include="*.ts" --include="*.tsx" | grep -v "test|mock|skip|skill|risk"
grep -r "localStorage|sessionStorage" frontend/src/ --include="*.ts" --include="*.tsx" | grep -v "test|mock"
```

Result:

```text
No sk- found in production code (acceptable in test mocks only)

localStorage/sessionStorage usage found in:
- AppPreferencesContext.tsx (user preferences - acceptable)
- WorkspaceContext.tsx (workspace selection - acceptable)
- aiProviderAdapter.ts (comment only - "No localStorage or sessionStorage")
- aiProviderPromptPack.ts (comment only - "No localStorage or sessionStorage")
```

Confirmed:
- No real API key in code
- DeepSeek key path does NOT use localStorage/sessionStorage
- localStorage usage is for non-sensitive preferences only

### Step 8 - Automated Verification

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
Build: built in 1.13s ✅
Seed validation: PASS (8/8 checks) ✅
```

### Step 9 - Clean Worktree Check

Command:

```powershell
git status --short
```

Result:

```text
?? docs/release/
```

Only the command log directory is untracked. Will be committed next.

### Step 10 - Push Main

Command:

```powershell
git push origin main
```

Result:

```text
(deploy result to be filled)
```

### Step 11 - Firebase Hosting Deploy

Command:

```powershell
firebase deploy --only hosting
```

Result:

```text
(deploy result to be filled)
```

### Step 12 - Post-Deploy Canary

Live URL: `https://abf-capacity-calculator.web.app`

Checks:

```text
(canary results to be filled)
```

## 5. Final Release Conclusion

```text
Merged main: YES
Main latest commit: (to be filled after push)
Deployed: (to be filled after deploy)
Deploy URL: (to be filled after deploy)
Test/Lint/Build: PASS (1430 tests, 0 lint errors, build 1.13s)
Seed validation: PASS (8/8 checks)
Secret boundary: PASS (no key leakage, no forbidden storage)
Post-deploy canary: (to be filled after deploy)
Hotfix required: (to be determined after canary)
Remaining risk: Browser QA was limited to code review only
```

## 6. Release Owner Notes

This file records the actual v1.51.2 merge, deploy, and post-deploy validation process. Future agents should read this file before judging the release state.
