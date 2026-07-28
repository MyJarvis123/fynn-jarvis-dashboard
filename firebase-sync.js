/**
 * FIREBASE SYNC MODULE
 * Zentrale Sync-Logik für alle JARVIS-Module
 * Synced localStorage ↔ Firebase Realtime Database
 */

class FirebaseSync {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.db = null;
    this.isConnected = false;
    this.syncEnabled = false;
    this.initPromise = null;
  }

  // Warte auf Firebase SDK zu laden
  async waitForFirebase(timeout = 5000) {
    const startTime = Date.now();
    while (typeof firebase === "undefined") {
      if (Date.now() - startTime > timeout) {
        console.error("Firebase SDK Timeout");
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return true;
  }

  // Initialisiere Firebase
  async init() {
    // Verhindere mehrfaches Initialisieren
    if (this.initPromise) {
      return await this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Warte auf Firebase SDK
        const fbLoaded = await this.waitForFirebase();
        if (!fbLoaded) {
          console.error("Firebase SDK nicht verfügbar");
          return false;
        }

        // Lade Firebase-Config aus localStorage
        const configStr = localStorage.getItem("firebase-config-v1");
        if (!configStr) {
          console.warn(`[${this.moduleName}] Firebase nicht konfiguriert`);
          return false;
        }

        const config = JSON.parse(configStr);

        // Überprüfe ob alle Felder vorhanden sind
        const requiredFields = ["apiKey", "authDomain", "databaseURL", "projectId"];
        const isConfigValid = requiredFields.every(field => config[field] && config[field].trim && config[field].trim().length > 0);

        if (!isConfigValid) {
          console.warn(`[${this.moduleName}] Firebase-Config unvollständig oder leer`);
          console.log("Config:", config);
          return false;
        }

        // Initialisiere Firebase (nur einmal)
        if (!firebase.apps || firebase.apps.length === 0) {
          firebase.initializeApp(config);
          console.log("✓ Firebase initialisiert");
        } else {
          console.log("✓ Firebase bereits initialisiert");
        }

        this.db = firebase.database();
        this.isConnected = true;
        this.syncEnabled = true;

        console.log(`✓ Firebase sync aktiviert für ${this.moduleName}`);
        return true;
      } catch (e) {
        console.error(`[${this.moduleName}] Firebase init error:`, e);
        return false;
      }
    })();

    return await this.initPromise;
  }

  // Speichere Daten zu Firebase
  async pushToFirebase(data) {
    if (!this.isConnected || !this.syncEnabled) return false;

    try {
      const path = `users/default/${this.moduleName}`;
      await this.db.ref(path).set({
        data: data,
        lastSync: new Date().toISOString()
      });
      console.log(`✓ ${this.moduleName} zu Firebase gespeichert`);
      return true;
    } catch (e) {
      console.error("Firebase push error:", e);
      return false;
    }
  }

  // Lade Daten von Firebase
  async pullFromFirebase() {
    if (!this.isConnected || !this.syncEnabled) return null;

    try {
      const path = `users/default/${this.moduleName}`;
      const snapshot = await this.db.ref(path).once("value");
      const value = snapshot.val();

      if (!value || !value.data) return null;

      console.log(`✓ ${this.moduleName} von Firebase geladen`);
      return value.data;
    } catch (e) {
      console.error("Firebase pull error:", e);
      return null;
    }
  }

  // Realtime-Listen auf Änderungen
  listenToChanges(callback) {
    if (!this.isConnected || !this.syncEnabled) return;

    try {
      const path = `users/default/${this.moduleName}`;
      this.db.ref(path).on("value", (snapshot) => {
        const value = snapshot.val();
        if (value && value.data) {
          callback(value.data);
        }
      });
      console.log(`✓ Realtime-Listen für ${this.moduleName} aktiv`);
    } catch (e) {
      console.error("Firebase listener error:", e);
    }
  }

  // Sync: localStorage → Firebase
  async syncToCloud(localData) {
    if (!this.isConnected) return false;

    console.log(`Syncing ${this.moduleName} to cloud...`);
    return await this.pushToFirebase(localData);
  }

  // Sync: Firebase → localStorage
  async syncFromCloud() {
    if (!this.isConnected) return null;

    console.log(`Syncing ${this.moduleName} from cloud...`);
    return await this.pullFromFirebase();
  }

  // Status
  getStatus() {
    return {
      isConnected: this.isConnected,
      syncEnabled: this.syncEnabled,
      module: this.moduleName
    };
  }
}

// Exportiere
if (typeof module !== "undefined" && module.exports) {
  module.exports = FirebaseSync;
}
