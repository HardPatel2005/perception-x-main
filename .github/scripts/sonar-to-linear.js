const SONAR_HOST_URL = process.env.SONAR_HOST_URL || 'https://sonarcloud.io';
const SONAR_ORG = process.env.SONAR_ORG;
const SONAR_PROJECT_KEY = process.env.SONAR_PROJECT_KEY;
const SONAR_BRANCH = process.env.SONAR_BRANCH || 'main';
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID;

const OPEN_SONAR_STATUSES = ['OPEN', 'CONFIRMED', 'REOPENED'];
const SEVERITIES = ['BLOCKER', 'CRITICAL', 'HIGH'];
const SONAR_MARKER_PREFIX = 'SonarCloud issue key:';
const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';

function requireEnv(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toBasicAuth(token) {
  return Buffer.from(`${token}:`).toString('base64');
}

function sonarIssueUrl(issueKey) {
  const url = new URL('/project/issues', SONAR_HOST_URL);
  url.searchParams.set('id', SONAR_PROJECT_KEY);
  url.searchParams.set('open', issueKey);
  return url.toString();
}

function normalizeComponent(component) {
  if (!component || typeof component !== 'string') {
    return 'unknown-file';
  }

  return component.includes(':') ? component.split(':').slice(1).join(':') : component;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Unexpected response from ${url}: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.errors?.[0]?.message || `Request failed for ${url}`);
  }

  return payload;
}

async function fetchSonarIssues() {
  const issues = [];
  let page = 1;
  let total = Infinity;

  while (issues.length < total) {
    const url = new URL('/api/issues/search', SONAR_HOST_URL);
    url.searchParams.set('organization', SONAR_ORG);
    url.searchParams.set('componentKeys', SONAR_PROJECT_KEY);
    url.searchParams.set('branch', SONAR_BRANCH);
    url.searchParams.set('statuses', OPEN_SONAR_STATUSES.join(','));
    url.searchParams.set('severities', SEVERITIES.join(','));
    url.searchParams.set('ps', '100');
    url.searchParams.set('p', String(page));

    const payload = await fetchJson(url, {
      headers: {
        Authorization: `Basic ${toBasicAuth(SONAR_TOKEN)}`,
      },
    });

    issues.push(...(payload.issues || []));
    total = typeof payload.total === 'number' ? payload.total : issues.length;

    if (!payload.issues?.length) {
      break;
    }

    page += 1;
  }

  return issues;
}

async function linearGraphql(query, variables = {}) {
  const payload = await fetchJson(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || 'Linear GraphQL returned an error');
  }

  return payload.data;
}

async function fetchLinearIssues() {
  const issues = [];
  let cursor = null;
  let hasNextPage = true;

  const query = `
    query TeamIssues($first: Int!, $after: String) {
      issues(first: $first, after: $after) {
        nodes {
          id
          identifier
          title
          description
          state {
            type
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  while (hasNextPage) {
    const data = await linearGraphql(query, {
      first: 100,
      after: cursor,
    });

    const page = data?.issues;
    issues.push(...(page?.nodes || []));
    hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
    cursor = page?.pageInfo?.endCursor || null;

    if (!page?.nodes?.length) {
      break;
    }
  }

  return issues;
}

async function createLinearIssue(issue) {
  const title = `[SonarCloud] ${issue.severity} ${issue.rule} in ${normalizeComponent(issue.component)}`;
  const description = [
    `Issue key: ${issue.key}`,
    `Severity: ${issue.severity}`,
    `Rule: ${issue.rule}`,
    `Status: ${issue.status}`,
    `Type: ${issue.type || 'unknown'}`,
    `Component: ${normalizeComponent(issue.component)}`,
    issue.line ? `Line: ${issue.line}` : null,
    `Message: ${issue.message}`,
    `SonarCloud URL: ${sonarIssueUrl(issue.key)}`,
    '',
    'Created automatically by the SonarCloud to Linear workflow.',
    `Marker: ${SONAR_MARKER_PREFIX} ${issue.key}`,
  ]
    .filter(Boolean)
    .join('\n');

  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
          title
        }
      }
    }
  `;

  const data = await linearGraphql(mutation, {
    input: {
      teamId: LINEAR_TEAM_ID,
      title,
      description,
    },
  });

  return data.issueCreate.issue;
}

async function main() {
  requireEnv(SONAR_ORG, 'SONAR_ORG');
  requireEnv(SONAR_PROJECT_KEY, 'SONAR_PROJECT_KEY');
  requireEnv(SONAR_TOKEN, 'SONAR_TOKEN');
  requireEnv(LINEAR_API_KEY, 'LINEAR_API_KEY');
  requireEnv(LINEAR_TEAM_ID, 'LINEAR_TEAM_ID');

  const [sonarIssues, linearIssues] = await Promise.all([
    fetchSonarIssues(),
    fetchLinearIssues(),
  ]);

  const existingIssueKeys = new Set(
    linearIssues
      .map((issue) => issue.description || '')
      .flatMap((description) => {
        const markerLine = description
          .split('\n')
          .find((line) => line.startsWith(`${SONAR_MARKER_PREFIX} `));

        return markerLine ? [markerLine.slice(`${SONAR_MARKER_PREFIX} `.length)] : [];
      }),
  );

  const createdIssues = [];
  const skippedIssues = [];

  for (const issue of sonarIssues) {
    if (existingIssueKeys.has(issue.key)) {
      skippedIssues.push(issue.key);
      continue;
    }

    const created = await createLinearIssue(issue);
    createdIssues.push({
      sonarKey: issue.key,
      linearIdentifier: created.identifier,
      linearUrl: created.url,
    });
    existingIssueKeys.add(issue.key);
  }

  console.log({
    event: 'sonar_linear_sync_complete',
    sonarIssues: sonarIssues.length,
    createdIssues: createdIssues.length,
    skippedIssues: skippedIssues.length,
  });

  if (createdIssues.length) {
    console.log({ event: 'linear_issues_created', createdIssues });
  }
}

main().catch((error) => {
  console.error({
    event: 'sonar_linear_sync_failed',
    message: error.message,
  });
  process.exitCode = 1;
});
