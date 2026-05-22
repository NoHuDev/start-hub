# Start Hub Dashboard

Start Hub is a premium, localized, high-performance command hub and project launcher dashboard. Originally optimized for Linux (with first-class support for Arch-based distributions like CachyOS) and fully adaptable to Windows, it provides a centralized interface to manage, launch, and monitor local development projects, system tools, web applications, and game servers.

By coupling a responsive React + TypeScript frontend with a lightweight Node.js Express backend, Start Hub provides immediate desktop integration, native terminal launching (standard, sudo, or detached background mode), instant directory exploration, and real-time hardware performance monitoring.

---

## Key Features

* **Multi-Mode Project Launcher**: Launch system tools, docker containers, or scripts with a single click. Supports interactive terminal windows, sudo-authenticated terminals, detached background processes (daemons), and local web browser links.
* **Real-time System Monitoring**: Dynamic widgets reporting live hardware statistics directly from system APIs and `/sysfs`, including:
  * CPU usage percentage and core temperatures.
  * GPU usage and temperatures (first-class AMDGPU support via DRM sysfs).
  * Memory (RAM) load.
  * Root disk storage capacity.
  * Real-time network interface speed tracking (upload/download rates).
* **Deep IDE & Workspace Integration**: Register your favorite IDEs (such as VS Code, Antigravity IDE, or Code OSS) and launch any workspace directory directly into your editor with a single button click.
* **Dynamic Grid and Column Layouts**: Customize your command station with drag-and-drop groups, customizable color categories, and modular dashboard widgets.
* **Native Desktop Launcher**: Built-in installer script that registers Start Hub as a native Linux desktop application (`.desktop` entry), allowing you to start the dashboard directly from your system application menu.
* **Comprehensive Internationalization**: Fully translated interface supporting multiple languages (English, German, Spanish, French) with automatic browser locale detection.

---

## Technical Architecture

Start Hub is designed with a decoupled client-server architecture:

```
                  +-----------------------------------+
                  |        Web Browser Client         |
                  |     (React, Vite, TypeScript)     |
                  +-----------------+---------------+
                                    |
                                    | REST API & Sysfs Data
                                    v
                  +-----------------+---------------+
                  |       Local Backend Server        |
                  |         (Node.js, Express)        |
                  +--------+----------------+-------+
                           |                |
             System Calls  |                |  File I/O
             & Process Spawns               |  (projects.json)
                           v                v
                  +--------+-----+   +------+-------+
                  |  OS Terminal |   | Local Config |
                  |   Emulators  |   |    Storage   |
                  +--------------+   +--------------+
```

### Frontend Stack
* **Framework**: React 19 + TypeScript
* **Build System**: Vite 8
* **Styling**: Vanilla CSS utilizing premium modern design guidelines (glassmorphism, subtle micro-animations, neon-accented borders, custom scrollbars, and dark mode color systems).
* **Icons**: Lucide React

### Backend Stack
* **Server**: Node.js + Express
* **Hardware Telemetry**: Direct system readings from `/proc/meminfo`, `/proc/net/dev`, `/sys/class/hwmon`, and `/sys/class/drm` to guarantee near-zero CPU overhead.
* **State Persistence**: Local JSON-based storage (`backend/data/projects.json`) created automatically with robust defaults upon first run.

---

## Screenshots Plan

To complete this documentation, capture high-quality screenshots of your dashboard in action and place them in a directory named `docs/images/`. Use the planned spots below:

### 1. Dashboard Overview (Grid Layout)
* **Placeholder Location**: `docs/images/dashboard-grid.png`
* **Content**: The main dashboard screen showing a fully populated grid of projects, customized groups with colorful title categories (cyan, violet, emerald, rose), and the active system monitoring widget in the left column.
* **Dimensions**: Recommended 1920x1080 resolution, full dark mode theme active.

### 2. System Monitoring & Metrics Detail
* **Placeholder Location**: `docs/images/system-monitoring.png`
* **Content**: Close-up of the System Monitoring column showing real-time CPU/GPU load graphs, temperatures, RAM consumption, and network interface activity showing upload/download speeds.
* **Dimensions**: Recommended 800x600 crop.

### 3. Project Configuration & Creation Dialog
* **Placeholder Location**: `docs/images/project-modal.png`
* **Content**: The "Create Project" or "Edit Project" modal window open, demonstrating the preset icon selection grid, the custom image path fields, the native color picker, and the IDE selection dropdowns.
* **Dimensions**: Recommended 1200x900 resolution.

---

## System Requirements

* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

---

## Installation & Setup

Start Hub includes convenient, automated installers and launchers for both Linux and Windows.

### Linux Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/start-hub.git
   cd start-hub
   ```

2. **Run the installation script**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
   *This script verifies your Node.js/npm environments, installs root, backend, and frontend dependencies, and registers a Linux desktop application launcher in `~/.local/share/applications/start-hub.desktop`.*

3. **Start the application**:
   ```bash
   ./start.sh
   ```
   *The launcher starts both the Express API and Vite React development server concurrently, logging details to local log files, and automatically displays the frontend location (`http://localhost:5173`).*

4. **Updating Start Hub**:
   ```bash
   ./update.sh
   ```
   *Pulls the latest changes from GitHub, updates dependencies, and refreshes directory permissions.*

### Windows Setup

1. **Clone the repository**:
   ```cmd
   git clone https://github.com/your-username/start-hub.git
   cd start-hub
   ```

2. **Run the installer**:
   ```cmd
   install.bat
   ```

3. **Start the application**:
   ```cmd
   start.bat
   ```

4. **Updating**:
   ```cmd
   update.bat
   ```

---

## Configuration Guide

Start Hub does not require manual file editing. All configurations can be updated directly within the web interface.

### Project Launch Modes

When adding or editing a project or command tile, you can choose from five execution modes:

| Mode | Behavior | Best Used For |
| :--- | :--- | :--- |
| **Terminal** | Opens the project command in an interactive host terminal window. | CLI tools, dev servers, compilers |
| **Terminal (Sudo)** | Automatically prepends `sudo` and launches in a host terminal window. | System commands, service management |
| **Direct** | Spawns the process as a detached background daemon, ignoring stdout/stderr. | AppImages, desktop launchers, web browser targets |
| **Browser** | Opens a web URL or host link directly in your system default browser. | Web UI tools, hosted services, document links |
| **Disabled** | Disables clicking/launching capabilities, showing only description or logs. | Folder containers, reference lists |

### Local Persistence & Safety

Your customized dashboard settings are persisted locally in `backend/data/projects.json`.
* **Important**: This directory is automatically added to the `.gitignore` configuration. Your personal filesystems, folders, and private server paths are never shared, exposed, or committed to GitHub.
* Upon first startup, Start Hub checks for the existence of this configuration file and automatically initializes it with a highly functional, safe template structure.

---

## Troubleshooting

### Real-Time GPU Metrics Missing
Start Hub parses AMDGPU statistics from standard `/sys` directories. Ensure your GPU drivers are configured and `/sys/class/drm/card0/device/gpu_busy_percent` is readable.

### Sudo Commands Failing
Ensure your user account has active sudo privileges. If your sudo setup requires password input, the launcher will automatically await your input inside the terminal window that opens.

### Preferred Terminal Emulator Not Opening
If your preferred terminal (e.g. Alacritty, Konsole) is selected in settings but fails to launch, verify that the binary is available in your system `$PATH`. Start Hub will automatically fall back to the first available terminal on your host (e.g. XTerm) if a mismatch occurs.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
