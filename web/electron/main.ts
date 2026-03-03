import { app, BrowserWindow, Tray, Menu, shell, nativeImage, dialog } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { createConnection } from 'net'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'

// Pass `--dev` to load the Vite dev server (http://localhost:5173) instead of Hono
const isDev = process.argv.includes('--dev')
const WEB_PORT = 3001

// When running `electron .` from web/, getAppPath() returns the web/ directory.
// When packaged, we read the repo path from userData/config.json (key: repoPath).
const WEB_DIR = app.getAppPath()

function resolveRepoRoot(): string {
  // Explicit env var override — used by the WSL2 bridge launcher on Windows
  if (process.env.HOMELIFE_REPO) return process.env.HOMELIFE_REPO

  // userData config (packaged app or manual config)
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json')
    if (existsSync(configPath)) {
      const cfg = JSON.parse(readFileSync(configPath, 'utf8'))
      if (typeof cfg.repoPath === 'string' && cfg.repoPath) return cfg.repoPath
    }
  } catch { /* app.getPath may fail before ready on some platforms */ }

  if (app.isPackaged) {
    return '' // needs first-run setup
  }
  // Development: web/ is inside the repo
  return path.join(WEB_DIR, '..')
}

// WSL2 bridge mode: Electron runs on Windows, but the daemon/server live in WSL2.
// Set HOMELIFE_WSL2_BRIDGE=1 in the environment to enable this mode.
const IS_WSL2_BRIDGE = process.env.HOMELIFE_WSL2_BRIDGE === '1'

let REPO_ROOT = resolveRepoRoot()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let daemonProcess: ChildProcess | null = null
let webProcess: ChildProcess | null = null
let isQuitting = false

// ── Path helpers ────────────────────────────────────────────────────────────

function getPythonPath(): string {
  const binDir = process.platform === 'win32' ? 'Scripts' : 'bin'
  const pyBin = process.platform === 'win32' ? 'python.exe' : 'python'
  return path.join(REPO_ROOT, '.venv', binDir, pyBin)
}

function getTsxPath(): string {
  const bin = process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  return path.join(WEB_DIR, 'node_modules', '.bin', bin)
}

// ── First-run setup ──────────────────────────────────────────────────────────

async function firstRunSetup(): Promise<string | null> {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'homelife.ai — Setup',
    message: 'Welcome to homelife.ai!\n\nSelect the folder where you cloned the repository and ran "uv sync".',
    buttons: ['Select Folder', 'Quit'],
    defaultId: 0,
    cancelId: 1,
  })
  if (response === 1) return null

  const result = await dialog.showOpenDialog({
    title: 'Select homelife.ai repository folder',
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const repoPath = result.filePaths[0]
  const binDir = process.platform === 'win32' ? 'Scripts' : 'bin'
  const pyBin = process.platform === 'win32' ? 'python.exe' : 'python'
  const pythonBin = path.join(repoPath, '.venv', binDir, pyBin)

  if (!existsSync(pythonBin)) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Python environment not found',
      message: `Could not find Python at:\n${pythonBin}\n\nPlease run "uv sync" in the selected folder first, then try again.`,
      buttons: ['OK'],
    })
    return firstRunSetup() // retry
  }

  // Save to userData/config.json
  try {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    writeFileSync(path.join(userDataPath, 'config.json'), JSON.stringify({ repoPath }, null, 2))
  } catch (e) {
    console.error('Failed to save config:', e)
  }

  return repoPath
}

// ── Port readiness check ─────────────────────────────────────────────────────

function waitForPort(port: number, timeoutMs = 20_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const attempt = () => {
      const sock = createConnection(port, '127.0.0.1')
      sock.on('connect', () => { sock.destroy(); resolve() })
      sock.on('error', () => {
        sock.destroy()
        if (Date.now() >= deadline) {
          reject(new Error(`localhost:${port} did not become ready within ${timeoutMs}ms`))
        } else {
          setTimeout(attempt, 300)
        }
      })
    }
    attempt()
  })
}

// ── Subprocess management ────────────────────────────────────────────────────

function startDaemon() {
  if (IS_WSL2_BRIDGE) {
    // Windows + WSL2 bridge: run daemon inside WSL2 via wsl.exe
    console.log('[daemon] WSL2 bridge mode')
    daemonProcess = spawn(
      'wsl.exe',
      ['-e', 'bash', '-c', `cd "${REPO_ROOT}" && .venv/bin/python -m daemon start`],
      { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } }
    )
  } else {
    const python = getPythonPath()
    if (!existsSync(python)) {
      console.warn(`[daemon] Python venv not found at ${python}`)
      dialog.showErrorBox(
        'Python environment not found',
        `Could not find the Python environment at:\n${python}\n\n` +
        `Please run "uv sync" in the repo root (${REPO_ROOT}) and restart the app.`
      )
      return
    }
    daemonProcess = spawn(python, ['-m', 'daemon', 'start'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })
  }
  daemonProcess.stdout?.on('data', (d: Buffer) => process.stdout.write(`[daemon] ${d}`))
  daemonProcess.stderr?.on('data', (d: Buffer) => process.stderr.write(`[daemon] ${d}`))
  daemonProcess.on('exit', (code: number | null) => console.log(`[daemon] exited (${code})`))
  console.log('[daemon] started')
}

function startWebServer() {
  if (IS_WSL2_BRIDGE) {
    // Windows + WSL2 bridge: run Hono server inside WSL2 via wsl.exe
    console.log('[server] WSL2 bridge mode')
    const webDir = `${REPO_ROOT}/web`
    webProcess = spawn(
      'wsl.exe',
      ['-e', 'bash', '-c', `cd "${webDir}" && NODE_ENV=production node_modules/.bin/tsx server/index.ts`],
      { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } }
    )
  } else {
    const tsx = getTsxPath()
    if (!existsSync(tsx)) {
      console.warn(`[server] tsx not found at ${tsx}. Run "npm install" in web/.`)
      dialog.showErrorBox(
        'Node.js dependencies not found',
        `Could not find tsx at:\n${tsx}\n\nPlease run "npm install" in the web/ directory and restart the app.`
      )
      return
    }
    webProcess = spawn(tsx, ['server/index.ts'], {
      cwd: WEB_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    })
  }
  webProcess.stdout?.on('data', (d: Buffer) => process.stdout.write(`[server] ${d}`))
  webProcess.stderr?.on('data', (d: Buffer) => process.stderr.write(`[server] ${d}`))
  webProcess.on('exit', (code: number | null) => console.log(`[server] exited (${code})`))
  console.log('[server] started')
}

function cleanup() {
  if (daemonProcess && !daemonProcess.killed) {
    console.log('Stopping daemon...')
    daemonProcess.kill('SIGTERM')
    daemonProcess = null
  }
  if (webProcess && !webProcess.killed) {
    console.log('Stopping web server...')
    webProcess.kill('SIGTERM')
    webProcess = null
  }
}

// ── Window ───────────────────────────────────────────────────────────────────

async function createWindow() {
  // Always wait for the Hono server (API backend)
  console.log(`[app] Waiting for Hono server on port ${WEB_PORT}...`)
  await waitForPort(WEB_PORT).catch((e: Error) => {
    console.warn('[app]', e.message)
  })

  const url = isDev ? 'http://localhost:5173' : `http://localhost:${WEB_PORT}`
  console.log(`[app] Loading ${url}`)

  const iconPath = path.join(__dirname, '..', 'icon.png')
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'homelife.ai',
    backgroundColor: '#0f172a',
    icon: existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(url)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // macOS: hide window on close rather than quitting
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── System tray ──────────────────────────────────────────────────────────────

function createTray() {
  // Provide a 16x16 tray-icon.png in web/electron/ to use a custom icon.
  const iconPath = path.join(__dirname, '..', 'tray-icon.png')
  const icon = existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('homelife.ai')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open homelife.ai',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    {
      label: 'Open in Browser',
      click: () => shell.openExternal(`http://localhost:${WEB_PORT}`),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { isQuitting = true; app.quit() },
    },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Packaged app with no repo configured → show first-run setup dialog
  if (app.isPackaged && !REPO_ROOT && !IS_WSL2_BRIDGE) {
    const chosen = await firstRunSetup()
    if (!chosen) { app.quit(); return }
    REPO_ROOT = chosen
  }

  startDaemon()
  startWebServer()
  createTray()
  await createWindow()

  // macOS: re-open window when clicking dock icon
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS keep the app running in the tray
  if (process.platform !== 'darwin') {
    isQuitting = true
    app.quit()
  }
})

app.on('before-quit', cleanup)
