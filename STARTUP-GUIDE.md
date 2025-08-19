# QuantumXfer Enterprise - Startup Guide

<div align="center">

![QuantumXfer Logo](assets/logo.png)

# 🚀 Quick Start Guide
## Get Connected in 5 Minutes

**From Zero to SSH Connection in Minutes**

</div>

---

## 📋 Table of Contents

- [Quick Start (5 Minutes)](#quick-start-5-minutes)
- [First Connection Setup](#first-connection-setup)
- [Enterprise Features Overview](#enterprise-features-overview)
- [Profile Management](#profile-management)
- [SFTP File Transfer](#sftp-file-transfer)
- [Terminal Usage](#terminal-usage)
- [Advanced Configuration](#advanced-configuration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips & Best Practices](#tips--best-practices)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Launch QuantumXfer
- **Windows**: Start Menu → QuantumXfer Enterprise
- **Linux**: Applications → Network → QuantumXfer Enterprise
- **macOS**: Applications → QuantumXfer Enterprise

### Step 2: Create Your First Connection

1. **Fill in Connection Details**:
   ```
   Host/IP Address: your-server.com (or IP like 192.168.1.100)
   Port: 22 (default SSH port)
   Username: your-username
   Password: your-password
   Profile Name: My Server (optional - saves for reuse)
   ```

2. **Click "Connect to SSH Server"** 🚀

3. **New Terminal Tab Opens**: A PowerShell-style terminal opens in a new tab

### Step 3: Start Using Terminal

Type commands in the terminal:
```bash
ls                    # List files
pwd                   # Show current directory
cd /home             # Change directory
help                 # Show available commands
```

### 🎉 You're Connected!

Your SSH session is now active with:
- ✅ Full terminal access
- ✅ Command history (use ↑↓ arrows)
- ✅ Session logging
- ✅ SFTP file browser (click "Show SFTP")

---

## 🔐 First Connection Setup

### Connection Form Fields

#### Required Fields
| Field | Description | Example |
|-------|-------------|---------|
| **Host/IP** | Server address | `server.example.com` or `192.168.1.100` |
| **Username** | SSH username | `root`, `admin`, `ubuntu` |
| **Password** | SSH password | `your-secure-password` |

#### Optional Fields
| Field | Description | Example |
|-------|-------------|---------|
| **Port** | SSH port (default: 22) | `22`, `2222`, `443` |
| **Profile Name** | Save connection for reuse | `Production Server` |

### Advanced Connection Options

Click **"⚙️ Advanced"** to access:

#### Security Options
- 🔐 **SSH Key Authentication**: Use private key files
- 🛡️ **Multi-Factor Authentication**: 2FA/MFA support
- 🏃 **Jump Host**: Connect through bastion server

#### Example SSH Key Setup
```
SSH Key Path: ~/.ssh/id_rsa
Passphrase: (if key is encrypted)
```

#### Example Jump Host Setup
```
Jump Host: bastion.company.com
Jump User: jump-user
```

---

## 🏢 Enterprise Features Overview

### Analytics Dashboard

The main screen shows enterprise analytics:

```
📊 Analytics Dashboard
┌─────────────────────────────────────────┐
│ Total Profiles: 5    Favorites: 2      │
│ Total Connections: 47  Session Time: 12h│
└─────────────────────────────────────────┘
```

### Feature Categories

#### 🛡️ Security & Authentication
- SSH Key Authentication
- Multi-Factor Authentication (MFA)
- Jump Host Support
- Encrypted Password Storage
- Session Security Monitoring

#### 📊 Management & Analytics
- Connection Profile Management
- Session Time Tracking
- Usage Analytics & Statistics
- Favorite Connections
- Advanced Search & Filtering

#### 📁 File Management
- Integrated SFTP Client
- Drag & Drop File Transfers
- Progress Tracking
- Batch File Operations
- Remote File Browser

#### 💻 Terminal Experience
- PowerShell-Style Interface
- Command History & Navigation
- Multi-Tab Support
- Session Logging
- Auto-Focus Terminal Input

---

## 👤 Profile Management

### Creating Profiles

1. **Fill Connection Details**
2. **Add Profile Name**: `Production Web Server`
3. **Click Connect**: Profile is automatically saved

### Managing Profiles

#### Profile Dashboard
```
Connection Profiles
┌─────────────────────────────────────────┐
│ ⭐ Favorites  🔍 Search  📊 Sort        │
├─────────────────────────────────────────┤
│ ⭐ Production Server                    │
│    admin@prod.company.com:22            │
│    Last used: Today • Connections: 15   │
│                                         │
│ Development Server                      │
│    dev@dev.company.com:22              │
│    Last used: Yesterday • Connections: 8│
└─────────────────────────────────────────┘
```

#### Profile Features
- **⭐ Favorites**: Star important servers for quick access
- **🔍 Search**: Find profiles by name, host, or username
- **📊 Sorting**: Sort by last used, name, or frequency
- **🏷️ Tags**: Organize with custom tags (`production`, `database`, etc.)

### Bulk Operations

#### Export Profiles
```
Profiles → Export Profiles → Save to JSON file
```

#### Import Profiles
```
Profiles → Import Profiles → Select JSON file
```

---

## 📁 SFTP File Transfer

### Enabling SFTP Browser

1. **Connect to SSH server**
2. **Click "📁 Show SFTP"** in terminal tab
3. **SFTP panel appears** on the right side

### SFTP Interface

```
📁 SFTP Browser                         🔄
/home/user                             
┌─────────────────────────────────────┐
│ ⬆️ Upload                          │
├─────────────────────────────────────┤
│ ☑️ 📁 documents                    │
│ ☑️ 📄 config.txt        2.1 KB   ⬇️│
│ ☑️ 📄 backup.tar.gz     15.2 MB  ⬇️│
│ ☑️ 📄 logs.txt          1.5 KB   ⬇️│
└─────────────────────────────────────┘
```

### File Operations

#### Upload Files
1. **Click "⬆️ Upload"** or use file input
2. **Select multiple files** from your computer
3. **Files upload with progress indicators**

#### Download Files
1. **Select files** with checkboxes
2. **Click "⬇️ Get (X)"** button
3. **Files download to your computer**

#### File Management
- **Navigate**: Click folders to browse
- **Select Multiple**: Use checkboxes for batch operations
- **Delete**: Click 🗑️ to remove files
- **Refresh**: Click 🔄 to update file list

### Transfer Monitoring

```
Transfers
┌─────────────────────────────────────┐
│ ⬆️ config.txt               100% ✅│
│ ⬇️ backup.tar.gz            45%  ⏳│
│    ████████████░░░░░░░░░           │
└─────────────────────────────────────┘
```

---

## 💻 Terminal Usage

### PowerShell-Style Interface

The terminal mimics Windows PowerShell for familiarity:

```
PS /home/user> ls
total 24
drwxr-xr-x 2 user user 4096 Aug 20 10:30 documents
-rw-r--r-- 1 user user 1024 Aug 20 10:29 config.txt
-rw-r--r-- 1 user user 2048 Aug 20 10:28 backup.tar.gz

PS /home/user> pwd
Path
----
/home/user

PS /home/user> help
Available commands:
  ls, dir, Get-ChildItem - List directory contents
  cd, Set-Location       - Change directory
  pwd, Get-Location      - Show current directory
  Get-Date              - Show current date/time
  clear, cls            - Clear terminal
  exit, logout          - Disconnect session
```

### Command History

- **↑ Up Arrow**: Previous command
- **↓ Down Arrow**: Next command
- **History persisted** per profile for future sessions

### Built-in Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `ls` | `dir`, `Get-ChildItem` | List directory contents |
| `cd` | `Set-Location` | Change directory |
| `pwd` | `Get-Location` | Show current directory |
| `clear` | `cls` | Clear terminal screen |
| `help` | `Get-Help` | Show command help |
| `exit` | `logout` | Disconnect session |

### Session Management

#### Auto-Logging
- All commands and outputs are automatically logged
- Session logs saved with timestamps
- Export logs via "📥 Download Logs" button

#### Session Controls
```
Terminal Controls
┌─────────────────────────────────────┐
│ ☑️ Auto-save terminal logs          │
│ 📥 Download Session Logs           │
│ 🗑️ Clear Terminal                  │
└─────────────────────────────────────┘
```

---

## ⚙️ Advanced Configuration

### Logs Directory Setup

#### Configure Logs Directory
1. **Click "📁 Select Directory"** in Logs Directory Settings
2. **Choose folder** where logs should be saved
3. **All future sessions** will auto-save logs there

#### Benefits
- ✅ Automatic log saving
- ✅ Organized by session
- ✅ Easy access for compliance/auditing

### Enterprise Settings

#### Theme Customization
```
Settings → Appearance
- Dark Mode (default)
- Light Mode
- High Contrast
```

#### Security Settings
```
Settings → Security
- Session timeout
- Auto-lock settings
- Password encryption level
```

### Profile Organization

#### Tags System
Add tags to profiles for organization:
```
Tags: production, database, web-server, critical
```

#### Filtering
- Filter by tags
- Show favorites only
- Search across all fields

---

## ⌨️ Keyboard Shortcuts

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Connection |
| `Ctrl+P` | Manage Profiles |
| `Ctrl+Q` | Quit Application |
| `F11` | Toggle Fullscreen |
| `Ctrl+R` | Reload Application |

### Terminal Shortcuts
| Shortcut | Action |
|----------|--------|
| `↑` | Previous command |
| `↓` | Next command |
| `Ctrl+C` | Cancel current command |
| `Ctrl+L` | Clear terminal |
| `Enter` | Execute command |

### SFTP Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Upload files |
| `F5` | Refresh file list |
| `Delete` | Delete selected files |
| `Space` | Select/deselect file |

---

## 💡 Tips & Best Practices

### Security Best Practices

#### 🔐 Use SSH Keys
```
✅ More secure than passwords
✅ No password transmission
✅ Can be revoked remotely
```

#### 🛡️ Enable MFA
```
✅ Additional security layer
✅ Protects against password breaches
✅ Enterprise compliance
```

#### 🏃 Use Jump Hosts
```
✅ Secure access to internal servers
✅ Centralized access control
✅ Audit trail compliance
```

### Performance Tips

#### 🚀 Optimize Connections
- Save frequently used servers as profiles
- Use favorites for quick access
- Organize with tags for large environments

#### 📊 Monitor Usage
- Check analytics dashboard regularly
- Review session time statistics
- Optimize connection patterns

### Organization Tips

#### 📋 Profile Naming
```
Good: "Production Web Server (us-east-1)"
Bad: "Server1"

Good: "Database - MySQL Production"
Bad: "db"
```

#### 🏷️ Use Tags Effectively
```
Environment: production, staging, development
Type: database, web, api, cache
Location: us-east-1, eu-west-1, on-premises
```

### Troubleshooting Tips

#### 🔍 Connection Issues
1. **Check network connectivity**
2. **Verify credentials**
3. **Test with standard SSH client**
4. **Check firewall settings**

#### 📝 Check Logs
- Application logs: Help → View Logs
- Session logs: Download Session Logs
- System logs: OS-specific locations

#### 🆘 Get Help
- Built-in help system
- GitHub issues for bugs
- Community Discord for questions

---

## 🎯 Quick Reference

### Essential Actions

```
🔥 QUICK ACTIONS
┌─────────────────────────────────────┐
│ Connect to Server     Fill form + Connect │
│ Open SFTP Browser     Click "📁 Show SFTP" │
│ Upload Files          Click "⬆️ Upload"     │
│ Download Files        Select + "⬇️ Get"     │
│ Clear Terminal        Type "clear"         │
│ View Command History  Press ↑/↓ arrows    │
│ Save Connection       Add "Profile Name"  │
│ Export Logs           Click "📥 Download"  │
└─────────────────────────────────────┘
```

### Status Indicators

| Icon | Meaning |
|------|---------|
| 🟢 | Connected |
| 🟡 | Connecting |
| 🔴 | Disconnected |
| ⭐ | Favorite Profile |
| 🔒 | Secure Connection |
| 📁 | SFTP Active |

---

<div align="center">

## 🎉 You're Ready to Go!

**QuantumXfer Enterprise is now configured and ready for professional SSH/SFTP management.**

Need help? Check our [Installation Guide](INSTALLATION.md) or visit [docs.quantumxfer.enterprise](https://docs.quantumxfer.enterprise)

**Happy SSH-ing! 🚀**

---

**Made with ❤️ by the QuantumXfer Team**

© 2025 QuantumXfer Enterprise. All rights reserved.

</div>
