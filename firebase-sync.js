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
  }

  // Initialisiere Firebase
  async init() {
    try {
      // Lade Firebase-Config aus localStorage
      const configStr = localStorage.getItem("firebase-config-v1");
      if (!configStr) {
        console.log("Firebase nicht konfiguriert");
        return false;
      }

      const config = JSON.parse(configStr);

      // Überprüfe ob alle Felder vorhanden sind
      const requiredFields = ["apiKey", "authDomain", "databaseURL", "projectId"];
      const isConfigValid = requiredFields.every(field => config[field]);

      if (!isConfigValid) {
        console.warn("Firebase-Config unvollständig");
        return false;
      }

      // Prüfe ob Firebase SDK geladen ist
      if (typeof firebase === "undefined") {
        console.warn("Firebase SDK nicht geladen");
        return false;
      }

      // Initialisiere Firebase
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      this.db = firebase.database();
      this.isConnected = true;
      this.syncEnabled = true;

      console.log(`✓ Firebase sync aktiviert für ${this.moduleName}`);
      return true;
    } catch (e) {
      console.error("Firebase init error:", e);
      return false;
    }
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
