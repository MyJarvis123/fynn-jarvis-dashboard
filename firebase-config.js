/**
 * FIREBASE CONFIG — JARVIS DASHBOARD
 * Direct Firebase Configuration (Auto-Loaded)
 *
 * Diese Datei wird VOR firebase-sync.js geladen und stellt die Config zur Verfügung.
 * localStorage hat Priorität, aber diese Config ist das Fallback.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD1w5oi1yzIWuNTRDLq3I1a9tuuOFizIKc",
  authDomain: "jarvis-dashboard-397be.firebaseapp.com",
  databaseURL: "https://jarvis-dashboard-397be-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "jarvis-dashboard-397be",
  storageBucket: "jarvis-dashboard-397be.firebasestorage.app",
  messagingSenderId: "173561706666",
  appId: "1:173561706666:web:3c23cb568f6255edb5f8d3",
  measurementId: "G-P3FZTCMW7N"
};

/**
 * AUTO-SAVE: Speichere Config in localStorage für Consistency
 * So hat Firebase-Setup immer die aktuellen Values
 */
(function autoSaveConfig() {
  try {
    // Prüfe ob localStorage verfügbar ist
    const testKey = "__test_storage__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);

    // localStorage funktioniert → speichere Config
    const configKey = "firebase-config-v1";
    const existingConfig = localStorage.getItem(configKey);

    if (!existingConfig) {
      // Nur speichern wenn noch nicht vorhanden
      localStorage.setItem(configKey, JSON.stringify(FIREBASE_CONFIG));
      console.log("✓ Firebase-Config auto-saved zu localStorage");
    }
  } catch (e) {
    console.warn("⚠️ localStorage nicht verfügbar (Private Mode?), nutze in-memory Config");
  }
})();

console.log("✓ Firebase-Config geladen");
