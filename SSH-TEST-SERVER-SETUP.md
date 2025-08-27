# SSH/SFTP Test Server Setup for QuantumXfer

## Overview
This guide sets up a local SSH/SFTP server using WSL (Windows Subsystem for Linux) to test QuantumXfer Enterprise SSH functionality.

## Prerequisites
- Windows 10/11 with WSL2 enabled
- Ubuntu 24.04 LTS installed in WSL
- Administrator privileges

## 1. Install and Setup WSL Ubuntu

### Install Ubuntu (if not already done)
```powershell
# Run as Administrator
wsl --install Ubuntu-24.04
```

### First-time setup
1. Set username and password when prompted
2. Update the system:
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install and Configure SSH Server

### Install OpenSSH Server
```bash
sudo apt install openssh-server -y
```

### Configure SSH Server
```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config
```

Add/modify these settings:
```
Port 22
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
PermitEmptyPasswords no
X11Forwarding yes
```

### Start SSH Service
```bash
# Start SSH service
sudo service ssh start

# Enable SSH to start automatically
sudo systemctl enable ssh

# Check SSH status
sudo service ssh status
```

## 3. Create Test Users and Environment

### Create test users
```bash
# Create a test user
sudo useradd -m -s /bin/bash testuser
sudo passwd testuser
# Enter password: test123

# Create another user for testing
sudo useradd -m -s /bin/bash quantumuser
sudo passwd quantumuser
# Enter password: quantum123

# Add users to sudo group (optional)
sudo usermod -aG sudo testuser
sudo usermod -aG sudo quantumuser
```

### Create test directory structure
```bash
# Switch to test user
su - testuser

# Create test directories and files
mkdir -p ~/Documents/Projects
mkdir -p ~/Downloads
mkdir -p ~/Scripts
mkdir -p ~/Logs

# Create sample files
echo "Hello from QuantumXfer SSH Test Server!" > ~/Documents/welcome.txt
echo "#!/bin/bash\necho 'Test script executed successfully'" > ~/Scripts/test.sh
chmod +x ~/Scripts/test.sh

# Create a larger test file
dd if=/dev/zero of=~/Downloads/testfile.bin bs=1M count=10

# Create some log files
echo "$(date): SSH server started" > ~/Logs/server.log
echo "$(date): Test environment initialized" >> ~/Logs/server.log

# Exit back to main user
exit
```

## 4. Configure Firewall (if needed)

```bash
# Allow SSH through firewall
sudo ufw allow ssh
sudo ufw allow 22
```

## 5. Get WSL IP Address

```bash
# Get WSL IP address for connection
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1

# Or use hostname
hostname -I
```

## 6. Test SSH Connection

### From Windows Command Prompt
```cmd
# Test SSH connection
ssh testuser@localhost
# or
ssh testuser@<WSL_IP_ADDRESS>
```

### Test SFTP
```cmd
# Test SFTP connection
sftp testuser@localhost
# Commands to try:
# ls
# pwd
# get welcome.txt
# put somefile.txt
```

## 7. QuantumXfer Test Configuration

Use these settings in QuantumXfer Enterprise:

### Test User 1
```
Host: localhost (or WSL IP address)
Port: 22
Username: testuser
Password: test123
Profile Name: WSL Test Server
```

### Test User 2
```
Host: localhost
Port: 22
Username: quantumuser
Password: quantum123
Profile Name: WSL Quantum User
```

## 8. Test Scenarios

### Basic Connection Test
1. Open QuantumXfer Enterprise
2. Enter WSL connection details
3. Click Connect
4. Verify connection success

### Command Execution Tests
Try these commands:
```bash
ls -la                    # List files
pwd                       # Current directory
whoami                    # Current user
date                      # Current date/time
ps aux                    # Running processes
df -h                     # Disk usage
cat ~/Documents/welcome.txt  # Read file content
~/Scripts/test.sh         # Run script
```

### File Transfer Tests
1. **Download files from WSL:**
   - Navigate to Documents folder
   - Download welcome.txt
   - Download testfile.bin

2. **Upload files to WSL:**
   - Upload a file from Windows
   - Verify it appears in WSL

3. **Directory browsing:**
   - Navigate through different folders
   - Check file permissions
   - View file sizes and dates

## 9. Advanced Testing

### Create More Test Content
```bash
# Create nested directories
mkdir -p ~/TestFiles/{Images,Documents,Archives}

# Create various file types
touch ~/TestFiles/Documents/report.pdf
touch ~/TestFiles/Images/photo.jpg
touch ~/TestFiles/Archives/backup.zip

# Create files with different permissions
touch ~/TestFiles/readonly.txt
chmod 444 ~/TestFiles/readonly.txt

touch ~/TestFiles/executable.sh
chmod 755 ~/TestFiles/executable.sh
```

### Performance Testing
```bash
# Create larger files for transfer testing
dd if=/dev/zero of=~/TestFiles/1MB.bin bs=1M count=1
dd if=/dev/zero of=~/TestFiles/10MB.bin bs=1M count=10
dd if=/dev/zero of=~/TestFiles/100MB.bin bs=1M count=100
```

## 10. Troubleshooting

### SSH Service Issues
```bash
# Check if SSH is running
sudo service ssh status

# Restart SSH service
sudo service ssh restart

# Check SSH logs
sudo tail -f /var/log/auth.log
```

### Connection Issues
```bash
# Check if SSH port is open
netstat -tlnp | grep :22

# Test local connection
ssh localhost

# Check firewall status
sudo ufw status
```

### WSL Network Issues
```powershell
# From Windows PowerShell
# Restart WSL if needed
wsl --shutdown
wsl
```

## 11. Security Notes

⚠️ **Important**: This setup is for testing only!
- Root login enabled (not recommended for production)
- Simple passwords used (not secure for production)
- No SSH key authentication configured
- Firewall rules may be permissive

For production use:
- Disable root login
- Use SSH keys instead of passwords
- Implement proper firewall rules
- Use strong passwords
- Regular security updates

## 12. Automated Setup Script

Save this as `setup-ssh-test.sh`:
```bash
#!/bin/bash
# QuantumXfer SSH Test Server Setup

echo "Setting up SSH test server for QuantumXfer..."

# Update system
sudo apt update -y

# Install SSH server
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
mkdir -p /home/testuser/{Documents,Downloads,Scripts,Logs}
echo 'Hello from QuantumXfer SSH Test Server!' > /home/testuser/Documents/welcome.txt
echo '#!/bin/bash\necho Test script executed successfully' > /home/testuser/Scripts/test.sh
chmod +x /home/testuser/Scripts/test.sh
echo '$(date): SSH test server initialized' > /home/testuser/Logs/server.log
"

# Get IP address
echo "SSH Server setup complete!"
echo "WSL IP Address: $(hostname -I)"
echo "Test with: ssh testuser@localhost"
echo "Password: test123"
```

Run with:
```bash
chmod +x setup-ssh-test.sh
./setup-ssh-test.sh
```

---

**Ready to test QuantumXfer with real SSH connections!** 🚀
