const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (key, data) => ipcRenderer.invoke('save_data', key, data),
  loadData: (key) => ipcRenderer.invoke('load_data', key)
});
