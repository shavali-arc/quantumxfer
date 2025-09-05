#!/bin/bash
# GitHub Release Script for QuantumXfer Enterprise v1.1.0

# Release Information
RELEASE_VERSION="v1.1.0"
RELEASE_NAME="QuantumXfer Enterprise v1.1.0 - Complete SFTP File Browser"
REPO_OWNER="shavali-arc"
REPO_NAME="quantumxfer"

# Release Assets
WINDOWS_PACKAGE="QuantumXfer-Enterprise-1.1.0-win-x64.zip"
LINUX_PACKAGE="quantumxfer-app-1.1.0.tar.gz"

echo "🚀 Creating GitHub Release for QuantumXfer Enterprise v1.1.0"
echo "============================================================"

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📋 Manual Release Instructions:"
    echo ""
    echo "1. Go to: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/new"
    echo "2. Tag: ${RELEASE_VERSION}"
    echo "3. Title: ${RELEASE_NAME}"
    echo "4. Description: Copy from RELEASE-NOTES-v1.1.0.md"
    echo "5. Upload files:"
    echo "   - ${WINDOWS_PACKAGE} (Windows Package)"
    echo "   - ${LINUX_PACKAGE} (Linux Package)"
    echo ""
    echo "📁 Release files location: dist-electron/"
    exit 1
fi

# Create GitHub Release
echo "📝 Creating GitHub release..."

# Create release with assets
gh release create "${RELEASE_VERSION}" \
    --repo "${REPO_OWNER}/${REPO_NAME}" \
    --title "${RELEASE_NAME}" \
    --notes-file "RELEASE-NOTES-v1.1.0.md" \
    --target main \
    --latest \
    "dist-electron/${WINDOWS_PACKAGE}#Windows Package (ZIP)" \
    "dist-electron/${LINUX_PACKAGE}#Linux Package (tar.gz)"

if [ $? -eq 0 ]; then
    echo "✅ GitHub release created successfully!"
    echo "🔗 View release: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${RELEASE_VERSION}"
else
    echo "❌ Failed to create GitHub release"
    echo "📋 Please create the release manually using the instructions above"
fi

echo ""
echo "📦 Release Summary:"
echo "   Version: ${RELEASE_VERSION}"
echo "   Windows: ${WINDOWS_PACKAGE} (129 MB)"
echo "   Linux: ${LINUX_PACKAGE} (115 MB)"
echo "   Features: Complete SFTP File Browser Implementation"
