# QuantumXfer Enterprise

<div align="center">

![QuantumXfer Logo](assets/logo.png)

# ⚡ QuantumXfer Enterprise
## Professional SSH/SFTP Client

**Enterprise-Grade Security • Advanced Management • Modern UI/UX**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-green.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](#installation)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#building-from-source)
[![Tests](https://img.shields.io/badge/tests-42%20passing-success.svg)](#testing)

[📥 Download](#download) • [📖 Documentation](#documentation) • [🚀 Quick Start](#quick-start) • [🛠️ Building](#building-from-source) • [🧪 Testing](#testing)

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

### Available Releases v1.2.0

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
2. Click "New Connection" button
3. Enter your SSH server details:
   - Host: your-server.com
   - Port: 22
   - Username: your-username
   - Password or SSH Key
4. Click "Connect"

### 3. Start Working
- Execute commands in the terminal
- Browse files using the integrated SFTP client
- Transfer files with drag & drop
- Save connection profiles for quick access

---

## 🛠️ Building from Source

### Prerequisites
- **Node.js** 22.0.0 or higher
- **npm** 10.0.0 or higher
- **Docker** (for integration testing)

### Setup
```bash
# Clone the repository
git clone https://github.com/shavali-arc/quantumxfer.git
cd quantumxfer

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

## 🧪 Testing

QuantumXfer has comprehensive test coverage with unit, integration, and E2E tests.

### Test Statistics
- **Total Tests**: 400+ (42 integration + 350+ unit tests)
- **Coverage**: 90%+ (statement, line, function)
- **Framework**: Vitest 2.1.9
- **Integration**: Docker-based OpenSSH server

### Quick Test Commands

```bash
# Run all tests
npm test

# Run integration tests with Docker SSH server
npm run test:integration:ssh

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage
```

### Integration Testing

We use a Docker-based OpenSSH server for realistic integration testing:

```bash
# Start SSH test server
npm run test:ssh-up

# Run integration tests
npm test -- tests/integration/ --run

# Stop SSH test server
npm run test:ssh-down
```

**Integration Test Coverage:**
- ✅ SSH connection establishment (13 tests)
- ✅ Command execution (9 tests)
- ✅ Concurrency & pooling (11 tests)
- ✅ File operations & SFTP (9 tests)

### CI/CD Testing

Integration tests run automatically in GitHub Actions on:
- Push to main or feature branches
- Pull requests to main
- Uses Docker services for SSH server
- Uploads test results as artifacts

---

## 📖 Documentation

### Getting Started
- **[🚀 Quick Start Guide](VALIDATION-QUICK-START.md)** - Get started in 5 minutes
- **[📋 Installation Guide](INSTALLATION.md)** - Detailed installation instructions

### Testing Documentation
- **[🧪 Integration Testing Guide](INTEGRATION-TESTING-GUIDE.md)** - Docker-based SSH integration testing
- **[📝 Testing Guide](TESTING-GUIDE.md)** - Complete testing guide including WSL setup
- **[🔬 Test Results](.github/workflows/integration-tests.yml)** - CI/CD test automation

### Validation Framework Documentation (Phase 5 Complete ✅)
- **[📚 Developer Guide](VALIDATION-DEVELOPER-GUIDE.md)** - Complete validation framework documentation
- **[💻 Handler Usage Examples](HANDLER-USAGE-EXAMPLES.md)** - 100+ code examples for all handlers
- **[⚠️ Error Codes Reference](ERROR-CODES-REFERENCE.md)** - All 30+ error codes with solutions
- **[🔐 Security Best Practices](SECURITY-BEST-PRACTICES.md)** - Enterprise security guidelines
- **[✅ Phase 5 Completion Report](PHASE5-COMPLETION-REPORT.md)** - Documentation status and summary

### Development
- **[🔧 Handler Integration Guide](HANDLER-INTEGRATION-GUIDE.md)** - Integration patterns and examples
- **[📊 Issues Summary](ISSUES_SUMMARY.md)** - GitHub issues tracking

---

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](CONTRIBUTING.md)** for detailed workflow and guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Make your changes
2. Run tests: `npm test`
3. Run integration tests: `npm run test:integration:ssh`
4. Ensure linting passes: `npm run lint`
5. Build successfully: `npm run build`

---

## 📊 Project Status

### Completed Features ✅
- Core SSH/SFTP functionality
- Input validation framework (626 tests)
- Docker-based integration testing (42 tests)
- CI/CD automation with GitHub Actions
- Comprehensive documentation

### In Progress 🔄
- Issue #74: Functional/Blackbox Testing (Phase 1 complete)
- Issue #85: Docker SSH test server (Infrastructure complete)
- E2E testing with Spectron (Planned)

### Upcoming 📅
- Performance testing framework
- Additional protocol support (REST API, Database, WebSocket)
- Enhanced security features

---

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/shavali-arc/quantumxfer/issues)
- **Email**: support@quantumxfer.enterprise
- **Documentation**: Full documentation available in repository

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by the QuantumXfer Team**

© 2025 QuantumXfer Enterprise. All rights reserved.

</div>
