# QuantumXfer Testing Guide

## Overview
This guide provides step-by-step instructions for testing QuantumXfer Enterprise SSH/SFTP functionality using a local WSL Ubuntu server.

## Quick Setup Summary

### 1. WSL Ubuntu SSH Server Setup
Since WSL is already running, execute these commands in Ubuntu:

```bash
# Update system and install SSH server
sudo apt update && sudo apt upgrade -y
sudo apt install openssh-server -y

# Start SSH service
sudo service ssh start
sudo systemctl enable ssh

# Create test users
sudo useradd -m -s /bin/bash testuser
echo "testuser:test123" | sudo chpasswd

sudo useradd -m -s /bin/bash quantumuser
echo "quantumuser:quantum123" | sudo chpasswd

# Create test environment
sudo -u testuser bash -c "
mkdir -p /home/testuser/{Documents,Downloads,Scripts,Logs,TestFiles}
echo 'Hello from QuantumXfer SSH Test Server!' > /home/testuser/Documents/welcome.txt
echo '#!/bin/bash\necho Test script executed successfully' > /home/testuser/Scripts/test.sh
chmod +x /home/testuser/Scripts/test.sh
dd if=/dev/zero of=/home/testuser/Downloads/testfile.bin bs=1M count=5
echo '\$(date): SSH test server initialized' > /home/testuser/Logs/server.log
"

# Get WSL IP address
hostname -I
```

### 2. Test Connection from Windows
```powershell
# Test SSH connection
ssh testuser@localhost
# Enter password: test123

# Test SFTP
sftp testuser@localhost
```

## QuantumXfer Testing Scenarios

### Test Configuration 1: Basic User
```
Host: localhost
Port: 22
Username: testuser
Password: test123
Profile Name: WSL Test Server
```

### Test Configuration 2: Quantum User
```
Host: localhost
Port: 22
Username: quantumuser
Password: quantum123
Profile Name: WSL Quantum User
```

## Manual Testing Checklist

### ✅ Connection Tests
- [ ] SSH connection establishes successfully
- [ ] Authentication works with username/password
- [ ] Connection status shows "Connected"
- [ ] Connection can be terminated cleanly

### ✅ Command Execution Tests
- [ ] `ls -la` - List directory contents
- [ ] `pwd` - Show current directory
- [ ] `whoami` - Show current user
- [ ] `date` - Show current date/time
- [ ] `ps aux` - Show running processes
- [ ] `df -h` - Show disk usage
- [ ] `cat ~/Documents/welcome.txt` - Read file content
- [ ] `~/Scripts/test.sh` - Execute script
- [ ] `echo "Hello QuantumXfer"` - Simple echo test

### ✅ File Browser Tests
- [ ] Navigate to Documents folder
- [ ] Navigate to Downloads folder
- [ ] Navigate to Scripts folder
- [ ] Navigate to Logs folder
- [ ] View file sizes and timestamps
- [ ] Check file permissions display

### ✅ File Transfer Tests
#### Download Tests
- [ ] Download `welcome.txt` from Documents
- [ ] Download `testfile.bin` from Downloads
- [ ] Download `test.sh` from Scripts
- [ ] Verify downloaded files match originals

#### Upload Tests
- [ ] Upload a text file to Documents
- [ ] Upload an image to Downloads
- [ ] Upload a script to Scripts
- [ ] Verify uploaded files appear in WSL

### ✅ Multiple Connection Tests
- [ ] Connect to testuser account
- [ ] Keep connection open
- [ ] Open second connection to quantumuser
- [ ] Switch between connections
- [ ] Execute commands on both connections
- [ ] Close connections independently

### ✅ Error Handling Tests
- [ ] Test with wrong password
- [ ] Test with invalid hostname
- [ ] Test command with syntax error
- [ ] Test file transfer with invalid path
- [ ] Test connection timeout handling

### ✅ Performance Tests
- [ ] Upload 1MB file and measure time
- [ ] Download 1MB file and measure time
- [ ] Execute 10 commands rapidly
- [ ] Transfer multiple files simultaneously

## Automated Testing

### Run Test Suite
```powershell
# From quantumxfer-app directory
node test-ssh-functionality.js
```

### Expected Output
```
🚀 Starting QuantumXfer SSH Test Suite
===============================================

🔧 Testing configuration: WSL Test User
   Host: localhost:22
   Username: testuser

✅ Test passed: SSH Connection - WSL Test User
✅ Test passed: Command Execution - WSL Test User
✅ Test passed: SFTP Operations - WSL Test User
✅ Test passed: Large File Transfer - WSL Test User

🔧 Testing configuration: WSL Quantum User
   Host: localhost:22
   Username: quantumuser

✅ Test passed: SSH Connection - WSL Quantum User
✅ Test passed: Command Execution - WSL Quantum User
✅ Test passed: SFTP Operations - WSL Quantum User
✅ Test passed: Large File Transfer - WSL Quantum User

📊 Test Results Summary
===============================================
Total Tests: 8
Passed: 8
Failed: 0
Success Rate: 100.0%

🎉 All tests passed! QuantumXfer SSH functionality is working correctly.
```

## Troubleshooting

### Common Issues

#### 1. SSH Connection Refused
```bash
# Check if SSH service is running
sudo service ssh status

# Start SSH service if stopped
sudo service ssh start
```

#### 2. Authentication Failed
```bash
# Reset user password
sudo passwd testuser
# Enter new password when prompted
```

#### 3. WSL Network Issues
```powershell
# Restart WSL from Windows
wsl --shutdown
wsl -d Ubuntu-24.04
```

#### 4. Permission Denied
```bash
# Check SSH configuration
sudo nano /etc/ssh/sshd_config
# Ensure PasswordAuthentication yes

# Restart SSH service
sudo service ssh restart
```

### Debug Commands

#### Check SSH Server Status
```bash
# SSH service status
sudo systemctl status ssh

# Check if SSH port is listening
sudo netstat -tlnp | grep :22

# View SSH logs
sudo tail -f /var/log/auth.log
```

#### Network Diagnostics
```bash
# Get WSL IP addresses
ip addr show
hostname -I

# Test local SSH connection
ssh testuser@localhost
ssh testuser@127.0.0.1
```

## Advanced Testing Scenarios

### 1. Large File Transfers
Create test files of various sizes:
```bash
# Create test files in testuser's Downloads
sudo -u testuser bash -c "
cd /home/testuser/Downloads
dd if=/dev/zero of=test_1MB.bin bs=1M count=1
dd if=/dev/zero of=test_10MB.bin bs=1M count=10
dd if=/dev/zero of=test_100MB.bin bs=1M count=100
"
```

### 2. Directory Structure Testing
```bash
# Create complex directory structure
sudo -u testuser bash -c "
mkdir -p /home/testuser/TestProject/{src,docs,tests,assets/{images,videos,audio}}
touch /home/testuser/TestProject/src/{main.js,utils.js,config.json}
touch /home/testuser/TestProject/docs/{README.md,API.md}
touch /home/testuser/TestProject/tests/{unit.test.js,integration.test.js}
"
```

### 3. Permission Testing
```bash
# Create files with different permissions
sudo -u testuser bash -c "
touch /home/testuser/readonly.txt
chmod 444 /home/testuser/readonly.txt

touch /home/testuser/executable.sh
chmod 755 /home/testuser/executable.sh

touch /home/testuser/hidden_file
"
```

### 4. Symlink Testing
```bash
# Create symbolic links
sudo -u testuser bash -c "
ln -s /home/testuser/Documents/welcome.txt /home/testuser/welcome_link.txt
ln -s /home/testuser/Scripts /home/testuser/scripts_link
"
```

## Security Testing

⚠️ **Note**: These are test configurations only!

### Test Invalid Credentials
- Try connecting with wrong username
- Try connecting with wrong password
- Try connecting to wrong port

### Test Command Injection
- Try commands with special characters
- Test file paths with spaces
- Test Unicode characters in filenames

## Performance Benchmarks

### Expected Performance (WSL localhost)
- SSH Connection: < 500ms
- Command Execution: < 100ms per command
- File Transfer (1MB): < 2 seconds
- Directory Listing: < 200ms

### Monitoring Tools
```bash
# Monitor system resources during testing
htop
iotop
netstat -i
```

## Test Report Template

### Connection Test Results
- [ ] Connection Time: ___ms
- [ ] Authentication: Pass/Fail
- [ ] Stability: Pass/Fail

### Command Execution Results
- [ ] Average Response Time: ___ms
- [ ] Command Success Rate: ___%
- [ ] Error Handling: Pass/Fail

### File Transfer Results
- [ ] Upload Speed (1MB): ___MB/s
- [ ] Download Speed (1MB): ___MB/s
- [ ] Transfer Reliability: Pass/Fail

### Overall Assessment
- [ ] Functionality: Pass/Fail
- [ ] Performance: Pass/Fail
- [ ] Stability: Pass/Fail
- [ ] User Experience: Pass/Fail

---

## Legacy Testing Methods (Pre-SSH Implementation)

### 1. Web Development Testing (Recommended for Development)
npm run build

# Preview the built application
npm run preview
```

**Expected Output**:
```
➜  Local:   http://localhost:4173/
➜  Network: use --host to expose
```

**Testing Actions**:
1. Open browser to `http://localhost:4173/`
2. Verify the production build loads correctly
3. Check for any missing assets or broken functionality
4. Compare with development version for consistency

### 3. Electron Desktop Application Testing

**Purpose**: Test the complete desktop application experience.

#### 3a. Development Mode (if configured)
```bash
# Start Electron in development mode (if available)
npm run electron:dev
```

#### 3b. Production Package Testing (Recommended)
```bash
# Build the production packages
npm run build
./build.bat  # Windows
# or
./build.sh   # Linux

# Test the Windows package
cd "dist-packager\QuantumXfer Enterprise-win32-x64"
.\QuantumXfer Enterprise.exe

# Test the Linux package (on Linux)
cd "dist-packager/QuantumXfer Enterprise-linux-x64"
./QuantumXfer Enterprise
```

**Testing Actions**:
1. Verify the application launches without errors
2. Check that the splash screen appears and disappears correctly
3. Confirm the main UI loads and displays properly
4. Test all menu items and shortcuts
5. Verify window resizing and minimizing/maximizing
6. Test application closing and reopening

### 4. Download and Install Testing

**Purpose**: Test the end-user installation experience.

**Steps**:
```bash
# Create test directory
mkdir QuantumXfer-Test
cd QuantumXfer-Test

# Download latest release (replace URL with actual release)
curl -L -o QuantumXfer-Enterprise-Windows-x64.zip "https://github.com/shavali-arc/quantumxfer/releases/download/v1.0.2/QuantumXfer-Enterprise-Windows-x64.zip"

# Extract and test
unzip QuantumXfer-Enterprise-Windows-x64.zip
cd "QuantumXfer Enterprise-win32-x64"
.\QuantumXfer Enterprise.exe
```

## Testing Checklist

### UI Components
- [ ] Header and navigation
- [ ] SSH connection form
- [ ] File explorer interface
- [ ] Terminal/console area
- [ ] Status indicators
- [ ] Menu system

### Functionality
- [ ] Application startup
- [ ] Window management (resize, minimize, close)
- [ ] UI responsiveness
- [ ] Error handling
- [ ] Performance (smooth interactions)

### Cross-Platform (if applicable)
- [ ] Windows x64 package works
- [ ] Windows ARM64 package works
- [ ] Linux x64 package works
- [ ] Linux ARM64 package works

### Installation Experience
- [ ] Download completes successfully
- [ ] ZIP extraction works properly
- [ ] Application launches on first run
- [ ] No missing dependencies
- [ ] Clean uninstallation

## Common Issues and Solutions

### Issue: Blank Screen on Startup
**Cause**: Asset path problems in Electron
**Solution**: Verify `vite.config.ts` has `base: './'` configuration

### Issue: Development Server Won't Start
**Cause**: Port already in use
**Solution**: Kill existing processes or use different port

### Issue: Build Fails
**Cause**: TypeScript errors or missing dependencies
**Solution**: Run `npm install` and fix any TypeScript errors

### Issue: Electron App Won't Launch
**Cause**: Missing Node modules or incorrect build
**Solution**: Rebuild with `npm run build` and repackage

## Performance Testing

### Memory Usage
```bash
# Monitor memory usage during runtime
tasklist /FI "IMAGENAME eq QuantumXfer Enterprise.exe"
```

### Startup Time
- Measure time from launch to UI ready
- Should be under 3-5 seconds for production build

### File Operations
- Test file browsing responsiveness
- Verify smooth scrolling in file lists

## Automated Testing (Future)

Consider adding:
- Unit tests for React components
- Integration tests for Electron main process
- End-to-end tests with Playwright or similar
- Performance benchmarks

## Reporting Issues

When reporting issues, include:
1. Operating system and version
2. Node.js version
3. Exact steps to reproduce
4. Expected vs actual behavior
5. Console error messages
6. Screenshots if applicable

## Success Criteria

A successful test session should demonstrate:
1. ✅ Clean application startup
2. ✅ Functional user interface
3. ✅ Proper window management
4. ✅ No console errors
5. ✅ Smooth user interactions
6. ✅ Clean application shutdown

---

**Last Updated**: August 21, 2025
**Version**: 1.0.2
