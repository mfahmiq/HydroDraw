const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  newFile: () => ipcRenderer.invoke('file:new'),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('file:saveAs', data),
  exportDXF: (content) => ipcRenderer.invoke('file:exportDXF', content),
  importDXF: () => ipcRenderer.invoke('file:importDXF'),
  exportPNG: (dataUrl) => ipcRenderer.invoke('file:exportPNG', dataUrl),
  
  // App info
  isElectron: true
});
