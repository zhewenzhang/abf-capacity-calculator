# v1.52.3 Enable Firebase Functions DeepSeek Runtime - Command Log

## Goal

Enable the server-managed DeepSeek AI assistant runtime after the Firebase project was upgraded to Blaze.

## Required Security Boundary

1. Do not write the DeepSeek API key into source code, docs, tests, logs, `.env`, browser storage, Firestore, or terminal output.
2. Store the key only in Firebase Secret Manager as `DEEPSEEK_API_KEY`.
3. The frontend must never see the DeepSeek key.
4. The AI proxy must only serve authenticated Firebase users.
5. Do not modify `firestore.rules`.
6. Do not modify `frontend/src/core/calculationEngine.ts`.
7. Do not modify business formulas or Firestore schema.

## Current Status

- Firebase active project: `abf-capacity-calculator`
- Functions build: PASS
- `DEEPSEEK_API_KEY` local environment variable: missing in the Codex execution process
- Firebase Secret Manager lookup: `DEEPSEEK_API_KEY` is not created yet
- Auth-only access design: present
  - Frontend requires `getAuth().currentUser`
  - Frontend sends Firebase ID token in `Authorization: Bearer <idToken>`
  - Backend verifies the token via `getAuth().verifyIdToken(idToken)`
  - Backend returns `401 UNAUTHENTICATED` without a valid token
- Deploy status: blocked until the operator creates the Firebase Secret

## Deployment Attempt Notes

- Firebase Secret `DEEPSEEK_API_KEY`: created and enabled as version `1`
- Functions build after Secret setup: PASS
- First Functions deploy: function appeared in `firebase functions:list`
- `/api/health` result after first deploy: HTTP 403
- Root cause: Gen2 HTTPS function ingress reached Cloud Run IAM before application auth. The function needs public invoker permission so browsers can reach the handler; `/api/ai-chat` remains protected by Firebase ID token verification inside `aiChatHandler`.
- Fix applied: set `invoker: 'public'` in `functions/src/index.ts`

## Operator Action Required

The API key must be entered by the project operator, not by the agent, so the key never appears in chat, files, command logs, or shell output.

Run this in a local PowerShell terminal from the repository root:

```powershell
firebase functions:secrets:set DEEPSEEK_API_KEY
```

When prompted:

```text
? Enter a value for DEEPSEEK_API_KEY:
```

Paste the DeepSeek API key directly into the terminal prompt. Do not paste it into this document or chat.

After the command succeeds, tell Codex: `Secret 已设置，可以继续部署`.

## Configuration Steps

### Step 1 - Set Firebase Secret interactively

Run this manually in PowerShell. Paste the key only into the Firebase CLI prompt.

```powershell
firebase functions:secrets:set DEEPSEEK_API_KEY
```

### Step 2 - Confirm the key exists in Firebase Secret Manager

Actual result:

- Secret created by operator through Firebase CLI prompt.
- Secret version: `projects/372856918949/secrets/DEEPSEEK_API_KEY/versions/1`
- Secret state: `ENABLED`

### Step 3 - Deploy Functions

```powershell
firebase deploy --only functions
```

Actual result:

- Function deployed: `api`
- Region: `asia-east1`
- Runtime: `nodejs20`
- Trigger: HTTPS
- Secret attached: `DEEPSEEK_API_KEY`, version `1`
- URL: `https://asia-east1-abf-capacity-calculator.cloudfunctions.net/api`
- Note: Firebase CLI returned a non-zero exit after a successful function deployment because no Artifact Registry cleanup policy existed yet.

Cleanup policy applied:

```powershell
firebase functions:artifacts:setpolicy --location asia-east1 --days 7 --force
```

Result:

- Cleanup policy set for `projects/abf-capacity-calculator/locations/asia-east1/repositories/gcf-artifacts`
- Images older than 7 days will be deleted.

### Step 4 - Deploy Hosting if frontend build changed

```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### Step 5 - Post-deploy checks

```powershell
Invoke-WebRequest -Uri "https://asia-east1-abf-capacity-calculator.cloudfunctions.net/api/health" -UseBasicParsing
Invoke-WebRequest -Uri "https://abf-capacity-calculator.web.app/copilot" -UseBasicParsing
```

Expected:

- `/api/health` returns HTTP 200 and JSON status.
- `/copilot` returns HTTP 200.
- Unauthenticated `/api/ai-chat` POST must return HTTP 401.
- Logged-in Copilot chat should answer through the managed DeepSeek proxy.

Actual result:

- `/api/health`: HTTP 200, JSON `{"status":"ok","version":"1.52.0",...}`
- Unauthenticated `/api/ai-chat` POST: HTTP 401 Unauthorized
- `/copilot`: HTTP 200
- Authenticated browser AI smoke: pending user/browser login validation

Version metadata sync:

- `functions/package.json`: `1.52.3`
- `functions/package-lock.json`: `1.52.3`
- `/api/health` version response target: `1.52.3`

## Final Result

Firebase Secret is configured, Functions are deployed, public ingress reaches the handler, and unauthenticated AI calls are blocked by the application auth guard. The managed DeepSeek proxy is ready for logged-in user validation in the browser.
