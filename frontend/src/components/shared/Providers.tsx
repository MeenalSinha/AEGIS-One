"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:       12_000,
          refetchInterval: 20_000,
          retry:           2,
          retryDelay:      (n) => Math.min(1000 * 2 ** n, 8000),
        },
      },
    })
  );

  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:  "var(--card-bg2)",
            color:       "#e2e8f0",
            border:      "1px solid rgba(0,255,136,0.18)",
            fontFamily:  "'Inter', sans-serif",
            fontSize:    "13px",
            borderRadius:"8px",
            boxShadow:   "0 8px 32px rgba(0,0,0,0.5)",
          },
          success: { iconTheme: { primary: "#00ff88", secondary: "#0a1520" } },
          error:   { iconTheme: { primary: "#ff6b6b", secondary: "#0a1520" } },
        }}
      />
    </QueryClientProvider>
  );
}
