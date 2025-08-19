# QuantumXfer Enterprise - Installation Guide

<div align="center">

![QuantumXfer Logo](assets/logo.png)

# QuantumXfer Enterprise
## Professional SSH/SFTP Client

**Enterprise-Grade Security • Advanced Management • Modern UI/UX**

</div>

---

## 📋 Table of Contents

- [System Requirements](#system-requirements)
- [Download Options](#download-options)
- [Windows Installation](#windows-installation)
- [Linux Installation](#linux-installation)
- [macOS Installation](#macos-installation)
- [Portable Version](#portable-version)
- [Post-Installation Setup](#post-installation-setup)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

---

## 🖥️ System Requirements

### Minimum Requirements

| Platform | OS Version | RAM | Disk Space | Additional |
|----------|------------|-----|------------|------------|
| **Windows** | Windows 10 v1903+ | 4 GB | 200 MB | .NET Framework 4.7.2+ |
| **Linux** | Ubuntu 18.04+ / CentOS 7+ | 4 GB | 200 MB | GTK+ 3.0, glibc 2.17+ |
| **macOS** | macOS 10.15+ | 4 GB | 200 MB | - |

### Recommended Requirements

| Platform | OS Version | RAM | Disk Space | Additional |
|----------|------------|-----|------------|------------|
| **Windows** | Windows 11 | 8 GB+ | 500 MB | Hardware acceleration |
| **Linux** | Ubuntu 22.04+ | 8 GB+ | 500 MB | Wayland/X11 support |
| **macOS** | macOS 12+ | 8 GB+ | 500 MB | Apple Silicon optimized |

---

## 📥 Download Options

✅ **Ready for Download!** All packages have been successfully built and tested.

### Official Releases

All release packages are available in the `dist-packager` folder. Choose your platform and architecture:

### Platform-Specific Downloads

#### Windows
- **x64 (Intel/AMD)**: `QuantumXfer-Enterprise-Windows-x64.zip` (~275 MB)
- **ARM64**: `QuantumXfer-Enterprise-Windows-ARM64.zip` (~274 MB)

#### Linux
- **x64 (Intel/AMD)**: `QuantumXfer-Enterprise-Linux-x64.zip` (~265 MB)
- **ARM64**: `QuantumXfer-Enterprise-Linux-ARM64.zip` (~265 MB)

> **Note**: All builds are portable versions that don't require traditional installation. Simply extract and run!

---

## 🪟 Windows Installation

### Portable Version (No Installation Required)

1. **Download** the Windows package:
   - For Intel/AMD 64-bit: `QuantumXfer-Enterprise-Windows-x64.zip`
   - For ARM64 devices: `QuantumXfer-Enterprise-Windows-ARM64.zip`

2. **Extract the Archive**:
   - Right-click the downloaded ZIP file
   - Select "Extract All..." or use your preferred archive tool
   - Choose a destination folder (e.g., `C:\QuantumXfer Enterprise\`)

3. **Run the Application**:
   - Navigate to the extracted folder
   - Double-click `QuantumXfer Enterprise.exe`
   - The application will start immediately

4. **Optional Setup**:
   - Create a desktop shortcut by right-clicking the executable
   - Pin to taskbar for quick access
   - Add the folder to your PATH for command-line access

> **Security Note**: Windows may show a "Windows protected your PC" warning. Click "More info" then "Run anyway" as this is an unsigned application.

### Method 2: Windows Package Manager (winget)

```powershell
# Install via winget (when available)
winget install QuantumXfer.Enterprise
```

### Method 3: Chocolatey (when available)

```powershell
# Install via Chocolatey
choco install quantumxfer-enterprise
```

### Windows Security Considerations

- **Windows Defender**: The application is unsigned initially. Add to exclusions if needed:
  ```
  Windows Security → Virus & threat protection → Add exclusions → Folder
  Add: C:\Program Files\QuantumXfer Enterprise\
  ```

- **Firewall**: Allow network access when prompted for SSH/SFTP functionality

---

## 🐧 Linux Installation

### Portable Version (No Installation Required)

1. **Download** the Linux package:
   - For Intel/AMD 64-bit: `QuantumXfer-Enterprise-Linux-x64.zip`
   - For ARM64 devices: `QuantumXfer-Enterprise-Linux-ARM64.zip`

2. **Extract the Archive**:
   ```bash
   # Download and extract
   unzip QuantumXfer-Enterprise-Linux-x64.zip
   cd "QuantumXfer Enterprise-linux-x64"
   ```

3. **Make Executable**:
   ```bash
   chmod +x "QuantumXfer Enterprise"
   ```

4. **Run the Application**:
   ```bash
   ./"QuantumXfer Enterprise"
   ```

### Optional: Create Desktop Entry

For easier access, create a desktop entry:

```bash
# Create desktop entry
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/quantumxfer-enterprise.desktop << EOF
[Desktop Entry]
Name=QuantumXfer Enterprise
Comment=Professional SSH/SFTP Client
Exec=$PWD/QuantumXfer Enterprise
Icon=$PWD/resources/app/assets/icon.png
Terminal=false
Type=Application
Categories=Network;Development;
EOF

# Make it executable
chmod +x ~/.local/share/applications/quantumxfer-enterprise.desktop
```

### Create System-wide Installation (Optional)

```bash
# Move to system directory (requires sudo)
sudo mv "QuantumXfer Enterprise-linux-x64" /opt/quantumxfer-enterprise
sudo ln -s "/opt/quantumxfer-enterprise/QuantumXfer Enterprise" /usr/local/bin/quantumxfer-enterprise

# Create system-wide desktop entry
sudo cat > /usr/share/applications/quantumxfer-enterprise.desktop << EOF
[Desktop Entry]
Name=QuantumXfer Enterprise
Comment=Professional SSH/SFTP Client
Exec=/opt/quantumxfer-enterprise/QuantumXfer Enterprise
Icon=/opt/quantumxfer-enterprise/resources/app/assets/icon.png
Terminal=false
Type=Application
Categories=Network;Development;
EOF
```

### Linux Dependencies

Most dependencies are bundled, but you may need:

```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-0 libnotify4 libnss3 libgconf-2-4 libappindicator1

# CentOS/RHEL
sudo yum install gtk3 libnotify nss GConf2

# Arch Linux
sudo pacman -S gtk3 libnotify nss gconf
```

---

## 🍎 macOS Installation

### Method 1: DMG Installer (Recommended)

1. **Download** the DMG file for your architecture:
   - Intel: `QuantumXfer-Enterprise-1.0.0-x64.dmg`
   - Apple Silicon: `QuantumXfer-Enterprise-1.0.0-arm64.dmg`

2. **Mount the DMG**:
   - Double-click the downloaded DMG file
   - A window will open showing the QuantumXfer Enterprise app

3. **Install the Application**:
   - Drag "QuantumXfer Enterprise" to the "Applications" folder
   - Wait for the copy to complete

4. **First Launch**:
   - Open Finder → Applications
   - Right-click "QuantumXfer Enterprise" → Open
   - Click "Open" when macOS security warning appears

### Method 2: Homebrew (when available)

```bash
# Install via Homebrew Cask
brew install --cask quantumxfer-enterprise
```

### macOS Security Considerations

- **Gatekeeper**: The app may require manual approval:
  ```
  System Preferences → Security & Privacy → General → "Open Anyway"
  ```

- **Privacy Permissions**: Grant necessary permissions:
  - Network access for SSH/SFTP
  - File system access for SFTP operations
  - Notifications (optional)

---

## 🎒 Portable Version

### Windows Portable

1. **Download** `QuantumXfer-Enterprise-1.0.0-portable.exe`
2. **Run** the executable directly (no installation required)
3. **Data Storage**: All settings stored in `./data/` relative to executable

### Benefits of Portable Version

- ✅ No installation required
- ✅ Can run from USB drive
- ✅ No registry modifications
- ✅ Isolated settings and data
- ✅ Perfect for testing or temporary use

---

## ⚙️ Post-Installation Setup

### First Launch Configuration

1. **Welcome Screen**:
   - Choose your preferred theme (Dark/Light)
   - Set up logs directory (optional)
   - Configure auto-update preferences

2. **Initial Settings**:
   ```
   File → Preferences → General
   ```
   - Default connection settings
   - Security preferences
   - UI customization

3. **Create Your First Profile**:
   - Click "New Connection"
   - Fill in SSH server details
   - Save as profile for future use

### Directory Structure

```
QuantumXfer Enterprise/
├── app/                    # Application files
├── data/                   # User data (portable only)
├── logs/                   # Application logs
├── profiles/               # Connection profiles
└── settings/               # User settings
```

### Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `settings.json` | User data dir | Application settings |
| `profiles.json` | User data dir | Connection profiles |
| `logs/` | User data dir | Session and application logs |

---

## 🔧 Troubleshooting

### Common Issues

#### Windows Issues

**Issue**: "App can't be opened" security warning
```
Solution:
1. Right-click the installer
2. Select Properties → Unblock
3. Run as administrator
```

**Issue**: Missing Visual C++ Redistributables
```
Solution:
Download and install Microsoft Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe
```

#### Linux Issues

**Issue**: AppImage won't run
```bash
# Check permissions
chmod +x QuantumXfer-Enterprise-*.AppImage

# Check FUSE
sudo apt-get install fuse libfuse2
```

**Issue**: Missing dependencies
```bash
# Install missing libraries
sudo apt-get install libgtk-3-0 libnotify4 libnss3
```

#### macOS Issues

**Issue**: "App is damaged" message
```bash
# Remove quarantine attribute
sudo xattr -rd com.apple.quarantine "/Applications/QuantumXfer Enterprise.app"
```

**Issue**: Performance on Apple Silicon
```
Solution: Download the native ARM64 version for better performance
```

### Log Files

Access application logs for debugging:

- **Windows**: `%APPDATA%\QuantumXfer Enterprise\logs\`
- **Linux**: `~/.config/QuantumXfer Enterprise/logs/`
- **macOS**: `~/Library/Application Support/QuantumXfer Enterprise/logs/`

### Getting Help

1. **Documentation**: Check the built-in help system
2. **GitHub Issues**: Report bugs at our [GitHub repository](https://github.com/quantumxfer/quantumxfer-enterprise/issues)
3. **Community**: Join our [Discord server](https://discord.gg/quantumxfer) for support

---

## 🗑️ Uninstallation

### Windows

#### Standard Installation
```
Settings → Apps → QuantumXfer Enterprise → Uninstall
```

#### Manual Removal
```powershell
# Remove application files
Remove-Item "C:\Program Files\QuantumXfer Enterprise" -Recurse -Force

# Remove user data (optional)
Remove-Item "$env:APPDATA\QuantumXfer Enterprise" -Recurse -Force
```

### Linux

#### Package Installation
```bash
# Debian/Ubuntu
sudo apt remove quantumxfer-enterprise

# Red Hat/CentOS
sudo rpm -e quantumxfer-enterprise
```

#### Manual Installation
```bash
# Remove application
sudo rm -rf /opt/QuantumXfer-Enterprise
sudo rm /usr/local/bin/quantumxfer-enterprise

# Remove user data (optional)
rm -rf ~/.config/QuantumXfer\ Enterprise
rm ~/.local/share/applications/quantumxfer-enterprise.desktop
```

### macOS

#### Application Removal
```bash
# Remove application
sudo rm -rf "/Applications/QuantumXfer Enterprise.app"

# Remove user data (optional)
rm -rf "~/Library/Application Support/QuantumXfer Enterprise"
rm -rf "~/Library/Preferences/com.quantumxfer.enterprise.plist"
```

---

## 📞 Support

### Technical Support

- **Email**: support@quantumxfer.enterprise
- **Documentation**: [docs.quantumxfer.enterprise](https://docs.quantumxfer.enterprise)
- **GitHub**: [github.com/quantumxfer/quantumxfer-enterprise](https://github.com/quantumxfer/quantumxfer-enterprise)

### Community

- **Discord**: [discord.gg/quantumxfer](https://discord.gg/quantumxfer)
- **Reddit**: [r/QuantumXfer](https://reddit.com/r/QuantumXfer)
- **Stack Overflow**: Tag your questions with `quantumxfer`

---

<div align="center">

**Made with ❤️ by the QuantumXfer Team**

© 2025 QuantumXfer Enterprise. All rights reserved.

</div>
