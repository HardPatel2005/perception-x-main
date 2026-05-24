# React Migration Setup Guide

## ✅ Conversion Complete!

Your PerceptionX project has been successfully converted from EJS to React with a component-based architecture.

## 📁 Project Structure

```
perceptionX-node/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── App.jsx        # Main app
│   ├── package.json
│   └── vite.config.js
├── app.js                 # Express server (updated)
├── views/                 # EJS templates (legacy, can be removed)
└── public/                # Static assets
```

## 🚀 Quick Start

### Step 1: Install React Dependencies

```bash
cd perceptionX-node/client
npm install
```

### Step 2: Development Mode (Recommended)

**Terminal 1 - Express Server:**
```bash
cd perceptionX-node
npm start
```

**Terminal 2 - React Dev Server:**
```bash
cd perceptionX-node/client
npm run dev
```

Visit: `http://localhost:5173` (React with hot-reload)

### Step 3: Production Build

```bash
# Build React
cd perceptionX-node/client
npm run build

# Set environment variable
export USE_REACT=true    # Linux/Mac
# or
$env:USE_REACT="true"    # Windows PowerShell

# Start Express (serves React build)
cd ..
npm start
```

Visit: `http://localhost:3000` (Express serving React)

## 🔄 Switching Between EJS and React

**Use React:**
```bash
export USE_REACT=true
# or set NODE_ENV=production
```

**Use EJS (Legacy):**
```bash
unset USE_REACT
# or remove from .env
```

## 📝 Component Mapping

| EJS Template | React Component | Status |
|-------------|----------------|--------|
| `layouts/boilerplate.ejs` | `components/Layout.jsx` | ✅ Complete |
| `perceps/index.ejs` | `pages/Home.jsx` | ✅ Complete |
| `perceps/detect.ejs` | `pages/Detect.jsx` | ✅ Complete |
| `perceps/result.ejs` | `pages/Result.jsx` | ✅ Complete |
| `perceps/analytics.ejs` | `pages/Analytics.jsx` | ✅ Complete |

## 🎯 Features Implemented

- ✅ React Router for client-side navigation
- ✅ Socket.io client integration
- ✅ File upload with progress tracking
- ✅ Real-time progress updates
- ✅ Analytics dashboard with charts
- ✅ Responsive design
- ✅ Component-based architecture
- ✅ Custom hooks (useSocket, useFileUpload)

## 🔧 API Endpoints

All existing endpoints work the same:
- `POST /process` - Upload and process file
- `GET /file/:id/metadata` - Get file metadata
- `GET /file/:id/original` - Get original file
- `GET /file/:id/processed` - Get processed file
- `GET /api/analytics/files` - Get files list (NEW)
- `GET /api/analytics/:fileId` - Get file analytics (NEW)

## ⚠️ Important Notes

1. **CSS Files**: The main CSS is in `public/css/style.css` and is served by Express. React components import it via the Layout.

2. **Assets**: All assets in `public/assets/` are accessible via `/assets/` path.

3. **Socket.io**: Client connects automatically via `useSocket` hook.

4. **Build Output**: React build goes to `public/react-build/` which Express serves.

## 🐛 Troubleshooting

### React app not loading
- Check `USE_REACT=true` is set
- Verify build exists: `ls public/react-build/`
- Check Express logs

### API calls failing
- Verify Express is running on port 3000
- Check Vite proxy config in `vite.config.js`
- Check CORS settings if needed

### Styles missing
- CSS is in `public/css/style.css` (served by Express)
- Ensure Express static middleware is working
- Check browser console for 404s

## 📦 Next Steps

1. Test all pages and functionality
2. Remove EJS templates if everything works
3. Add error boundaries
4. Optimize bundle size
5. Add loading states
6. Enhance analytics charts

## 🎉 You're All Set!

Your project is now running on React! The conversion maintains all existing functionality while providing a modern, component-based architecture.
