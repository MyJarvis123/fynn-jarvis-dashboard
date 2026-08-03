const ElectronStorage = {
  _useElectron: typeof window.electronAPI !== 'undefined',
  _cache: {},

  async setItem(key, value) {
    this._cache[key] = value;
    if (this._useElectron) {
      try {
        await window.electronAPI.saveData(key, value);
        return;
      } catch (e) {
        console.warn('Electron save failed, fallback to localStorage:', e);
      }
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage failed:', e);
    }
  },

  async getItem(key) {
    if (this._cache[key]) {
      return this._cache[key];
    }
    if (this._useElectron) {
      try {
        const data = await window.electronAPI.loadData(key);
        if (data) {
          this._cache[key] = data;
          return data;
        }
      } catch (e) {
        console.warn('Electron load failed, fallback to localStorage:', e);
      }
    }
    return localStorage.getItem(key);
  },

  removeItem(key) {
    delete this._cache[key];
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },

  clear() {
    this._cache = {};
    try {
      localStorage.clear();
    } catch (e) {}
  }
};

if (typeof window.electronAPI !== 'undefined') {
  window.localStorage = ElectronStorage;
}
