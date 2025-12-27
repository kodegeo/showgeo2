import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/index.css";

import "@livekit/components-styles";


console.log("🔥 main.tsx loaded");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx or 5xx errors (client/server errors)
        if (error?.response?.status >= 400) {
          return false;
        }
        // Only retry network errors, max 1 time
        return failureCount < 1;
      },
      retryOnMount: false, // Don't retry when component remounts
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

