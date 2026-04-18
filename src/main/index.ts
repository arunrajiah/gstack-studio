import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { GStackDaemon } from './daemon'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null
const daemon = new GStackDaemon()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../build/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Window control IPC (needed for custom titlebar on Windows/Linux) ─────────
function registerWindowControls(): void {
  ipcMain.handle('window:minimize',   () => mainWindow?.minimize())
  ipcMain.handle('window:maximize',   () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close',      () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)
}

// ── Auto-updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    mainWindow?.webContents.send('update:available', { version: info.version })
  })
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:ready')
  })
  autoUpdater.on('error', err => {
    console.error('[updater]', err.message)
  })

  ipcMain.handle('update:check',   () => autoUpdater.checkForUpdates())
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())
  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate())

  // Check after 10 s so the app has fully loaded
  if (!is.dev) setTimeout(() => autoUpdater.checkForUpdates().catch(console.error), 10_000)
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.gstack.studio')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers(ipcMain, daemon)
  registerWindowControls()
  setupAutoUpdater()

  createWindow()

  daemon.ensureRunning().catch(console.error)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await daemon.stop()
  if (process.platform !== 'darwin') app.quit()
})
