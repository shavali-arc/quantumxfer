@echo off
echo Creating release archives for QuantumXfer Enterprise...

cd dist-packager

echo.
echo Creating Windows x64 release...
if exist "QuantumXfer-Enterprise-Windows-x64.zip" del "QuantumXfer-Enterprise-Windows-x64.zip"
powershell -Command "Compress-Archive -Path 'QuantumXfer Enterprise-win32-x64\*' -DestinationPath 'QuantumXfer-Enterprise-Windows-x64.zip'"

echo.
echo Creating Windows ARM64 release...
if exist "QuantumXfer-Enterprise-Windows-ARM64.zip" del "QuantumXfer-Enterprise-Windows-ARM64.zip"
powershell -Command "Compress-Archive -Path 'QuantumXfer Enterprise-win32-arm64\*' -DestinationPath 'QuantumXfer-Enterprise-Windows-ARM64.zip'"

echo.
echo Creating Linux x64 release...
if exist "QuantumXfer-Enterprise-Linux-x64.zip" del "QuantumXfer-Enterprise-Linux-x64.zip"
powershell -Command "Compress-Archive -Path 'QuantumXfer Enterprise-linux-x64\*' -DestinationPath 'QuantumXfer-Enterprise-Linux-x64.zip'"

echo.
echo Creating Linux ARM64 release...
if exist "QuantumXfer-Enterprise-Linux-ARM64.zip" del "QuantumXfer-Enterprise-Linux-ARM64.zip"
powershell -Command "Compress-Archive -Path 'QuantumXfer Enterprise-linux-arm64\*' -DestinationPath 'QuantumXfer-Enterprise-Linux-ARM64.zip'"

echo.
echo Release archives created successfully!
echo.
echo Available releases:
dir *.zip /B

echo.
echo All releases are ready for distribution!
pause
