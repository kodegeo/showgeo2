# Localhost Stability Recommendations

## Current Issues Identified

1. **Aggressive Polling**: `useStreaming` polls every 4 seconds when session is inactive
2. **No Backend Health Check**: Requests fail silently when backend is down
3. **WebSocket Connection Attempts**: `useNotificationsSocket` tries to connect even if backend is unavailable
4. **Multiple Refetch Intervals**: Notifications and events refetch every 30 seconds
5. **React StrictMode**: Causes double renders in development (expected behavior, but can cause confusion)

## Recommended Fixes (Non-Breaking for Production)

### 1. Add Environment Detection Helper

Create `frontend/src/utils/env.ts`:
```typescript
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
```

### 2. Make Polling Conditional on Backend Availability

**File**: `frontend/src/hooks/useStreaming.ts`

Add backend health check before polling:
```typescript
const [backendAvailable, setBackendAvailable] = useState(true);

// Check backend health before polling
useEffect(() => {
  if (streamSession?.active === true) return;
  
  const checkBackend = async () => {
    try {
      const res = await fetch('/api/health', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(2000) // 2s timeout
      });
      setBackendAvailable(res.ok);
    } catch {
      setBackendAvailable(false);
    }
  };
  
  checkBackend();
  const interval = setInterval(checkBackend, 10000); // Check every 10s
  return () => clearInterval(interval);
}, [streamSession?.active]);

// Only poll if backend is available
useEffect(() => {
  if (streamSession?.active === true || !backendAvailable) return;
  
  const pollInterval = setInterval(() => {
    fetchSession();
  }, isDevelopment ? 8000 : 4000); // Slower polling in dev
  
  return () => clearInterval(pollInterval);
}, [streamSession?.active, backendAvailable, fetchSession]);
```

### 3. Add Request Timeout and Better Error Handling

**File**: `frontend/src/services/api.ts`

Add timeout and better error messages:
```typescript
export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: isDevelopment ? 10000 : 15000, // Longer timeout in dev
});

// Add request interceptor for better error messages
apiClient.interceptors.request.use(
  async (config) => {
    // ... existing code ...
    return config;
  },
  (error) => {
    if (isDevelopment) {
      console.error('[apiClient] Request error:', error);
    }
    return Promise.reject(error);
  },
);

// Improve response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    // Network errors (backend down)
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      if (isDevelopment) {
        console.warn('[apiClient] Backend appears to be unavailable');
      }
      // Don't redirect on network errors, just reject
      return Promise.reject(new Error('Backend unavailable. Is the server running?'));
    }
    
    // ... existing 401 handling ...
  },
);
```

### 4. Make WebSocket Connection Resilient

**File**: `frontend/src/hooks/useNotifications.ts`

Add connection retry logic:
```typescript
const WS_URL = import.meta.env.VITE_WS_URL || (isDevelopment ? "ws://localhost:3000" : "");

export function useNotificationsSocket() {
  // ... existing state ...
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = isDevelopment ? 3 : 5;

  useEffect(() => {
    // Skip WebSocket in development if backend URL not configured
    if (isDevelopment && !WS_URL) {
      console.warn('[useNotificationsSocket] WebSocket URL not configured, skipping');
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      const newSocket = io(`${WS_URL}/notifications`, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: maxRetries,
      });

      newSocket.on("connect", () => {
        setIsConnected(true);
        setRetryCount(0);
        console.log("Connected to notifications WebSocket");
      });

      newSocket.on("disconnect", (reason) => {
        setIsConnected(false);
        console.log("Disconnected from notifications WebSocket:", reason);
        
        // Only retry in development if backend is likely available
        if (isDevelopment && retryCount < maxRetries && reason !== "io server disconnect") {
          reconnectTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, 2000);
        }
      });

      // ... rest of socket handlers ...
      
      setSocket(newSocket);
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [retryCount, maxRetries]);
  
  // ... rest of hook ...
}
```

### 5. Reduce Polling Frequency in Development

**File**: `frontend/src/hooks/useNotifications.ts` and `useEvents.ts`

```typescript
// In useUnreadCount
refetchInterval: isDevelopment ? 60000 : 30000, // 60s in dev, 30s in prod

// In useEventMetrics
refetchInterval: isDevelopment ? 60000 : 30000,
```

### 6. Add Development-Only Backend Health Indicator

**File**: `frontend/src/components/DevBackendStatus.tsx` (new file)

```typescript
import { useEffect, useState } from 'react';
import { isDevelopment } from '@/utils/env';

export function DevBackendStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    if (!isDevelopment) return;

    const check = async () => {
      try {
        const res = await fetch('/api/health', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(2000)
        });
        setStatus(res.ok ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isDevelopment) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg text-xs font-mono bg-black/80 border">
      <span className={status === 'online' ? 'text-green-400' : 'text-red-400'}>
        ●
      </span>
      {' '}
      Backend: {status}
    </div>
  );
}
```

Add to `App.tsx`:
```typescript
import { DevBackendStatus } from '@/components/DevBackendStatus';

// In App component
{isDevelopment && <DevBackendStatus />}
```

### 7. Add Backend Health Endpoint (Backend)

**File**: `backend/src/modules/health/health.controller.ts` (new)

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

## Implementation Priority

1. **High Priority** (Immediate stability):
   - Add request timeouts (#3)
   - Make polling conditional (#2)
   - Reduce polling frequency in dev (#5)

2. **Medium Priority** (Better UX):
   - WebSocket resilience (#4)
   - Backend health indicator (#6)

3. **Low Priority** (Nice to have):
   - Backend health endpoint (#7)

## Testing Checklist

After implementing:
- [ ] Frontend works when backend is running
- [ ] Frontend gracefully handles backend being down
- [ ] No console spam when backend is unavailable
- [ ] Polling stops when backend is down
- [ ] WebSocket doesn't spam connection attempts
- [ ] Production behavior unchanged

## Notes

- All changes use `isDevelopment` checks to ensure production is unaffected
- Polling intervals are increased in development to reduce load
- Error messages are more helpful in development
- Backend health checks prevent unnecessary requests

