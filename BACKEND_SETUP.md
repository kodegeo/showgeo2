# Backend Setup Instructions

## Issue: Connection Refused Error

If you're getting `ERR_CONNECTION_REFUSED` when trying to create an account, the backend server is not running or not accessible.

## Quick Start

### 1. Start the Backend Server

In a terminal, navigate to the backend directory and start the server:

```bash
cd backend
npm run start:dev
```

The server should start on `http://localhost:3000` and you should see:
```
Application is running on: http://localhost:3000
Swagger docs available at: http://localhost:3000/api/docs
```

### 2. Verify Backend is Running

Open your browser and go to:
- http://localhost:3000/api/docs (Swagger documentation)
- Or test an endpoint: http://localhost:3000/api/health (if health endpoint exists)

### 3. Check Environment Variables

The backend needs a `.env` file with at least:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token generation
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `PORT` - Port number (defaults to 3000)
- `FRONTEND_URL` - Frontend URL for CORS (defaults to http://localhost:5173)

Example `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/showgeo?schema=public"
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
JWT_EXPIRATION="1h"
JWT_REFRESH_EXPIRATION="7d"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### 4. Set Up Database

Before starting the backend, ensure PostgreSQL is running and the database exists:

```bash
# Generate Prisma client
cd backend
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 5. Start Both Servers

You need both frontend and backend running:

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Troubleshooting

### Backend won't start

1. **Check if port 3000 is already in use:**
   ```bash
   lsof -ti:3000
   # If it returns a PID, kill the process:
   kill -9 <PID>
   ```

2. **Check database connection:**
   - Ensure PostgreSQL is running
   - Verify `DATABASE_URL` in `.env` is correct
   - Check database exists and is accessible

3. **Check logs:**
   - Look at the terminal output for error messages
   - Common issues: missing environment variables, database connection errors, port conflicts

### Connection Refused Error

This means:
- Backend server is not running
- Backend is running on a different port
- Frontend is trying to connect to wrong URL

**Solution:**
1. Ensure backend is running: `cd backend && npm run start:dev`
2. Check frontend `.env` or `VITE_API_URL` points to correct backend URL
3. Verify CORS is configured correctly in backend

### React Router Warnings

The React Router future flag warnings are now fixed in `main.tsx`. These were just warnings about upcoming React Router v7 changes and don't affect functionality.

## Next Steps

Once the backend is running:
1. Verify it's accessible at http://localhost:3000/api/docs
2. Try registering a new account from the frontend
3. Check backend logs for any errors













