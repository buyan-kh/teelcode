import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { AuthGuard } from "./components/auth/AuthGuard.tsx";
import { DataProvider } from "./contexts/DataContext.tsx";
import "./utils/cleanEloData"; // Auto-cleanup ELO localStorage keys

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGuard>
        <DataProvider>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <App />
          </ThemeProvider>
        </DataProvider>
      </AuthGuard>
    </AuthProvider>
  </StrictMode>
);
