# CI/CD Pipeline Setup for QuantumXfer

## 📋 CI/CD Strategy Overview

### **Goals:**
- ✅ **Automated Builds**: Build for Windows, Linux, and macOS
- ✅ **Cross-Platform Testing**: Run tests on all platforms
- ✅ **Release Automation**: Create GitHub releases with installers
- ✅ **Quality Assurance**: Lint, test, and validate code
- ✅ **Deployment**: Publish to GitHub Releases

## 🚀 GitHub Actions Workflow Setup

### **1. Create Workflow Directory**
```bash
mkdir -p .github/workflows
```

### **2. Main CI/CD Workflow** (`.github/workflows/ci-cd.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  release:
    types: [published]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build for testing
      run: npm run build

  build:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
        include:
          - os: windows-latest
            platform: win
            ext: .exe
          - os: ubuntu-latest
            platform: linux
            ext: .AppImage
          - os: macos-latest
            platform: mac
            ext: .dmg
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build Electron app
      run: npm run electron:build
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: quantumxfer-${{ matrix.platform }}
        path: dist-electron/
        retention-days: 30

  release:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Download all artifacts
      uses: actions/download-artifact@v4
      with:
        path: artifacts/
    
    - name: Create release archives
      run: |
        cd artifacts
        for dir in */; do
          if [ -d "$dir" ]; then
            tar -czf "${dir%/}.tar.gz" -C "$dir" .
          fi
        done
    
    - name: Upload release assets
      uses: softprops/action-gh-release@v1
      with:
        files: artifacts/*.tar.gz
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### **3. Package Configuration** (Update `package.json`)

```json
{
  "name": "quantumxfer",
  "version": "1.1.0",
  "main": "dist-electron/main/index.js",
  "description": "Professional SSH/SFTP Client with Terminal Logging & Session Management",
  "author": "Your Name",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "test": "vitest"
  },
  "build": {
    "appId": "com.quantumxfer.app",
    "productName": "QuantumXfer Enterprise",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist-electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns"
    },
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icon.png"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "deleteAppDataOnUninstall": false
    }
  },
  "devDependencies": {
    "electron-builder": "^24.6.4",
    "vitest": "^1.0.4",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.4"
  }
}
```

### **4. Testing Setup** (Add to `package.json`)

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### **5. Basic Test File** (`src/App.test.tsx`)

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('QuantumXfer App', () => {
  it('renders the main application', () => {
    render(<App />);
    expect(screen.getByText('QuantumXfer')).toBeInTheDocument();
  });
  
  it('shows connection form by default', () => {
    render(<App />);
    expect(screen.getByText('SSH Connection')).toBeInTheDocument();
  });
});
```

### **6. Release Process**

#### **Automated Release:**
1. **Push to main branch** → Triggers CI/CD pipeline
2. **Tests run** → Build artifacts created
3. **Create GitHub Release** → Uploads installers automatically

#### **Manual Release:**
```bash
# Create a new release
gh release create v1.2.0 --title "QuantumXfer v1.2.0" --notes "New features and improvements"

# The CI/CD pipeline will automatically build and attach installers
```

## 🎯 Benefits of This CI/CD Setup

- **🚀 Automated Builds**: No manual building required
- **🧪 Quality Assurance**: Tests run on every push
- **📦 Cross-Platform**: Windows, Linux, macOS installers
- **🔄 Continuous Deployment**: Releases created automatically
- **📊 Build Artifacts**: All builds stored for 30 days
- **🔒 Security**: Uses GitHub's secure token system

## 📋 Next Steps

1. **Create the workflow files** as shown above
2. **Add testing dependencies** to `package.json`
3. **Push to GitHub** to trigger the first CI/CD run
4. **Create a release** to test the full pipeline

This CI/CD setup will handle everything from code quality checks to publishing installers, making your development and release process much more efficient! 🎉
