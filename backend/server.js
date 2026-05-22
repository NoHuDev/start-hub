const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());

const CONFIG_FILE = path.join(__dirname, 'data', 'projects.json');

// Helper to check if a command executable exists in the system PATH
function isExecutableInPath(binName) {
  const isWin = process.platform === 'win32';
  const pathEnv = process.env.PATH || '';
  const delimiter = isWin ? ';' : ':';
  const paths = pathEnv.split(delimiter);
  
  if (!isWin) {
    const backupDirs = ['/usr/bin', '/bin', '/usr/local/bin', '/snap/bin', '/usr/sbin', '/sbin'];
    for (const dir of backupDirs) {
      if (!paths.includes(dir)) {
        paths.push(dir);
      }
    }
  }

  for (const dir of paths) {
    if (!dir) continue;
    const fullPath = path.join(dir, binName + (isWin ? '.exe' : ''));
    try {
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.isFile()) {
          if (!isWin) {
            fs.accessSync(fullPath, fs.constants.X_OK);
          }
          return true;
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  return false;
}

// Get the list of installed and available terminals on the host system
function getAvailableTerminals() {
  const isWin = process.platform === 'win32';
  if (isWin) {
    return [
      { id: 'cmd', name: 'Command Prompt (CMD)' },
      { id: 'powershell', name: 'PowerShell' }
    ];
  } else {
    const list = [
      { id: 'alacritty', name: 'Alacritty', bin: 'alacritty' },
      { id: 'konsole', name: 'Konsole', bin: 'konsole' },
      { id: 'gnome-terminal', name: 'GNOME Terminal', bin: 'gnome-terminal' },
      { id: 'xfce4-terminal', name: 'XFCE Terminal', bin: 'xfce4-terminal' },
      { id: 'kitty', name: 'Kitty', bin: 'kitty' },
      { id: 'terminator', name: 'Terminator', bin: 'terminator' },
      { id: 'tilix', name: 'Tilix', bin: 'tilix' },
      { id: 'mate-terminal', name: 'MATE Terminal', bin: 'mate-terminal' },
      { id: 'xterm', name: 'XTerm', bin: 'xterm' }
    ];
    
    const installed = list.filter(t => isExecutableInPath(t.bin));
    if (installed.length === 0) {
      return [{ id: 'xterm', name: 'XTerm' }];
    }
    return installed.map(({ id, name }) => ({ id, name }));
  }
}

// Helper to detect default installed terminal on Linux
function detectLinuxTerminal() {
  const available = getAvailableTerminals();
  if (available && available.length > 0) {
    return available[0].id;
  }
  return 'xterm';
}

// Helper to ensure data directory and default config exist
function getInitialConfig() {
  const isWin = process.platform === 'win32';
  const defaultTerminal = isWin ? 'cmd' : detectLinuxTerminal();
  const defaultIdes = isWin ? [
    {
      id: 'ide-vscode',
      name: "VS Code",
      path: "code",
      icon: "Code"
    }
  ] : [
    {
      id: 'ide-antigravity',
      name: "Antigravity IDE",
      path: path.join(os.homedir(), "Anwendungen/Antigravity IDE/antigravity-ide"),
      icon: "Code"
    },
    {
      id: 'ide-code-oss',
      name: "Code - OSS",
      path: "code-oss",
      icon: "TerminalSquare"
    }
  ];

  return {
    settings: {
      preferredTerminal: defaultTerminal,
      layoutMode: 'columns',
      language: 'en', // English default
      ides: defaultIdes
    },
    groups: [
      {
        id: 'group-default-tools',
        name: "CachyOS System & Tools",
        color: "cyan"
      },
      {
        id: 'group-web-apps',
        name: "Web Apps & AI Projects",
        color: "violet"
      }
    ],
    projects: [
      {
        id: 'proj-amdgpu-webui',
        name: "AMDGPU WebUI",
        groupId: "group-web-apps",
        path: path.join(os.homedir(), "projects/amdgpu-webui"),
        icon: "Activity",
        description: "Stable Diffusion WebUI optimized for AMD GPU on CachyOS",
        startConfig: {
          command: "./start-webui-cachyos.sh",
          mode: "terminal-sudo"
        },
        customButtons: [
          {
            id: 'btn-setup-env',
            label: "Setup Env",
            command: "./setup-cachyos-env.sh",
            mode: "terminal"
          }
        ]
      },
      {
        id: 'proj-start-ui',
        name: "Start UI Dashboard",
        groupId: "group-default-tools",
        path: path.resolve(__dirname, '..'),
        icon: "LayoutDashboard",
        description: "Central command hub dashboard for all system tools and projects",
        startConfig: {
          command: "npm run dev --prefix frontend",
          mode: "terminal"
        },
        customButtons: [
          {
            id: 'btn-open-logs',
            label: "Backend Logs",
            command: "tail -f backend.log",
            mode: "terminal"
          }
        ]
      }
    ]
  };
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const dataDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const initial = getInitialConfig();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading config, returning defaults:', err);
    return getInitialConfig();
  }
}

function saveConfig(config) {
  try {
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save config:', err);
    return false;
  }
}

// REST Endpoints
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  config.availableTerminals = getAvailableTerminals();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const success = saveConfig(req.body);
  if (success) {
    res.json({ success: true, message: 'Configuration saved successfully.' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write configuration file.' });
  }
});

// Launch System Endpoints
app.post('/api/launch', (req, res) => {
  const { projectPath, command, mode } = req.body;
  if (!projectPath || !command) {
    return res.status(400).json({ success: false, message: 'Missing projectPath or command' });
  }

  const config = loadConfig();
  let preferredTerminal = config.settings?.preferredTerminal || (process.platform === 'win32' ? 'cmd' : 'alacritty');

  // Cross-platform check: if chosen terminal is not available, fall back to first available terminal
  const available = getAvailableTerminals();
  const isAvailable = available.some(t => t.id === preferredTerminal);
  if (!isAvailable && available.length > 0) {
    console.warn(`Preferred terminal "${preferredTerminal}" is not available on this system. Falling back to "${available[0].id}".`);
    preferredTerminal = available[0].id;
  }

  console.log(`Launching command: "${command}" in folder: "${projectPath}" with mode: "${mode}" using ${preferredTerminal}`);

  try {
    if (mode === 'browser') {
      const openCmd = process.platform === 'win32' ? 'start ""' : 'xdg-open';
      const cmd = `${openCmd} "${command}"`;
      console.log(`Opening browser link: ${cmd}`);
      exec(cmd, (err) => {
        if (err) {
          console.error(`Failed to open browser:`, err);
        }
      });
      return res.json({ success: true, message: 'Browser-Link geöffnet.' });
    } else if (mode === 'direct') {
      // Direct background UI/daemon execution (detached, ignored stdio)
      const child = spawn(command, {
        cwd: projectPath,
        shell: true,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return res.json({ success: true, message: 'Application started in background.' });
    } else {
      // Terminal execution (standard or sudo)
      const isSudo = mode === 'terminal-sudo';
      const actualCommand = isSudo ? (command.startsWith('sudo ') ? command : `sudo ${command}`) : command;
      
      let finalCommand = '';
      const isWin = process.platform === 'win32';
      
      if (isWin) {
        if (preferredTerminal === 'powershell') {
          finalCommand = `start powershell.exe -NoExit -Command "Set-Location '${projectPath}'; ${actualCommand}"`;
        } else {
          // default cmd
          finalCommand = `start cmd.exe /k "cd /d "${projectPath}" && ${actualCommand}"`;
        }
      } else {
        // Linux terminal choices
        if (preferredTerminal === 'alacritty') {
          finalCommand = `alacritty --hold --working-directory "${projectPath}" -e sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'konsole') {
          finalCommand = `konsole --noclose --workdir "${projectPath}" -e sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'gnome-terminal') {
          finalCommand = `gnome-terminal --working-directory="${projectPath}" -- sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'xfce4-terminal') {
          finalCommand = `xfce4-terminal --working-directory="${projectPath}" --hold -e sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'kitty') {
          finalCommand = `kitty --hold --directory "${projectPath}" sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'terminator') {
          finalCommand = `terminator --working-directory="${projectPath}" -e sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'tilix') {
          finalCommand = `tilix -w "${projectPath}" -e sh -c "${actualCommand}; exec $SHELL"`;
        } else if (preferredTerminal === 'mate-terminal') {
          finalCommand = `mate-terminal --working-directory="${projectPath}" -e sh -c "${actualCommand}; exec $SHELL"`;
        } else {
          // fallback to xterm
          finalCommand = `xterm -hold -e sh -c "cd \\"${projectPath}\\" && ${actualCommand}; exec $SHELL"`;
        }
      }

      console.log(`Executing terminal cmd: ${finalCommand}`);
      exec(finalCommand, (err) => {
        if (err) {
          console.error(`Terminal spawn error:`, err);
        }
      });

      return res.json({ success: true, message: 'Interactive terminal window opened.' });
    }
  } catch (err) {
    console.error('Launch exception:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Open Folder in File Manager
app.post('/api/open-folder', (req, res) => {
  const { projectPath } = req.body;
  if (!projectPath) {
    return res.status(400).json({ success: false, message: 'Missing projectPath' });
  }

  const openCmd = process.platform === 'win32' ? 'explorer' : 'xdg-open';
  const cmd = `${openCmd} "${projectPath}"`;
  console.log(`Opening folder: ${cmd}`);
  exec(cmd, (err) => {
    if (err) {
      console.error(`Failed to open folder:`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Folder opened in file browser.' });
  });
});

// Open Folder in IDE
app.post('/api/open-ide', (req, res) => {
  const { projectPath, idePath } = req.body;
  if (!projectPath) {
    return res.status(400).json({ success: false, message: 'Missing projectPath' });
  }

  const targetIdePath = idePath || path.join(os.homedir(), 'Anwendungen/Antigravity IDE/antigravity-ide');
  const cmd = (targetIdePath.includes('/') || targetIdePath.includes(' '))
    ? `"${targetIdePath}" "${projectPath}"`
    : `${targetIdePath} "${projectPath}"`;
  console.log(`Opening folder in IDE: ${cmd}`);
  exec(cmd, (err) => {
    if (err) {
      console.error(`Failed to open in IDE:`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Folder opened in IDE.' });
  });
});

// CPU Temp reader
function getCpuTemp() {
  try {
    if (process.platform === 'win32') {
      return null;
    }
    const hwmonDirs = fs.readdirSync('/sys/class/hwmon');
    for (const dir of hwmonDirs) {
      const namePath = path.join('/sys/class/hwmon', dir, 'name');
      if (fs.existsSync(namePath)) {
        const name = fs.readFileSync(namePath, 'utf-8').trim();
        if (name === 'k10temp' || name === 'coretemp') {
          const tempPath = path.join('/sys/class/hwmon', dir, 'temp1_input');
          if (fs.existsSync(tempPath)) {
            const rawTemp = parseInt(fs.readFileSync(tempPath, 'utf-8').trim(), 10);
            return parseFloat((rawTemp / 1000).toFixed(1));
          }
        }
      }
    }
    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const rawTemp = parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf-8').trim(), 10);
      return parseFloat((rawTemp / 1000).toFixed(1));
    }
  } catch (e) {
    console.error('Error reading CPU temperature:', e);
  }
  return null;
}

// GPU Stats reader (using AMDGPU class/drm sysfs)
function getGpuStats() {
  let usage = null;
  let temp = null;
  try {
    if (process.platform === 'win32') {
      return { usage, temp };
    }
    const cards = fs.readdirSync('/sys/class/drm').filter(c => c.startsWith('card'));
    for (const card of cards) {
      const busyPath = path.join('/sys/class/drm', card, 'device/gpu_busy_percent');
      if (fs.existsSync(busyPath)) {
        usage = parseInt(fs.readFileSync(busyPath, 'utf-8').trim(), 10);
        
        const hwmonPath = path.join('/sys/class/drm', card, 'device/hwmon');
        if (fs.existsSync(hwmonPath)) {
          const hwmons = fs.readdirSync(hwmonPath);
          if (hwmons.length > 0) {
            const tempPath = path.join(hwmonPath, hwmons[0], 'temp1_input');
            if (fs.existsSync(tempPath)) {
              const rawTemp = parseInt(fs.readFileSync(tempPath, 'utf-8').trim(), 10);
              temp = parseFloat((rawTemp / 1000).toFixed(1));
            }
          }
        }
        break;
      }
    }
    if (temp === null) {
      const hwmonDirs = fs.readdirSync('/sys/class/hwmon');
      for (const dir of hwmonDirs) {
        const namePath = path.join('/sys/class/hwmon', dir, 'name');
        if (fs.existsSync(namePath)) {
          const name = fs.readFileSync(namePath, 'utf-8').trim();
          if (name === 'amdgpu') {
            const tempPath = path.join('/sys/class/hwmon', dir, 'temp1_input');
            if (fs.existsSync(tempPath)) {
              const rawTemp = parseInt(fs.readFileSync(tempPath, 'utf-8').trim(), 10);
              temp = parseFloat((rawTemp / 1000).toFixed(1));
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading GPU stats:', e);
  }
  return { usage, temp };
}

// RAM Usage reader
function getRamUsage() {
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
    const totalMatch = meminfo.match(/^MemTotal:\s+(\d+)\s+kB/m);
    const availMatch = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    if (totalMatch && availMatch) {
      const totalKb = parseInt(totalMatch[1], 10);
      const availKb = parseInt(availMatch[1], 10);
      const usedKb = totalKb - availKb;
      
      const totalGb = parseFloat((totalKb / (1024 * 1024)).toFixed(1));
      const usedGb = parseFloat((usedKb / (1024 * 1024)).toFixed(1));
      return { used: usedGb, total: totalGb, unit: 'GB' };
    }
  } catch (e) {
    console.error('Error reading RAM info:', e);
  }
  const totalGb = parseFloat((os.totalmem() / (1024 * 1024 * 1024)).toFixed(1));
  const freeGb = parseFloat((os.freemem() / (1024 * 1024 * 1024)).toFixed(1));
  const usedGb = parseFloat((totalGb - freeGb).toFixed(1));
  return { used: usedGb, total: totalGb, unit: 'GB' };
}

// Disk Space reader
function getDiskSpace() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('powershell -Command "Get-Volume -DriveLetter C | Select-Object Size,SizeRemaining | ConvertTo-Json"', (err, stdout) => {
        if (err) {
          console.error('Error reading disk space on Windows:', err);
          return resolve({ used: 0, total: 0, unit: 'GB' });
        }
        try {
          const data = JSON.parse(stdout.trim());
          const totalGb = parseFloat((data.Size / (1024 * 1024 * 1024)).toFixed(1));
          const freeGb = parseFloat((data.SizeRemaining / (1024 * 1024 * 1024)).toFixed(1));
          const usedGb = parseFloat((totalGb - freeGb).toFixed(1));
          return resolve({ used: usedGb, total: totalGb, unit: 'GB' });
        } catch (e) {
          return resolve({ used: 0, total: 0, unit: 'GB' });
        }
      });
    } else {
      exec('df -k /', (err, stdout) => {
        if (err) {
          console.error('Error reading disk space:', err);
          return resolve({ used: 0, total: 0, unit: 'GB' });
        }
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].replace(/\s+/g, ' ').split(' ');
          if (parts.length >= 4) {
            const totalKb = parseInt(parts[1], 10);
            const usedKb = parseInt(parts[2], 10);
            const totalGb = parseFloat((totalKb / (1024 * 1024)).toFixed(1));
            const usedGb = parseFloat((usedKb / (1024 * 1024)).toFixed(1));
            return resolve({ used: usedGb, total: totalGb, unit: 'GB' });
          }
        }
        resolve({ used: 0, total: 0, unit: 'GB' });
      });
    }
  });
}

// REST Monitoring API endpoint
app.get('/api/monitoring', async (req, res) => {
  const startCpus = os.cpus().map(cpu => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return { idle, total };
  });

  const parseNet = () => {
    try {
      if (process.platform === 'win32') {
        return { rx: 0, tx: 0 };
      }
      const content = fs.readFileSync('/proc/net/dev', 'utf-8');
      const lines = content.split('\n');
      let rx = 0;
      let tx = 0;
      for (const line of lines) {
        const parts = line.trim().split(':');
        if (parts.length === 2) {
          const iface = parts[0].trim();
          if (/^(en|wl|eth)/.test(iface)) {
            const stats = parts[1].trim().split(/\s+/);
            rx += parseInt(stats[0], 10) || 0;
            tx += parseInt(stats[8], 10) || 0;
          }
        }
      }
      return { rx, tx };
    } catch (e) {
      return { rx: 0, tx: 0 };
    }
  };

  const startNet = parseNet();

  setTimeout(async () => {
    const endCpus = os.cpus().map(cpu => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return { idle, total };
    });

    let totalDiff = 0;
    let idleDiff = 0;
    for (let i = 0; i < startCpus.length; i++) {
      totalDiff += endCpus[i].total - startCpus[i].total;
      idleDiff += endCpus[i].idle - startCpus[i].idle;
    }
    const cpuUsage = totalDiff === 0 ? 0 : 100 - Math.round((100 * idleDiff) / totalDiff);

    const endNet = parseNet();
    const rxSpeed = Math.max(0, (endNet.rx - startNet.rx) / (1024 * 0.5)); // KB/s
    const txSpeed = Math.max(0, (endNet.tx - startNet.tx) / (1024 * 0.5)); // KB/s

    const formatSpeed = (kbps) => {
      if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
      return `${kbps.toFixed(1)} KB/s`;
    };

    const cpuTemp = getCpuTemp();
    const gpuStats = getGpuStats();
    const ramUsage = getRamUsage();
    const diskSpace = await getDiskSpace();

    res.json({
      cpu: {
        usage: cpuUsage,
        temp: cpuTemp
      },
      gpu: {
        usage: gpuStats.usage,
        temp: gpuStats.temp
      },
      ram: ramUsage,
      disk: diskSpace,
      network: {
        download: formatSpeed(rxSpeed),
        upload: formatSpeed(txSpeed)
      }
    });
  }, 500);
});

// Serve local files securely for images / backgrounds
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).send('Missing path parameter');
  }

  // Safety check: ensure file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Start UI local backend server is running on http://localhost:${PORT}`);
});
