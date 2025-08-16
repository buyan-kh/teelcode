// Utility to clean up ELO-related localStorage keys
// You can run this once to clean up existing users' data

export function cleanEloLocalStorage() {
  console.log("🧹 Cleaning ELO-related localStorage keys...");

  const eloKeys = ["userElo", "problemEloGains"];

  let removedKeys = 0;

  eloKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removedKeys++;
      console.log(`🗑️ Removed localStorage key: ${key}`);
    }
  });

  if (removedKeys > 0) {
    console.log(`✅ Cleaned ${removedKeys} ELO-related localStorage keys`);
    // Trigger a storage event to update components
    window.dispatchEvent(new Event("storage"));
  } else {
    console.log("ℹ️ No ELO localStorage keys found to clean");
  }
}

// Auto-run cleanup on import (run once)
if (typeof window !== "undefined") {
  // Check if cleanup has already been done
  const cleanupDone = localStorage.getItem("elo-cleanup-done");
  if (!cleanupDone) {
    cleanEloLocalStorage();
    localStorage.setItem("elo-cleanup-done", "true");
  }
}
