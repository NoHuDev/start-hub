const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// Automatically fix permissions for node-systray binary if we are on Linux/macOS
if (process.platform === 'linux' || process.platform === 'darwin') {
  try {
    const homeDir = os.homedir();
    const cacheDir = path.join(homeDir, '.cache', 'node-systray');
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir);
      for (const ver of versions) {
        const verDir = path.join(cacheDir, ver);
        if (fs.statSync(verDir).isDirectory()) {
          const files = fs.readdirSync(verDir);
          for (const file of files) {
            if (file.startsWith('tray_')) {
              const binPath = path.join(verDir, file);
              const stats = fs.statSync(binPath);
              if (stats.isFile() && (stats.mode & 0o111) === 0) {
                console.log(`Setting execute permissions on: ${binPath}`);
                fs.chmodSync(binPath, 0o755);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to automatically fix node-systray binary permissions:', err);
  }
}

const SysTray = require('systray2').default;

const backendPid = process.argv[2] || process.env.BACKEND_PID;
const frontendPid = process.argv[3] || process.env.FRONTEND_PID;

console.log(`Tray-Helper started. PIDs received - Backend: ${backendPid || 'none'}, Frontend: ${frontendPid || 'none'}`);

const iconPath = process.platform === 'win32'
  ? path.join(__dirname, 'tray-icon.ico')
  : path.join(__dirname, 'tray-icon.png');

let iconBase64 = '';
try {
  if (fs.existsSync(iconPath)) {
    iconBase64 = fs.readFileSync(iconPath).toString('base64');
  } else {
    console.error(`Tray icon file not found at: ${iconPath}`);
  }
} catch (e) {
  console.error('Failed to read tray icon file:', e);
}

const openBrowser = () => {
  const url = 'http://localhost:5173';
  console.log(`Opening browser at: ${url}`);
  const openCmd = process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${openCmd} "${url}"`, (err) => {
    if (err) {
      console.error('Failed to open browser:', err);
    }
  });
};

const killProcess = (pid) => {
  if (!pid) return;
  const numericPid = parseInt(pid, 10);
  if (isNaN(numericPid)) {
    if (process.platform === 'win32') {
      console.log(`Killing process by window title: ${pid}`);
      exec(`taskkill /fi "windowtitle eq ${pid}*" /t /f`, (err) => {
        if (err) {
          console.error(`Failed to kill window title '${pid}':`, err);
        }
      });
    } else {
      console.warn(`Non-numeric target '${pid}' ignored on non-Windows platform.`);
    }
    return;
  }
  console.log(`Sending kill signal to PID ${numericPid}...`);
  try {
    if (process.platform === 'win32') {
      exec(`taskkill /F /PID ${numericPid}`, (err) => {
        if (err) {
          try { process.kill(numericPid, 'SIGKILL'); } catch (e) {}
        }
      });
    } else {
      process.kill(numericPid, 'SIGTERM');
    }
  } catch (err) {
    try {
      process.kill(numericPid, 'SIGKILL');
    } catch (e) {}
  }
};

const shutdown = () => {
  console.log('Shutting down Start Hub processes...');
  killProcess(backendPid);
  killProcess(frontendPid);
  try {
    systray.kill(false);
  } catch (e) {}
  setTimeout(() => {
    process.exit(0);
  }, 500);
};

const menuItems = [
  {
    title: 'Start Hub öffnen',
    tooltip: 'Start Hub im Browser öffnen',
    checked: false,
    enabled: true,
    click: () => {
      openBrowser();
    }
  },
  SysTray.separator,
  {
    title: 'Beenden',
    tooltip: 'Start Hub beenden',
    checked: false,
    enabled: true,
    click: () => {
      shutdown();
    }
  }
];

const systray = new SysTray({
  menu: {
    icon: iconBase64,
    title: 'Start Hub',
    tooltip: 'Start Hub Launcher',
    items: menuItems
  },
  debug: false,
  copyDir: true
});

systray.onClick(action => {
  if (action.item && action.item.click) {
    action.item.click();
  }
});

systray.ready().then(() => {
  console.log('System Tray is ready and running.');
}).catch(err => {
  console.error('Failed to initialize System Tray:', err);
});
