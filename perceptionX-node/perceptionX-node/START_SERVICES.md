# Starting All Services

## Required Services

You need **3 services** running simultaneously:

### 1. Python Service (Port 8001)
```bash
cd perceptionX-python
python app.py
# or
python -m uvicorn app:app --host 0.0.0.0 --port 8001
```

### 2. Node.js Backend (Port 3000)
```bash
cd perceptionX-node
node app.js
```

### 3. React Frontend (Port 5173)
```bash
cd perceptionX-node/client
npm run dev
```

## Error Fixes

### Error: `ECONNREFUSED ::1:8001` or `127.0.0.1:8001`
**Cause**: Python service is not running
**Fix**: Start the Python service (see #1 above)

### Error: `ECONNREFUSED` on port 3000
**Cause**: Node.js backend is not running
**Fix**: Start the Node.js backend (see #2 above)

### Error: Socket.io connection errors
**Cause**: Backend server disconnected or not running
**Fix**: 
1. Make sure backend (port 3000) is running
2. Restart the React dev server after backend is running

## Startup Order

1. **First**: Start Python service (port 8001)
2. **Second**: Start Node.js backend (port 3000)
3. **Third**: Start React frontend (port 5173)

## Verify Services Are Running

- Python: Open http://localhost:8001/docs (should show FastAPI docs)
- Node.js: Open http://localhost:3000 (should show app or API response)
- React: Open http://localhost:5173 (should show React app)

## Common Issues

### FileId mismatch in logs
- This is just a console.log display issue
- The actual fileId sent to Python is correct (check the payload data in the error)
- Restart Node.js server to clear any cached ObjectId references

### Processing fails but file uploads
- File uploads successfully to Cloudinary/MongoDB
- Processing fails because Python service isn't running
- Start Python service and files will process on next upload
