# QuantumXfer Enterprise

<div align="center">

![QuantumXfer Logo](assets/logo.png)

# ⚡ QuantumXfer Enterprise
## Professional ### Building Packages

#### All Platforms (Automated)
```bash
# Create all release packages
npm run build
./create-releases.bat  # Windows
# or
chmod +x build.sh && ./build.sh  # Linux/macOS

# Individual platform builds using electron-packager
npx electron-packager . "QuantumXfer Enterprise" --platform=win32 --arch=x64 --out=dist-packager --overwrite
npx electron-packager . "QuantumXfer Enterprise" --platform=linux --arch=x64 --out=dist-packager --overwrite
```

#### Manual Building
```bash
# Build web application
npm run build

# Package for specific platforms
npm run electron:build:win     # Windows only
npm run electron:build:linux   # Linux only
npm run electron:build:all     # All platforms
```*Enterprise-Grade Security • Advanced Management • Modern UI/UX**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](#installation)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#building-from-source)

[📥 Download](#download) • [📖 Documentation](#documentation) • [🚀 Quick Start](#quick-start) • [🛠️ Building](#building-from-source)

</div>

---

## 🌟 Features

### 🛡️ Enterprise Security
- **SSH Key Authentication** with passphrase support
- **Multi-Factor Authentication (MFA)** for enhanced security
- **Jump Host Support** for secure network access
- **Encrypted Password Storage** with local encryption
- **Session Security Monitoring** and audit trails

### 📊 Advanced Management
- **Connection Profile Management** with favorites and tagging
- **Session Analytics** with usage statistics and time tracking
- **Command History** per profile with arrow key navigation
- **Advanced Search & Filtering** across all profiles
- **Bulk Import/Export** of connection profiles

### 📁 Integrated SFTP Client
- **Drag & Drop File Transfers** with progress tracking
- **Batch File Operations** for efficient management
- **Remote File Browser** with intuitive navigation
- **Transfer Queue Management** with retry capabilities
- **File Permission Management** and metadata viewing

### 💻 Modern Terminal Experience
- **PowerShell-Style Interface** for familiar experience
- **Multi-Tab Support** with independent sessions
- **Auto-Save Session Logging** with configurable storage
- **Intelligent Auto-Focus** for seamless typing
- **Custom Command Aliases** and shortcuts

### 🎨 Professional UI/UX
- **Enterprise Branding** with professional gradients
- **Dark/Light Theme Support** with system integration
- **Responsive Design** optimized for all screen sizes
- **Accessibility Features** with keyboard navigation
- **High DPI Support** for crystal-clear displays

---

## 📥 Download

✅ **Ready for Download!** All packages have been successfully built and tested.

### Available Releases v1.0.0

| Platform | Architecture | Download | Size |
|----------|-------------|----------|------|
| **Windows** | x64 (Intel/AMD) | [QuantumXfer-Enterprise-Windows-x64.zip](dist-packager/QuantumXfer-Enterprise-Windows-x64.zip) | ~275 MB |
| **Windows** | ARM64 | [QuantumXfer-Enterprise-Windows-ARM64.zip](dist-packager/QuantumXfer-Enterprise-Windows-ARM64.zip) | ~274 MB |
| **Linux** | x64 (Intel/AMD) | [QuantumXfer-Enterprise-Linux-x64.zip](dist-packager/QuantumXfer-Enterprise-Linux-x64.zip) | ~265 MB |
| **Linux** | ARM64 | [QuantumXfer-Enterprise-Linux-ARM64.zip](dist-packager/QuantumXfer-Enterprise-Linux-ARM64.zip) | ~265 MB |

> **Note**: All builds are portable versions that don't require installation. Simply extract and run!

### Quick Installation

**Windows:**
1. Download the appropriate ZIP file for your architecture
2. Extract to desired location (e.g., `C:\QuantumXfer Enterprise\`)
3. Run `QuantumXfer Enterprise.exe`

**Linux:**
1. Download the appropriate ZIP file for your architecture
2. Extract: `unzip QuantumXfer-Enterprise-Linux-x64.zip`
3. Make executable: `chmod +x "QuantumXfer Enterprise"`
4. Run: `."QuantumXfer Enterprise"`

---

## 🚀 Quick Start

### 1. Install QuantumXfer
Download and install the appropriate package for your platform from the [download section](#download).

### 2. First Connection
1. Launch QuantumXfer Enterprise
2. Fill in your SSH server details:
   ```
   Host: your-server.com
   Username: your-username
   Password: your-password
   Profile Name: My Server (optional)
   ```
3. Click "🚀 Connect to SSH Server"
4. Start using your SSH terminal!

### 3. Enable SFTP
- Click "📁 Show SFTP" in the terminal tab
- Upload/download files with drag & drop
- Manage remote files with the integrated browser

---

## 🛠️ Building from Source

### Prerequisites
- **Node.js** 16.0.0 or higher
- **npm** 8.0.0 or higher

### Setup
```bash
# Clone the repository
git clone https://github.com/quantumxfer/quantumxfer-enterprise.git
cd quantumxfer-enterprise

# Install dependencies
npm install

# Build the application
npm run build
```

### Building Packages

#### Windows
```cmd
# Build for Windows
build.bat --target windows

# Build for all platforms
build.bat
```

#### Linux/macOS
```bash
# Make script executable
chmod +x build.sh

# Build for Linux
./build.sh --target linux

# Build for all platforms
./build.sh
```

### Development Mode
```bash
# Start development server with hot reload
npm run electron:dev

# Or run web version only  
npm run dev
```

---

## 📖 Documentation

### Getting Started
- **[🚀 Quick Start Guide](VALIDATION-QUICK-START.md)** - Get started in 5 minutes
- **[📋 Installation Guide](INSTALLATION.md)** - Detailed installation instructions

### Validation Framework Documentation (Phase 5 Complete ✅)
- **[📚 Developer Guide](VALIDATION-DEVELOPER-GUIDE.md)** - Complete validation framework documentation
- **[💻 Handler Usage Examples](HANDLER-USAGE-EXAMPLES.md)** - 100+ code examples for all handlers
- **[⚠️ Error Codes Reference](ERROR-CODES-REFERENCE.md)** - All 30+ error codes with solutions
- **[🔐 Security Best Practices](SECURITY-BEST-PRACTICES.md)** - Enterprise security guidelines
- **[✅ Phase 5 Completion Report](PHASE5-COMPLETION-REPORT.md)** - Documentation status and summary

---

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/quantumxfer/quantumxfer-enterprise/issues)
- **Email**: support@quantumxfer.enterprise
- **Documentation**: [docs.quantumxfer.enterprise](https://docs.quantumxfer.enterprise)

---

<div align="center">

**Made with ❤️ by the QuantumXfer Team**

© 2025 QuantumXfer Enterprise. All rights reserved.

</div>
