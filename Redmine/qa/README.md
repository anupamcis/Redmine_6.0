# Redmine QA Harness (Playwright)

This folder is isolated from the Rails app. It runs browser tests and pushes Pass/Fail to Redmine via REST.

## Prerequisites
- Node 18+
- Playwright browsers deps (Ubuntu):
  ```bash
  sudo npx playwright install-deps
  ```

## Setup
```bash
awk 1 .env.example > .env || true
# edit .env: REDMINE_BASE_URL, REDMINE_API_KEY, ADMIN creds, REDMINE_CF_STATUS_ID
# map Test Case IDs to Redmine issue IDs in case-map.json (replace 0s)
```

## Run
```bash
npx playwright test
npx playwright show-report
```

## Notes
- No changes are made to Rails app; all files live under qa/.
- Each test calls `updateRedmineResult(TestCaseID, "Pass"|"Fail")`.
- Use a custom field (list: Pass/Fail/Blocked) with id = REDMINE_CF_STATUS_ID on the mapped issues.
