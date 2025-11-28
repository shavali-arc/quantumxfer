# QuantumXfer Build and Run Script

A Python script to automate building and running the QuantumXfer Electron application, with optional TFTP server support for testing file transfers.

## Features

- **Dependency Installation**: Automatically runs `npm ci` to install dependencies.
- **Web Build**: Compiles TypeScript and bundles with Vite.
- **Electron Launch**: Starts the Electron app with your built assets.
- **Dev Mode**: Optional hot-reload development mode (`npm run electron:dev`).
- **TFTP Server**: Start an embedded TFTP server for testing file transfers.
- **TFTP Testing**: Built-in TFTP connectivity tests.
- **Packaging**: Build distributable packages for Windows, Linux, or both.
- **Error Handling**: Clear error messages and recovery suggestions.
- **Cross-Platform**: Works on Windows, macOS, and Linux.

## Prerequisites

- **Python 3.6+**
- **Node.js 16+** and **npm 8+**

## Installation

The script is a standalone Python file. No additional Python dependencies required.

```bash
# Make it executable (Linux/macOS)
chmod +x build_and_run.py

# On Windows, just use python directly
```

## Usage

### Basic Build and Run

```bash
python build_and_run.py
```

This will:
1. Check Node.js and npm are installed.
2. Install dependencies (`npm ci`).
3. Build web assets (`npm run build`).
4. Launch the Electron app (`npm run electron`).

### Development Mode (with hot reload)

```bash
python build_and_run.py --dev
```

Runs `npm run electron:dev`, which starts both the Vite dev server and Electron for live reloading during development.

### Build with TFTP Server

```bash
python build_and_run.py --with-tftp
```

Starts a TFTP server on localhost:69 (default TFTP port) alongside the app. This allows you to test SFTP/file transfer features with a local test server.

The TFTP root directory is created at `./tftp_root/` with sample test files for validation.

### Test TFTP Connectivity

```bash
python build_and_run.py --test-tftp
```

Tests the TFTP server connectivity without building or running the app. Useful for verifying that the TFTP server is responsive before running tests.

### Skip Installation

If you've already installed dependencies:

```bash
python build_and_run.py --skip-install
```

### Build Only (no run)

```bash
python build_and_run.py --build-only
```

Installs and builds, but doesn't launch Electron.

### Run Only (no install or build)

```bash
python build_and_run.py --run-only
```

Runs the Electron app without installing or rebuilding. Use this when the app is already built and you just want to launch it quickly.

### Package for Distribution

Build distributable packages:

```bash
# Windows only
python build_and_run.py --package win

# Linux only
python build_and_run.py --package linux

# Both platforms
python build_and_run.py --package all
```

Packages are output to `dist-electron/`.

### Combine Options

```bash
# Skip install, build, and run in dev mode with TFTP
python build_and_run.py --skip-install --dev --with-tftp

# Skip install and build, only run (if already built)
python build_and_run.py --skip-install --skip-build

# Build only, skip install
python build_and_run.py --skip-install --build-only

# Dev mode with TFTP for testing
python build_and_run.py --dev --with-tftp
```

### Specify Project Root

If running from a different directory:

```bash
python build_and_run.py --root /path/to/quantumxfer
```

## Command Reference

| Flag | Description |
|------|-------------|
| `--skip-install` | Skip `npm ci` step |
| `--skip-build` | Skip `npm run build` step |
| `--dev` | Run in dev mode with hot reload |
| `--with-tftp` | Start TFTP server for testing |
| `--test-tftp` | Test TFTP connectivity (requires server) |
| `--build-only` | Build only, don't launch Electron |
| `--run-only` | Run only, no install or build (assumes already built) |
| `--package {win\|linux\|all}` | Package for distribution |
| `--root <path>` | Specify project root directory |
| `-h, --help` | Show help and examples |

## Examples

```bash
# First-time setup: install, build, and run
python build_and_run.py

# Development workflow: quick rebuild and run with hot reload
python build_and_run.py --skip-install --dev

# Run only (no install or build)
python build_and_run.py --run-only

# Test with TFTP server running
python build_and_run.py --with-tftp

# Dev mode with TFTP for file transfer testing
python build_and_run.py --skip-install --dev --with-tftp

# CI/CD: build artifacts for release
python build_and_run.py --package all

# Quick test without reinstalling
python build_and_run.py --skip-install --skip-build

# Test only TFTP connectivity (standalone)
python build_and_run.py --test-tftp
```

## Exit Codes

- `0`: Success
- `1`: Build or runtime error
- `130`: User cancelled (Ctrl+C)

## Troubleshooting

### "npm not found"

Make sure Node.js and npm are installed:
- Download from [nodejs.org](https://nodejs.org/)
- Verify: `npm --version`

### Build fails with "gyp" errors

If you see node-gyp errors, try:
```bash
python build_and_run.py --skip-install --skip-build
```
Or set `SKIP_EB_POSTINSTALL=1` before running:
```bash
# PowerShell
$env:SKIP_EB_POSTINSTALL="1"
python build_and_run.py

# Bash
SKIP_EB_POSTINSTALL=1 python build_and_run.py
```

### Permission Denied (Linux/macOS)

Make the script executable:
```bash
chmod +x build_and_run.py
./build_and_run.py
```

### Electron Installation Error

If you see: `Electron failed to install correctly, please delete node_modules/electron and try installing again`

Solution:
```bash
# PowerShell
rm -Recurse -Force node_modules\electron
npm ci --prefer-offline

# Or bash/Linux/macOS
rm -rf node_modules/electron
npm ci --prefer-offline

# Then try running again
python build_and_run.py --run-only
```

## Notes

- The script uses `npm ci` (clean install) to respect `package-lock.json` for reproducible builds.
- Electron postinstall is guarded to skip in CI environments; locally it runs to rebuild native deps.
- Packaging disables native module rebuilds (`npmRebuild: false`) to avoid CI/firewall issues.
- **TFTP Server**: The script includes a built-in TFTP server for testing:
  - On **Windows**: Uses Python `tftpy` module (fallback), or `tftpd32`/`tftpd64` if available.
  - On **Linux/macOS**: Tries `dnsmasq` or `atftpd` first, then falls back to Python `tftpy`.
  - Default port: **69** (standard TFTP port)
  - Root directory: `./tftp_root/` (auto-created with sample files)
  - Install `tftpy` for the Python fallback: `pip install tftpy`
- The TFTP server runs in the background and stops when the app exits (or on Ctrl+C).

## License

See [LICENSE](./LICENSE)
