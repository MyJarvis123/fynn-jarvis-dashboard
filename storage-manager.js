/**
 * STORAGE MANAGER
 * Robuste Persistierungs-Lösung mit mehreren Fallbacks
 * localStorage → sessionStorage → Memory
 */

class StorageManager {
  constructor() {
    this.provider = null;
    this.data = {};
    this.init();
  }

  init() {
    // Test localStorage
    if (this.isLocalStorageAvailable()) {
      this.provider = 'localStorage';
      console.log('✓ StorageManager: localStorage verfügbar');
      this.loadFromLocalStorage();
    }
    // Fallback: sessionStorage
    else if (this.isSessionStorageAvailable()) {
      this.provider = 'sessionStorage';
      console.warn('⚠️ StorageManager: sessionStorage (wird bei Tab-Close gelöscht!)');
      this.loadFromSessionStorage();
    }
    // Fallback: Memory
    else {
      this.provider = 'memory';
      console.warn('⚠️ StorageManager: In-Memory (wird bei Reload gelöscht!)');
    }
  }

  isLocalStorageAvailable() {
    try {
      const test = '__storage_test_' + Date.now();
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error('❌ localStorage nicht verfügbar:', e.message);
      return false;
    }
  }

  isSessionStorageAvailable() {
    try {
      const test = '__session_test_' + Date.now();
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  loadFromLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        try {
          this.data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          // Nicht-JSON Werte ignorieren
          this.data[key] = localStorage.getItem(key);
        }
      });
      console.log('✓ Daten aus localStorage geladen:', Object.keys(this.data).length);
    } catch (e) {
      console.error('Fehler beim Laden aus localStorage:', e);
    }
  }

  loadFromSessionStorage() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        try {
          this.data[key] = JSON.parse(sessionStorage.getItem(key));
        } catch (e) {
          this.data[key] = sessionStorage.getItem(key);
        }
      });
      console.log('✓ Daten aus sessionStorage geladen');
    } catch (e) {
      console.error('Fehler beim Laden aus sessionStorage:', e);
    }
  }

  setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      this.data[key] = value;

      if (this.provider === 'localStorage') {
        localStorage.setItem(key, jsonValue);
      } else if (this.provider === 'sessionStorage') {
        sessionStorage.setItem(key, jsonValue);
      }
      // Memory: nur in this.data

      console.log(`✓ [${this.provider}] ${key} gespeichert`);
      return true;
    } catch (e) {
      console.error(`❌ Fehler beim Speichern von ${key}:`, e.message);

      // Wenn localStorage voll ist, versuche zu clearen
      if (e.name === 'QuotaExceededError' || e.message.includes('QuotaExceededError')) {
        console.warn('🚨 STORAGE QUOTA EXCEEDED! Lösche alte Daten...');
        this.cleanup();
        // Versuche nochmal
        try {
          if (this.provider === 'localStorage') localStorage.setItem(key, jsonValue);
          return true;
        } catch (e2) {
          console.error('Nochmal fehlgeschlagen:', e2);
          return false;
        }
      }
      return false;
    }
  }

  getItem(key) {
    try {
      if (this.provider === 'localStorage') {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        }
      } else if (this.provider === 'sessionStorage') {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        }
      }
      return this.data[key];
    } catch (e) {
      console.error(`Fehler beim Abrufen von ${key}:`, e);
      return this.data[key];
    }
  }

  removeItem(key) {
    try {
      delete this.data[key];
      if (this.provider === 'localStorage') localStorage.removeItem(key);
      else if (this.provider === 'sessionStorage') sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Fehler beim Löschen von ${key}:`, e);
    }
  }

  clear() {
    try {
      this.data = {};
      if (this.provider === 'localStorage') localStorage.clear();
      else if (this.provider === 'sessionStorage') sessionStorage.clear();
      console.log('✓ Storage gelöscht');
    } catch (e) {
      console.error('Fehler beim Löschen:', e);
    }
  }

  cleanup() {
    try {
      // Lösche alte/große Einträge
      const keysToDelete = [];

      if (this.provider === 'localStorage') {
        const keys = Object.keys(localStorage);
        // Behalte nur Firebase Config und neueste Daten
        keys.forEach(key => {
          if (key !== 'firebase-config-v1' &&
              !key.includes('-v4') &&
              !key.includes('-v2')) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Cleanup: ${keysToDelete.length} alte Einträge gelöscht`);
      }
    } catch (e) {
      console.error('Cleanup Fehler:', e);
    }
  }

  getStatus() {
    return {
      provider: this.provider,
      itemsInMemory: Object.keys(this.data).length,
      canWrite: this.provider !== 'memory'
    };
  }

  // Für Debugging
  printAll() {
    console.log('📦 STORAGE CONTENTS:');
    if (this.provider === 'localStorage') {
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      });
    } else if (this.provider === 'sessionStorage') {
      Object.keys(sessionStorage).forEach(key => {
        const value = sessionStorage.getItem(key);
        console.log(`  ${key}: ${value.substring(0, 50)}`);
      });
    } else {
      Object.keys(this.data).forEach(key => {
        console.log(`  ${key}: [In-Memory]`);
      });
    }
  }
}

// Global instance
const storage = new StorageManager();
