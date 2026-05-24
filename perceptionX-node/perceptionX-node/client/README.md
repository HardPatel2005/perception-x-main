# PerceptionX React Client

This is the React frontend for PerceptionX, converted from EJS templates.

## Setup Instructions

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Development Mode

Run the React dev server (with Vite):

```bash
npm run dev
```

This will start the React app on `http://localhost:5173` with hot-reload.

**Note:** The Vite config proxies API requests to `http://localhost:3000` (your Express server).

### 3. Production Build

Build the React app for production:

```bash
npm run build
```

This creates optimized files in `../public/react-build/` which the Express server will serve.

### 4. Enable React in Express Server

Set the environment variable to use React:

```bash
# Windows PowerShell
$env:USE_REACT="true"

# Or add to .env file
USE_REACT=true
```

Or set `NODE_ENV=production` (React is enabled by default in production).

### 5. Run Both Servers

**Development:**
- Terminal 1: Express server (`npm start` in `perceptionX-node/`)
- Terminal 2: React dev server (`npm run dev` in `client/`)

**Production:**
- Build React: `npm run build` in `client/`
- Start Express: `npm start` in `perceptionX-node/`
- Express will serve the React build automatically

## Project Structure

```
client/
├── src/
│   ├── components/      # Reusable React components
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── FileDisplay.jsx
│   │   └── Analytics*.jsx
│   ├── pages/          # Page components
│   │   ├── Home.jsx
│   │   ├── Detect.jsx
│   │   ├── Result.jsx
│   │   └── Analytics.jsx
│   ├── hooks/          # Custom React hooks
│   │   ├── useSocket.js
│   │   └── useFileUpload.js
│   ├── App.jsx         # Main app with routing
│   └── main.jsx        # Entry point
├── public/             # Static assets (served by Express)
└── package.json
```

## Features

- ✅ React Router for client-side routing
- ✅ Socket.io integration for real-time updates
- ✅ File upload with progress tracking
- ✅ Analytics dashboard
- ✅ Responsive design
- ✅ Component-based architecture

## Migration Notes

- EJS templates converted to React components
- Server-side rendering replaced with client-side routing
- Socket.io client integrated
- All API endpoints remain the same
- CSS styles preserved from original design
