# Render deployment flow

This service runs the Node/Express backend and serves the React build from `public/react-build`.

## What Render should run

- Root directory: `perceptionX-node/perceptionX-node`
- Runtime: `Node`
- Build command: `npm install --legacy-peer-deps && npm run build`
- Start command: `npm start`

## Why there is no `dist`

The Vite build is configured to emit directly into `public/react-build`, which Express serves as the production frontend.

## Required environment variables

Set these in the Render web service:

- `NODE_ENV=production`
- `MONGO_URI=<your MongoDB Atlas connection string>`
- `CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>`
- `CLOUDINARY_API_KEY=<your Cloudinary API key>`
- `CLOUDINARY_API_SECRET=<your Cloudinary API secret>`
- `JWT_SECRET=<your JWT secret>`
- `PYTHON_API_URL=<your Python service URL>`
- `VITE_API_URL=<your Node service URL or custom domain>`
- `VITE_PYTHON_API_URL=<your Python service URL>`

## Recommended URL mapping

- `perceptionx.me` or `www.perceptionx.me` -> Node web service
- `api.perceptionx.me` -> same Node service if you want an API subdomain
- Python service URL -> separate Render service or the existing Render URL

## Local note

If Windows reports an `EPERM` error during build, the usual cause is a locked `client/node_modules` folder. The new build flow uses `npm install` instead of `npm ci`, which avoids the destructive cleanup step that was failing on this workspace.