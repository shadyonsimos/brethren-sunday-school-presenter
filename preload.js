const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bp', {
  isApp: true,
  platform: process.platform,
  slide: s => ipcRenderer.send('slide', s),
  style: s => ipcRenderer.send('style', s),
  openOutput: () => ipcRenderer.send('open-output'),
  toggleOutputFullscreen: () => ipcRenderer.send('output-fullscreen'),
  key: k => ipcRenderer.send('key', k),
  status: () => ipcRenderer.invoke('status'),
  log: m => ipcRenderer.send('log', String(m)),
  updateNow: () => ipcRenderer.send('update-now'),
  meetLoad: () => ipcRenderer.invoke('meet-load'),
  meetSave: d => ipcRenderer.send('meet-save', d),
  on: (ch, cb) => { if (['slide', 'style', 'status', 'key', 'update'].includes(ch)) ipcRenderer.on(ch, (e, d) => cb(d)); }
});
