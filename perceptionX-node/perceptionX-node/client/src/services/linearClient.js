import { buildHttpUrl, getNodeApiBaseUrl } from '../utils/runtimeConfig';

const LINEAR_PROXY_PATH = '/api/linear/graphql';

export const linearQuery = async (query, variables = {}, authToken) => {
  if (!query || typeof query !== 'string') {
    throw new Error('A GraphQL query string is required.');
  }

  const response = await fetch(buildHttpUrl(getNodeApiBaseUrl(), LINEAR_PROXY_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Linear proxy request failed.');
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0].message || 'Linear GraphQL returned an error.');
  }

  return payload.data;
};

export const viewerQuery = `
  query Viewer {
    viewer {
      id
      name
      email
    }
  }
`;
