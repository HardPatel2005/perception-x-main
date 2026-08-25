# Linear + GraphQL Integration (PerceptionX)

## Why this setup
- Keep `LINEAR_API_KEY` on backend only.
- Frontend calls your backend proxy at `/api/linear/graphql`.
- You can use plain fetch now, then add TanStack or Apollo later.

## 1) Required env vars
- `LINEAR_API_KEY` (backend)
- `VITE_FORCE_MODAL_GPU` (frontend runtime switch)
- `VITE_MODAL_API_URL` (Modal API base URL)

## 2) Endpoint added
- `POST /api/linear/graphql`
- File: `routes/linear.js`
- Protected by JWT middleware (`authenticate`)

Request body:
```json
{
  "query": "query Viewer { viewer { id name email } }",
  "variables": {}
}
```

## 3) Frontend SDK wrapper
Use `client/src/services/linearClient.js`:

```js
import { linearQuery, viewerQuery } from './services/linearClient';

const data = await linearQuery(viewerQuery, {}, token);
console.log(data.viewer.name);
```

## 4) TanStack vs Apollo
- Use TanStack if your app is mostly REST and only some GraphQL calls.
- Use Apollo if your app is GraphQL-first and you need advanced GraphQL cache features.

### TanStack example
```js
import { useQuery } from '@tanstack/react-query';
import { linearQuery, viewerQuery } from '../services/linearClient';

export function useLinearViewer(token) {
  return useQuery({
    queryKey: ['linear', 'viewer'],
    queryFn: () => linearQuery(viewerQuery, {}, token),
  });
}
```

### Apollo example
Apollo requires a GraphQL endpoint URL. In this project, point Apollo to your backend proxy endpoint:
- `/api/linear/graphql`

Do not point Apollo directly to `https://api.linear.app/graphql` from browser because that exposes key handling and CORS/auth complexity.

## 5) Modal always-on from frontend
Set:
- `VITE_FORCE_MODAL_GPU=true`
- `VITE_MODAL_API_URL=https://<your-modal-endpoint>`

Then `getPythonApiBaseUrl()` in `runtimeConfig.js` will prefer Modal URL first.
