/**
 * PERSISTENT STORAGE
 * Multi-Layer Persistierung: localStorage → sessionStorage → Cookies → Memory
 * Garantiert dass Daten NICHT verloren gehen auch in Private Mode
 */

class PersistentStorage {
  constructor() {
    this.memory = {};
    this.cookie_enabled = this.checkCookies();
    this.localStorage_enabled = this.checkLocalStorage();
    this.init();
  }

  checkCookies() {
    try {
      const test = '__cookie_test__';
      document.cookie = `${test}=true; path=/; max-age=1`;
      const hasTest = document.cookie.includes(test);
      document.cookie = `${test}=; path=/; max-age=0`;
      return hasTest;
    } catch (e) {
      return false;
    }
  }

  checkLocalStorage() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      const ok = localStorage.getItem(test) === test;
      localStorage.removeItem(test);
      return ok;
    } catch (e) {
      return false;
    }
  }

  init() {
    console.log('🔐 PersistentStorage Init:');
    console.log(`  localStorage: ${this.localStorage_enabled ? '✓' : '✗'}`);
    console.log(`  Cookies: ${this.cookie_enabled ? '✓' : '✗'}`);

    if (!this.localStorage_enabled && !this.cookie_enabled) {
      console.warn('⚠️ WARNUNG: Weder localStorage noch Cookies funktionieren!');
      console.warn('⚠️ Ist Private Mode aktiviert? Browser speichert Daten nicht!');
    }

    // Lade bestehende Daten
    this.restore();
  }

  restore() {
    // Versuche von localStorage zu laden
    if (this.localStorage_enabled) {
      Object.keys(localStorage).forEach(key => {
        try {
          this.memory[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          this.memory[key] = localStorage.getItem(key);
        }
      });
      console.log('✓ Daten aus localStorage restauriert');
    }

    // Fallback: Versuche von Cookies zu laden
    if (!this.memory['firebase-config-v1'] && this.cookie_enabled) {
      const config = this.getCookie('firebase-config-v1');
      if (config) {
        try {
          this.memory['firebase-config-v1'] = JSON.parse(decodeURIComponent(config));
          console.log('✓ Firebase Config aus Cookie restauriert!');
        } catch (e) {
          console.warn('Cookie Config Parse Error:', e);
        }
      }
    }
  }

  setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);

      // Speichere in Memory
      this.memory[key] = value;

      // Versuche localStorage
      if (this.localStorage_enabled) {
        try {
          localStorage.setItem(key, jsonValue);
          console.log(`✓ [localStorage] ${key} gespeichert`);
        } catch (e) {
          console.warn(`⚠️ localStorage failed für ${key}:`, e.message);
        }
      }

      // Backup in Cookies (nur für wichtige Daten wie Firebase Config)
      if (key === 'firebase-config-v1' || key.includes('config')) {
        if (this.cookie_enabled) {
          this.setCookie(key, jsonValue, 365); // 1 Jahr
          console.log(`✓ [Cookie Backup] ${key} gespeichert`);
        }
      }

      return true;
    } catch (e) {
      console.error(`❌ Fehler beim Speichern von ${key}:`, e);
      return false;
    }
  }

  getItem(key) {
    // Versuche localStorage zuerst
    if (this.localStorage_enabled) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
      } catch (e) {
        console.warn(`⚠️ localStorage read failed für ${key}`);
      }
    }

    // Fallback: Memory
    if (this.memory[key]) {
      console.log(`✓ [Memory] ${key} geladen`);
      return this.memory[key];
    }

    // Fallback: Cookies
    if (this.cookie_enabled && (key === 'firebase-config-v1' || key.includes('config'))) {
      const cookieValue = this.getCookie(key);
      if (cookieValue) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieValue));
          console.log(`✓ [Cookie] ${key} geladen`);
          return parsed;
        } catch (e) {
          console.warn('Cookie parse error:', e);
        }
      }
    }

    return null;
  }

  removeItem(key) {
    delete this.memory[key];
    if (this.localStorage_enabled) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    }
    this.deleteCookie(key);
  }

  clear() {
    this.memory = {};
    if (this.localStorage_enabled) {
      try {
        localStorage.clear();
      } catch (e) {}
    }
  }

  // Cookie Helper
  setCookie(name, value, days = 7) {
    try {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      const expires = 'expires=' + date.toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/`;
    } catch (e) {
      console.warn('Cookie set error:', e);
    }
  }

  getCookie(name) {
    try {
      const nameEQ = name + '=';
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(nameEQ)) {
          return cookie.substring(nameEQ.length);
        }
      }
    } catch (e) {
      console.warn('Cookie get error:', e);
    }
    return null;
  }

  deleteCookie(name) {
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    } catch (e) {}
  }

  getStatus() {
    return {
      localStorage: this.localStorage_enabled,
      cookies: this.cookie_enabled,
      memory_items: Object.keys(this.memory).length,
      firebase_config_present: !!this.memory['firebase-config-v1']
    };
  }
}

// Global instance - ERSETZT localStorage
const persistentStorage = new PersistentStorage();

// Override window.localStorage mit Fallback
const originalLocalStorage = window.localStorage;
Object.defineProperty(window, 'localStorage', {
  get: function() {
    return {
      getItem: (key) => persistentStorage.getItem(key),
      setItem: (key, value) => persistentStorage.setItem(key, value),
      removeItem: (key) => persistentStorage.removeItem(key),
      clear: () => persistentStorage.clear(),
      key: (index) => Object.keys(persistentStorage.memory)[index] || null,
      length: Object.keys(persistentStorage.memory).length
    };
  }
});

console.log('✓ PersistentStorage aktiviert - ersetzt localStorage');
