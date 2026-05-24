# React Migration Guide

## Overview

The PerceptionX project has been converted from EJS templates to React with component-based architecture.

## What Changed

### Frontend
- **Before:** EJS templates with server-side rendering
- **After:** React SPA (Single Page Application) with client-side routing

### Structure
- **Before:** `views/` directory with `.ejs` files
- **After:** `client/src/` with React components

### Routing
- **Before:** Express routes rendering EJS templates
- **After:** React Router handling client-side navigation

## Setup Steps

### Step 1: Install React Dependencies

```bash
cd perceptionX-node/client
npm install
```

### Step 2: Development Mode

**Option A: Use React Dev Server (Recommended for development)**
```bash
# Terminal 1: Start Express server
cd perceptionX-node
npm start

# Terminal 2: Start React dev server
cd perceptionX-node/client
npm run dev
```

Visit `http://localhost:5173` for React app (with hot-reload)

**Option B: Use Express with React Build (Production-like)**
```bash
# Build React first
cd perceptionX-node/client
npm run build

# Set environment variable
$env:USE_REACT="true"  # PowerShell
# or
export USE_REACT=true  # Bash

# Start Express (will serve React build)
cd perceptionX-node
npm start
```

Visit `http://localhost:3000` for the app

### Step 3: Verify Everything Works

1. ✅ Home page loads
2. ✅ Navigation works
3. ✅ File upload works
4. ✅ Progress tracking works
5. ✅ Results page displays files
6. ✅ Analytics page loads

## Component Mapping

| EJS Template | React Component |
|-------------|----------------|
| `layouts/boilerplate.ejs` | `components/Layout.jsx` |
| `perceps/index.ejs` | `pages/Home.jsx` |
| `perceps/detect.ejs` | `pages/Detect.jsx` |
| `perceps/result.ejs` | `pages/Result.jsx` |
| `perceps/analytics.ejs` | `pages/Analytics.jsx` |

## API Endpoints

All existing API endpoints remain the same:
- `POST /process` - File upload
- `GET /file/:id/metadata` - File metadata
- `GET /file/:id/original` - Original file
- `GET /file/:id/processed` - Processed file
- `GET /api/analytics/files` - Files list (new)
- `GET /api/analytics/:fileId` - File analytics (new)

## Environment Variables

Add to `.env`:
```
USE_REACT=true          # Enable React (or set NODE_ENV=production)
PORT=3000               # Express server port
```

## Troubleshooting

### React app not loading
- Check if `USE_REACT=true` is set
- Verify React build exists: `public/react-build/index.html`
- Check Express logs for errors

### API calls failing
- Verify Express server is running on port 3000
- Check CORS settings if needed
- Verify proxy settings in `vite.config.js`

### Styles not loading
- CSS is served from `public/css/style.css` (Express static)
- Ensure Express static middleware is configured
- Check browser console for 404 errors

## Rollback to EJS

If you need to rollback:
1. Remove `USE_REACT=true` from `.env`
2. Restart Express server
3. EJS templates will be used again

## Next Steps

1. ✅ Basic React structure created
2. ✅ Components converted
3. ✅ Routing set up
4. ✅ Socket.io integrated
5. ⏳ Complete Analytics component (in progress)
6. ⏳ Add error boundaries
7. ⏳ Add loading states
8. ⏳ Optimize bundle size
