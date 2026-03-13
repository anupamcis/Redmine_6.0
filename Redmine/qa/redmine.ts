import 'dotenv/config';

export async function updateRedmineResult(testCaseId: string, status: 'Pass'|'Fail', note?: string) {
  // dynamic import to allow plain JSON
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mapping = require('./case-map.json');
  const issueId = mapping?.[testCaseId];
  if (!issueId) {
    console.warn(`No mapping for ${testCaseId}; skipping result push`);
    return;
  }
  const base = process.env.REDMINE_BASE_URL as string;
  const apiKey = process.env.REDMINE_API_KEY as string;
  const cfId = Number(process.env.REDMINE_CF_STATUS_ID);

  await fetch(`${base}/issues/${issueId}.json`, {
    method: 'PUT',
    headers: {
      'X-Redmine-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      issue: {
        notes: note ? `[Auto QA] ${note}` : undefined,
        custom_fields: cfId ? [{ id: cfId, value: status }] : undefined
      }
    })
  });
}


