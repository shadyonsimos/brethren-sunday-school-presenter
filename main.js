// Sunday School Presenter (kids) — Electron main process (forked from Brethren Presenter v27, no mic)
const { app, BrowserWindow, protocol, net, ipcMain, screen, session, Menu, } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([{ scheme: 'bp', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

const RENDERER = path.join(__dirname, 'renderer');
let control = null, output = null, lastSlide = null, lastStyle = null;
// debug log next to the app (…/dist/logs/speech-YYYY-MM-DD.log) so problems can be read later
let LOGDIR = null;
function logLine(msg) {
  try {
    if (!LOGDIR) { LOGDIR = path.join(app.getPath('userData'), 'logs'); fs.mkdirSync(LOGDIR, { recursive: true }); }
    const d = new Date(), day = d.toISOString().slice(0, 10);
    fs.appendFileSync(path.join(LOGDIR, 'app-' + day + '.log'), d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0') + ' ' + msg + '\n');
  } catch (e) {}
}

const LEGACY = parseInt(process.versions.electron, 10) < 25;   // Windows 7/8 build runs on Electron 22 (no protocol.handle)
function serveLegacy() {
  const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
  protocol.registerFileProtocol('bp', (req, cb) => {
    const u = new URL(req.url);
    const file = path.normalize(path.join(RENDERER, decodeURIComponent(u.pathname)));
    if (!file.startsWith(RENDERER) || !fs.existsSync(file)) return cb({ error: -6 });
    cb({ path: file, mimeType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' } });
  });
}
function serve() {
  if (LEGACY || !protocol.handle) return serveLegacy();
  protocol.handle('bp', async req => {
    const u = new URL(req.url);
    const root = RENDERER;
    const file = path.normalize(path.join(root, decodeURIComponent(u.pathname)));
    if (!file.startsWith(root) || !fs.existsSync(file)) return new Response('not found', { status: 404 });
    const r = await net.fetch(pathToFileURL(file).toString());
    const h = new Headers(r.headers);
    h.set('Content-Length', String(fs.statSync(file).size));
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    h.set('Cross-Origin-Embedder-Policy', 'require-corp');
    h.set('Cross-Origin-Resource-Policy', 'same-origin');
    if (file.endsWith('.mjs') || file.endsWith('.js')) h.set('Content-Type', 'text/javascript');
    if (file.endsWith('.wasm')) h.set('Content-Type', 'application/wasm');
    return new Response(r.body, { status: 200, headers: h });
  });
}

const prefs = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false };

function createControl() {
  control = new BrowserWindow({
    width: 1480, height: 900, minWidth: 1180, minHeight: 720, show: false,
    title: 'Brethren Sunday School Presenter', backgroundColor: '#fff7ec',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: prefs
  });
  control.loadURL('bp://renderer/index.html');
  control.once('ready-to-show', () => { control.maximize(); control.show(); openOutput(false); });
  control.on('closed', () => { control = null; if (output && !output.isDestroyed()) output.destroy(); app.quit(); });
}

function externalDisplay() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().find(d => d.id !== primary.id) || null;
}

function openOutput(userAsked) {
  const ext = externalDisplay();
  if (!ext && !userAsked) { sendStatus(); return; }   // no projector yet: wait for it
  if (output && !output.isDestroyed()) { placeOutput(); output.show(); return; }
  output = new BrowserWindow({
    width: 1280, height: 720, show: false, frame: !ext, backgroundColor: '#000000',
    title: 'شاشة العرض', autoHideMenuBar: true, webPreferences: prefs
  });
  output.loadURL('bp://renderer/output.html');
  output.once('ready-to-show', () => { placeOutput(); output.show(); if (control) control.focus(); });
  output.webContents.on('did-finish-load', () => { if (lastStyle) output.webContents.send('style', lastStyle); output.webContents.send('slide', lastSlide); });
  output.on('closed', () => { output = null; sendStatus(); });
  sendStatus();
}

function placeOutput() {
  if (!output || output.isDestroyed()) return;
  const ext = externalDisplay();
  if (ext) {
    output.setBounds(ext.bounds);
    output.setFullScreen(true);
  } else {
    output.setFullScreen(false);
  }
  sendStatus();
}

function sendStatus() {
  if (!control || control.isDestroyed()) return;
  control.webContents.send('status', {
    outputOpen: !!(output && !output.isDestroyed()),
    projector: !!externalDisplay(),
    displays: screen.getAllDisplays().length
  });
}

// ---------- automatic updates (Windows): new versions come from GitHub Releases ----------
function startUpdates() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { logLine('UPDATE no updater ' + e.message); return; }
  if (LEGACY) { autoUpdater.channel = 'win7'; autoUpdater.allowDowngrade = false; }   // Windows 7/8 copies only take Windows 7/8 updates (win7.yml)
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;            // the new version is installed when the app is closed
  const tell = m => { if (control && !control.isDestroyed()) control.webContents.send('update', m); };
  autoUpdater.on('update-available', i => { logLine('UPDATE available ' + i.version); tell({ state: 'downloading', version: i.version }); });
  autoUpdater.on('update-downloaded', i => { logLine('UPDATE ready ' + i.version); tell({ state: 'ready', version: i.version }); });
  autoUpdater.on('error', e => logLine('UPDATE error ' + (e && e.message)));
  const check = () => autoUpdater.checkForUpdates().catch(e => logLine('UPDATE check failed ' + e.message));   // no internet = just try later
  setTimeout(check, 8000);
  setInterval(check, 6 * 60 * 60 * 1000);
}
ipcMain.on('update-now', () => { try { require('electron-updater').autoUpdater.quitAndInstall(false, true); } catch (e) {} });

app.whenReady().then(() => {
  serve();
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'fullscreen'));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => perm === 'fullscreen');
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Brethren Sunday School Presenter', submenu: [{ role: 'about', label: 'عن البرنامج' }, { type: 'separator' }, { role: 'hide', label: 'إخفاء' }, { role: 'quit', label: 'خروج' }] },
      { label: 'تعديل', submenu: [{ role: 'undo', label: 'تراجع' }, { role: 'cut', label: 'قص' }, { role: 'copy', label: 'نسخ' }, { role: 'paste', label: 'لصق' }, { role: 'selectAll', label: 'تحديد الكل' }] },
      { label: 'نافذة', submenu: [{ role: 'minimize', label: 'تصغير' }, { role: 'togglefullscreen', label: 'ملء الشاشة' }] }
    ]));
  } else Menu.setApplicationMenu(null);
  createControl();
  startUpdates();
  screen.on('display-added', () => { if (output && !output.isDestroyed()) placeOutput(); else openOutput(false); });
  screen.on('display-removed', () => { placeOutput(); });
  screen.on('display-metrics-changed', () => placeOutput());
});
app.on('window-all-closed', () => app.quit());

ipcMain.on('slide', (e, s) => { lastSlide = s; if (output && !output.isDestroyed()) output.webContents.send('slide', s); });
ipcMain.on('style', (e, s) => { lastStyle = s; if (output && !output.isDestroyed()) output.webContents.send('style', s); });
ipcMain.on('open-output', () => openOutput(true));
ipcMain.on('output-fullscreen', () => { if (output && !output.isDestroyed()) output.setFullScreen(!output.isFullScreen()); });
ipcMain.on('key', (e, k) => { if (control && !control.isDestroyed()) control.webContents.send('key', k); });
ipcMain.handle('status', () => ({ outputOpen: !!(output && !output.isDestroyed()), projector: !!externalDisplay() }));

// meetings history (اجتماع اليوم / السجل) -> userData/meetings.json
const MEET_FILE = () => path.join(app.getPath('userData'), 'meetings.json');
ipcMain.handle('meet-load', () => { try { return JSON.parse(fs.readFileSync(MEET_FILE(), 'utf8')); } catch (e) { return null; } });
ipcMain.on('meet-save', (e, data) => { try { const f = MEET_FILE(); fs.writeFileSync(f + '.tmp', JSON.stringify(data)); fs.renameSync(f + '.tmp', f); } catch (err) { logLine('meet-save failed ' + err.message); } });
