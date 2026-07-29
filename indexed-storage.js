/**
 * INDEXED STORAGE — IndexedDB Wrapper
 * Ersetzt localStorage für große Datenmengen (10x mehr Speicher)
 *
 * Verwendet IndexedDB für Daten > 1MB, localStorage nur als Fallback
 */

class IndexedStorage {
  constructor(dbName = 'JARVIS-DB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.ready = false;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('⚠️ IndexedDB nicht verfügbar, nutze localStorage');
        this.ready = false;
        resolve(false);
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ IndexedDB open error:', request.error);
        this.ready = false;
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        console.log('✓ IndexedDB initialisiert');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
          console.log('✓ IndexedDB ObjectStore erstellt');
        }
      };
    });
  }

  async setItem(key, value) {
    // Warte auf DB Init
    await this.initPromise;

    const jsonStr = JSON.stringify(value);
    const sizeInBytes = new Blob([jsonStr]).size;

    // Nutze IndexedDB für große Daten (> 500KB)
    if (this.ready && sizeInBytes > 500000) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction(['data'], 'readwrite');
          const store = transaction.objectStore('data');
          const request = store.put({ key, value, size: sizeInBytes, timestamp: Date.now() });

          request.onsuccess = () => {
            console.log(`✓ [IndexedDB] ${key} gespeichert (${(sizeInBytes / 1024).toFixed(2)}KB)`);
            resolve(true);
          };

          request.onerror = () => {
            console.warn(`⚠️ IndexedDB Fehler, nutze localStorage: ${request.error}`);
            this.fallbackToLocalStorage(key, jsonStr);
            resolve(true);
          };
        } catch (e) {
          console.warn('⚠️ IndexedDB Exception, nutze localStorage:', e.message);
          this.fallbackToLocalStorage(key, jsonStr);
          resolve(true);
        }
      });
    }

    // Kleine Daten: localStorage
    return this.fallbackToLocalStorage(key, jsonStr);
  }

  async getItem(key) {
    // Warte auf DB Init
    await this.initPromise;

    // Versuche zuerst IndexedDB
    if (this.ready) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction(['data'], 'readonly');
          const store = transaction.objectStore('data');
          const request = store.get(key);

          request.onsuccess = () => {
            if (request.result) {
              console.log(`✓ [IndexedDB] ${key} geladen`);
              resolve(request.result.value);
              return;
            }
            // Fallback zu localStorage
            resolve(this.getFromLocalStorage(key));
          };

          request.onerror = () => {
            console.warn('⚠️ IndexedDB get error, nutze localStorage');
            resolve(this.getFromLocalStorage(key));
          };
        } catch (e) {
          console.warn('⚠️ IndexedDB Exception:', e.message);
          resolve(this.getFromLocalStorage(key));
        }
      });
    }

    // Fallback: localStorage
    return this.getFromLocalStorage(key);
  }

  fallbackToLocalStorage(key, jsonStr) {
    try {
      // Prüfe ob Daten in localStorage passen
      const testKey = `__test_${key}__`;
      localStorage.setItem(testKey, jsonStr);
      localStorage.removeItem(testKey);

      // Wenn Test erfolgreich, speichere wirklich
      localStorage.setItem(key, jsonStr);
      console.log(`✓ [localStorage] ${key} gespeichert`);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error(`❌ STORAGE QUOTA EXCEEDED! ${key} konnte nicht gespeichert werden`);
        console.log('💡 Tipp: Alte Daten löschen oder Browser-Cache clearen');
        return false;
      }
      console.error(`❌ localStorage Fehler:`, e.message);
      return false;
    }
  }

  getFromLocalStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (e) {
      console.warn(`⚠️ localStorage getItem error: ${e.message}`);
      return null;
    }
  }

  async removeItem(key) {
    await this.initPromise;

    if (this.ready) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction(['data'], 'readwrite');
          const store = transaction.objectStore('data');
          store.delete(key);
          console.log(`✓ [IndexedDB] ${key} gelöscht`);
        } catch (e) {
          console.warn('⚠️ IndexedDB delete error');
        }
      });
    }

    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('⚠️ localStorage removeItem error');
    }
  }

  async clear() {
    await this.initPromise;

    if (this.ready) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction(['data'], 'readwrite');
          const store = transaction.objectStore('data');
          store.clear();
          console.log('✓ [IndexedDB] gelöscht');
        } catch (e) {
          console.warn('⚠️ IndexedDB clear error');
        }
        resolve();
      });
    }

    try {
      localStorage.clear();
    } catch (e) {
      console.warn('⚠️ localStorage clear error');
    }
  }

  async getStatus() {
    await this.initPromise;
    return {
      indexedDBReady: this.ready,
      localStorageAvailable: this.isLocalStorageAvailable()
    };
  }

  isLocalStorageAvailable() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Global instance
const indexedStorage = new IndexedStorage();
console.log('✓ IndexedStorage geladen');
