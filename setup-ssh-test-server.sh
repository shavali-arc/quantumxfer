#!/bin/bash
# Quick SSH Test Server Setup for QuantumXfer
# Run these commands in WSL Ubuntu terminal

echo "🚀 Setting up SSH test server for QuantumXfer..."

# Update system
sudo apt update -y

# Install SSH server
sudo apt install openssh-server -y

# Start SSH service
sudo service ssh start

# Create test user
sudo useradd -m -s /bin/bash testuser
echo "testuser:test123" | sudo chpasswd

# Create test environment for testuser
sudo -u testuser bash -c "
cd /home/testuser
mkdir -p Documents Downloads Scripts Logs TestFiles
echo 'Hello from QuantumXfer SSH Test Server!' > Documents/welcome.txt
echo '#!/bin/bash
echo \"Test script executed successfully at \$(date)\"' > Scripts/test.sh
chmod +x Scripts/test.sh
echo '\$(date): SSH test server initialized' > Logs/server.log
touch TestFiles/sample.txt
echo 'This is a sample file for testing' > TestFiles/sample.txt
"

# Get WSL IP address
WSL_IP=$(hostname -I | awk '{print $1}')

echo "✅ SSH Server setup complete!"
echo ""
echo "📋 Connection Details:"
echo "   Host: localhost (or $WSL_IP)"
echo "   Port: 22"
echo "   Username: testuser"
echo "   Password: test123"
echo ""
echo "🧪 Test SSH connection:"
echo "   ssh testuser@localhost"
echo ""
echo "Ready to test with QuantumXfer! 🎉"
