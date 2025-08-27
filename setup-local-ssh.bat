@echo off
echo Setting up local SSH server for QuantumXfer testing...

REM Check if OpenSSH is installed
where ssh >nul 2>nul
if %errorlevel% neq 0 (
    echo OpenSSH is not installed. Please install OpenSSH Server feature.
    echo Run: Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    pause
    exit /b 1
)

REM Start SSH service
echo Starting SSH service...
net start sshd

REM Set up firewall rule
echo Setting up firewall rule...
netsh advfirewall firewall add rule name="SSH Server" dir=in action=allow protocol=TCP localport=22

echo.
echo SSH server setup complete!
echo You can now connect to localhost:22 with your Windows username and password
echo.
pause
