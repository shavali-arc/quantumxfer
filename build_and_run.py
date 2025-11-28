#!/usr/bin/env python3
"""
QuantumXfer Build and Run Script
Automates dependency installation, web build, and Electron app launch.
"""

import os
import sys
import subprocess
import platform
import argparse
import socket
import threading
import time
from pathlib import Path


class QuantumXferBuilder:
    """Builder class for QuantumXfer Electron application."""

    def __init__(self, project_root=None, skip_install=False, skip_build=False, dev_mode=False):
        """
        Initialize the builder.

        Args:
            project_root (str): Root directory of the project. Defaults to current directory.
            skip_install (bool): Skip npm install step.
            skip_build (bool): Skip npm build step.
            dev_mode (bool): Run in development mode with hot reload (electron:dev).
        """
        self.project_root = Path(project_root or os.getcwd()).resolve()
        self.skip_install = skip_install
        self.skip_build = skip_build
        self.dev_mode = dev_mode
        self.is_windows = platform.system() == "Windows"
        self.npm_cmd = "npm.cmd" if self.is_windows else "npm"

        # Validate project structure
        if not (self.project_root / "package.json").exists():
            raise FileNotFoundError(f"package.json not found in {self.project_root}")

        # TFTP Server state
        self.tftp_process = None
        self.tftp_port = 69
        self.tftp_root = self.project_root / "tftp_root"

    def run_command(self, cmd, description=None):
        """
        Run a shell command and handle errors.

        Args:
            cmd (list): Command and arguments as a list.
            description (str): Human-readable description of the command.

        Returns:
            int: Return code of the command.
        """
        if description:
            print(f"\n{'='*60}")
            print(f"📦 {description}")
            print(f"{'='*60}")

        print(f"Running: {' '.join(cmd)}\n")

        try:
            result = subprocess.run(cmd, cwd=self.project_root, check=False)
            return result.returncode
        except FileNotFoundError as e:
            print(f"❌ Error: Command not found. Make sure you have Node.js and npm installed.")
            print(f"   Details: {e}")
            return 1

    def check_node_npm(self):
        """Check if Node.js and npm are installed."""
        print("🔍 Checking Node.js and npm installation...")

        # Check node
        node_check = subprocess.run([self.npm_cmd, "--version"], capture_output=True, text=True)
        if node_check.returncode != 0:
            print("❌ npm not found. Please install Node.js and npm first.")
            return False

        npm_version = node_check.stdout.strip()
        print(f"✅ npm version: {npm_version}")
        return True

    def install_dependencies(self):
        """Install npm dependencies."""
        if self.skip_install:
            print("⏭️  Skipping npm install (--skip-install flag set)")
            return 0

        cmd = [self.npm_cmd, "ci"]
        return self.run_command(cmd, "Installing Dependencies (npm ci)")

    def build_web_assets(self):
        """Build web assets using TypeScript and Vite."""
        if self.skip_build:
            print("⏭️  Skipping build (--skip-build flag set)")
            return 0

        cmd = [self.npm_cmd, "run", "build"]
        return self.run_command(cmd, "Building Web Assets (TypeScript + Vite)")

    def run_electron(self):
        """Launch the Electron application."""
        if self.dev_mode:
            cmd = [self.npm_cmd, "run", "electron:dev"]
            description = "Running Electron (Dev Mode with Hot Reload)"
        else:
            cmd = [self.npm_cmd, "run", "electron"]
            description = "Running Electron (Production Build)"

        return self.run_command(cmd, description)

    def build_and_run(self):
        """Execute the full build and run pipeline."""
        print("\n" + "🚀 " * 20)
        print("  QuantumXfer Build and Run Script")
        print("🚀 " * 20 + "\n")

        # Check prerequisites
        if not self.check_node_npm():
            return 1

        # Install dependencies
        if self.install_dependencies() != 0:
            print("❌ Failed to install dependencies")
            return 1

        # Build web assets
        if self.build_web_assets() != 0:
            print("❌ Failed to build web assets")
            return 1

        # Run Electron
        print("\n" + "="*60)
        print("✨ All prerequisites complete. Starting Electron app...")
        print("="*60 + "\n")

        return self.run_electron()

    def package_app(self, target_platform=None):
        """
        Package the application for distribution.

        Args:
            target_platform (str): Target platform ('win', 'linux', 'all'). Defaults to current OS.
        """
        if not target_platform:
            target_platform = "win" if self.is_windows else "linux"

        # Ensure build is complete
        if self.build_web_assets() != 0:
            print("❌ Failed to build web assets")
            return 1

        print("\n" + "="*60)
        print(f"📦 Packaging for {target_platform}...")
        print("="*60 + "\n")

        if target_platform == "all":
            cmd = [self.npm_cmd, "run", "electron:build:all"]
        elif target_platform == "win":
            cmd = [self.npm_cmd, "run", "electron:build:win"]
        elif target_platform == "linux":
            cmd = [self.npm_cmd, "run", "electron:build:linux"]
        else:
            print(f"❌ Unknown platform: {target_platform}")
            return 1

        return self.run_command(cmd, f"Building {target_platform.upper()} Package")

    def setup_tftp_root(self):
        """Create TFTP root directory and sample files for testing."""
        self.tftp_root.mkdir(exist_ok=True)
        
        # Create sample test files
        sample_file = self.tftp_root / "test_file.txt"
        if not sample_file.exists():
            sample_file.write_text("QuantumXfer TFTP Test File\nThis file is used for testing TFTP transfers.\n")
        
        readme_file = self.tftp_root / "README.txt"
        if not readme_file.exists():
            readme_file.write_text("TFTP Root Directory\n\nThis directory contains files for TFTP testing.\n")
        
        print(f"✅ TFTP root directory: {self.tftp_root}")
        return self.tftp_root

    def start_tftp_server(self):
        """Start a TFTP server in the background."""
        if self.tftp_process is not None:
            print("⚠️  TFTP server already running")
            return True

        print("\n" + "="*60)
        print("📡 Starting TFTP Server")
        print("="*60)

        # Setup TFTP root directory
        tftp_root = self.setup_tftp_root()

        try:
            # Try to start TFTP server using available tools
            if self.is_windows:
                self._start_tftp_windows(tftp_root)
            else:
                self._start_tftp_unix(tftp_root)
            
            # Give server time to start
            time.sleep(1)
            print(f"✅ TFTP Server started on port {self.tftp_port}")
            print(f"   Root directory: {tftp_root}")
            return True
        except Exception as e:
            print(f"⚠️  Could not start TFTP server: {e}")
            print("   Continuing without TFTP server...")
            return False

    def _start_tftp_windows(self, tftp_root):
        """Start TFTP server on Windows using available tools."""
        try:
            # Try using Trivial Daemon TFTP server (tftpd32 or tftpd64) if available
            self.tftp_process = subprocess.Popen(
                ["python", "-m", "tftpy"],
                cwd=tftp_root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return
        except FileNotFoundError:
            pass

        # Fallback: create a simple Python TFTP server thread
        self._start_python_tftp_server(tftp_root)

    def _start_tftp_unix(self, tftp_root):
        """Start TFTP server on Unix-like systems (Linux, macOS)."""
        try:
            # Try dnsmasq if available
            self.tftp_process = subprocess.Popen(
                ["dnsmasq", "--tftp-root", str(tftp_root), "--tftp-port", str(self.tftp_port)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return
        except FileNotFoundError:
            pass

        try:
            # Try atftpd
            self.tftp_process = subprocess.Popen(
                ["atftpd", "--bind-address", "127.0.0.1", "--port", str(self.tftp_port), str(tftp_root)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return
        except FileNotFoundError:
            pass

        # Fallback: create a simple Python TFTP server thread
        self._start_python_tftp_server(tftp_root)

    def _start_python_tftp_server(self, tftp_root):
        """Start a simple Python TFTP server in a background thread."""
        try:
            import tftpy
        except ImportError:
            raise ImportError(
                "tftpy module not found. Install it with: pip install tftpy"
            )

        def run_tftp():
            server = tftpy.TftpServer(str(tftp_root))
            server.listen("127.0.0.1", self.tftp_port)

        thread = threading.Thread(target=run_tftp, daemon=True)
        thread.start()
        self.tftp_process = "python_thread"

    def stop_tftp_server(self):
        """Stop the TFTP server."""
        if self.tftp_process is None:
            return

        if self.tftp_process == "python_thread":
            print("ℹ️  Python TFTP server (daemon thread) will stop on app exit")
            return

        try:
            self.tftp_process.terminate()
            self.tftp_process.wait(timeout=5)
            print("✅ TFTP server stopped")
        except Exception as e:
            print(f"⚠️  Error stopping TFTP server: {e}")
        finally:
            self.tftp_process = None

    def test_tftp(self):
        """Test TFTP connectivity and transfers."""
        print("\n" + "="*60)
        print("🧪 Testing TFTP Server")
        print("="*60 + "\n")

        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(2)
            
            # Send a simple TFTP read request (RRQ)
            # TFTP RRQ packet: opcode (1) + filename + 0 + mode + 0
            request = b'\x00\x01' + b'test_file.txt\x00' + b'octet\x00'
            
            sock.sendto(request, ("127.0.0.1", self.tftp_port))
            data, addr = sock.recvfrom(512)
            sock.close()
            
            if data[:2] == b'\x00\x03':  # TFTP DATA packet
                print("✅ TFTP server is responding correctly")
                print(f"   Received data packet from {addr}")
                return True
            else:
                print("⚠️  Unexpected TFTP response")
                return False
        except socket.timeout:
            print("❌ TFTP server not responding (timeout)")
            return False
        except Exception as e:
            print(f"❌ TFTP test failed: {e}")
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="QuantumXfer Build and Run Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Build and run in production mode
  python build_and_run.py

  # Run with dev hot-reload
  python build_and_run.py --dev

  # Skip install, just build and run
  python build_and_run.py --skip-install

  # Only build, don't run
  python build_and_run.py --build-only

  # Build and run with TFTP server
  python build_and_run.py --with-tftp

  # Test TFTP connectivity (requires TFTP server running)
  python build_and_run.py --test-tftp

  # Run only (no install or build, assumes already built)
  python build_and_run.py --run-only

  # Package for distribution
  python build_and_run.py --package win
  python build_and_run.py --package linux
  python build_and_run.py --package all
        """,
    )

    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Skip npm install step (use if dependencies already installed)",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip npm build step (use if already built)",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Run in development mode with hot reload (npm run electron:dev)",
    )
    parser.add_argument(
        "--build-only",
        action="store_true",
        help="Only build, don't run Electron app",
    )
    parser.add_argument(
        "--run-only",
        action="store_true",
        help="Only run the app (no install or build, assumes already built)",
    )
    parser.add_argument(
        "--with-tftp",
        action="store_true",
        help="Start TFTP server alongside the app (for testing file transfers)",
    )
    parser.add_argument(
        "--test-tftp",
        action="store_true",
        help="Test TFTP connectivity (requires server already running)",
    )
    parser.add_argument(
        "--package",
        type=str,
        choices=["win", "linux", "all"],
        help="Package the app for distribution (win, linux, or all)",
    )
    parser.add_argument(
        "--root",
        type=str,
        default=None,
        help="Project root directory (defaults to current directory)",
    )

    args = parser.parse_args()

    try:
        builder = QuantumXferBuilder(
            project_root=args.root,
            skip_install=args.skip_install,
            skip_build=args.skip_build,
            dev_mode=args.dev,
        )

        # Handle TFTP test-only command
        if args.test_tftp:
            return 0 if builder.test_tftp() else 1

        # Start TFTP server if requested
        tftp_started = False
        if args.with_tftp:
            tftp_started = builder.start_tftp_server()

        try:
            if args.package:
                return builder.package_app(args.package)
            elif args.build_only:
                # Check prerequisites
                if not builder.check_node_npm():
                    return 1
                # Install and build only
                if builder.install_dependencies() != 0:
                    return 1
                return builder.build_web_assets()
            elif args.run_only:
                # Run only, no install or build
                return builder.run_electron()
            else:
                # Full build and run
                return builder.build_and_run()
        finally:
            # Clean up TFTP server if it was started
            if tftp_started:
                builder.stop_tftp_server()

    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return 1
    except KeyboardInterrupt:
        print("\n\n⏸️  Build cancelled by user")
        return 130
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
