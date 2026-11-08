import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { App } from "@/App";
import { AuthProvider } from "@/features/auth/AuthContext";
import { queryClient } from "@/lib/queryClient";
import "@/styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root was not found in index.html");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-right" closeButton />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
