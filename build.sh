#!/bin/bash

# QuantumXfer Enterprise Build Script
# This script builds installable packages for Windows and Linux

set -e

echo "🚀 QuantumXfer Enterprise Build Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if electron-builder is installed
if ! npm list electron-builder --depth=0 >/dev/null 2>&1; then
    print_error "electron-builder not found. Please run 'npm install' first."
    exit 1
fi

print_step "Checking system requirements..."

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="16.0.0"
if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE" ]; then
    print_warning "Node.js version $NODE_VERSION detected. Recommended: $REQUIRED_NODE or higher"
else
    print_success "Node.js version $NODE_VERSION is compatible"
fi

# Check npm version
NPM_VERSION=$(npm --version)
print_success "npm version $NPM_VERSION detected"

print_step "Installing dependencies..."
npm install

print_step "Building React application..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Build failed. dist directory not found."
    exit 1
fi

print_success "React build completed successfully"

# Parse command line arguments
BUILD_TARGET="all"
SKIP_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            BUILD_TARGET="$2"
            shift 2
            ;;
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --target <target>     Build target: all, windows, linux, mac (default: all)"
            echo "  --skip-cleanup        Skip cleanup of dist-electron directory"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Build for all platforms"
            echo "  $0 --target windows   # Build for Windows only"
            echo "  $0 --target linux     # Build for Linux only"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Cleanup previous builds
if [ "$SKIP_CLEANUP" = false ] && [ -d "dist-electron" ]; then
    print_step "Cleaning previous builds..."
    rm -rf dist-electron
    print_success "Cleanup completed"
fi

# Create assets directory if it doesn't exist
if [ ! -d "assets" ]; then
    print_warning "Assets directory not found. Creating placeholder..."
    mkdir -p assets
    
    # Create placeholder icon files
    cat > assets/README.md << EOF
# Placeholder Icons

This directory contains placeholder icon files. 
Replace these with actual icons for production builds.

Required icons:
- icon.ico (Windows)
- icon.png (Linux)
- icon.icns (macOS)
EOF
    
    print_warning "Please add proper icon files to the assets directory"
fi

# Build based on target
case $BUILD_TARGET in
    "all")
        print_step "Building for all platforms..."
        
        if command -v wine >/dev/null 2>&1 || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
            print_step "Building Windows packages..."
            npm run electron:build:win
            print_success "Windows build completed"
        else
            print_warning "Wine not detected. Skipping Windows build on non-Windows system."
        fi
        
        print_step "Building Linux packages..."
        npm run electron:build:linux
        print_success "Linux build completed"
        ;;
        
    "windows")
        print_step "Building Windows packages..."
        npm run electron:build:win
        print_success "Windows build completed"
        ;;
        
    "linux")
        print_step "Building Linux packages..."
        npm run electron:build:linux
        print_success "Linux build completed"
        ;;
        
    "mac")
        print_step "Building macOS packages..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            npx electron-builder --mac
            print_success "macOS build completed"
        else
            print_error "macOS builds can only be created on macOS systems"
            exit 1
        fi
        ;;
        
    *)
        print_error "Invalid target: $BUILD_TARGET"
        echo "Valid targets: all, windows, linux, mac"
        exit 1
        ;;
esac

# Display build results
print_step "Build Summary"
echo "=============="

if [ -d "dist-electron" ]; then
    echo ""
    echo "📦 Generated packages:"
    echo ""
    
    # List all generated files
    find dist-electron -name "*.exe" -o -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" -o -name "*.dmg" -o -name "*.tar.gz" | while read file; do
        filename=$(basename "$file")
        filesize=$(du -h "$file" | cut -f1)
        echo "  📋 $filename ($filesize)"
    done
    
    echo ""
    total_size=$(du -sh dist-electron | cut -f1)
    echo "📊 Total package size: $total_size"
    echo ""
    
    print_success "All builds completed successfully!"
    echo ""
    echo "📁 Packages location: ./dist-electron/"
    echo ""
    echo "🚀 Ready for distribution!"
    echo ""
    echo "Next steps:"
    echo "  1. Test the packages on target systems"
    echo "  2. Sign the packages for production (if needed)"
    echo "  3. Upload to release channels"
    echo "  4. Update documentation with download links"
    
else
    print_error "No packages were generated. Check the build output for errors."
    exit 1
fi

echo ""
echo "📖 Documentation:"
echo "  Installation Guide: ./INSTALLATION.md"
echo "  Startup Guide: ./STARTUP-GUIDE.md"
echo ""

print_success "Build script completed successfully! 🎉"
