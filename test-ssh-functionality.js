#!/usr/bin/env node
/**
 * QuantumXfer SSH Functionality Test Suite
 * Automated testing script for SSH/SFTP operations
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

class QuantumXferTester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test configurations
        this.testConfigs = [
            {
                name: 'WSL Test User',
                host: 'localhost',
                port: 22,
                username: 'testuser',
                password: 'test123'
            },
            {
                name: 'WSL Quantum User',
                host: 'localhost', 
                port: 22,
                username: 'quantumuser',
                password: 'quantum123'
            }
        ];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📝',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        }[type] || '📝';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runTest(testName, testFunction) {
        this.results.total++;
        
        try {
            this.log(`Running test: ${testName}`);
            await testFunction();
            this.results.passed++;
            this.results.tests.push({ name: testName, status: 'PASSED' });
            this.log(`Test passed: ${testName}`, 'success');
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
            this.log(`Test failed: ${testName} - ${error.message}`, 'error');
        }
    }

    async testSSHConnection(config) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                this.log(`SSH connection successful to ${config.host} as ${config.username}`, 'success');
                conn.end();
                resolve();
            });
            
            conn.on('error', (err) => {
                reject(new Error(`SSH connection failed: ${err.message}`));
            });
            
            conn.connect({
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password
            });
        });
    }

    async testCommandExecution(config) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                // Test multiple commands
                const commands = [
                    'whoami',
                    'pwd', 
                    'ls -la',
                    'date',
                    'echo "QuantumXfer test command"'
                ];
                
                let commandIndex = 0;
                
                const executeNextCommand = () => {
                    if (commandIndex >= commands.length) {
                        conn.end();
                        resolve();
                        return;
                    }
                    
                    const command = commands[commandIndex];
                    commandIndex++;
                    
                    conn.exec(command, (err, stream) => {
                        if (err) {
                            conn.end();
                            reject(new Error(`Command execution failed: ${err.message}`));
                            return;
                        }
                        
                        let output = '';
                        
                        stream.on('close', (code) => {
                            if (code === 0) {
                                this.log(`Command "${command}" executed successfully: ${output.trim()}`);
                                executeNextCommand();
                            } else {
                                conn.end();
                                reject(new Error(`Command "${command}" exited with code ${code}`));
                            }
                        });
                        
                        stream.on('data', (data) => {
                            output += data.toString();
                        });
                        
                        stream.stderr.on('data', (data) => {
                            this.log(`Command stderr: ${data}`, 'warning');
                        });
                    });
                };
                
                executeNextCommand();
            });
            
            conn.on('error', (err) => {
                reject(new Error(`SSH connection failed: ${err.message}`));
            });
            
            conn.connect({
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password
            });
        });
    }

    async testSFTPOperations(config) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        reject(new Error(`SFTP initialization failed: ${err.message}`));
                        return;
                    }
                    
                    // Test directory listing
                    sftp.readdir('.', (err, list) => {
                        if (err) {
                            conn.end();
                            reject(new Error(`SFTP readdir failed: ${err.message}`));
                            return;
                        }
                        
                        this.log(`SFTP directory listing successful, found ${list.length} items`);
                        
                        // Test file upload
                        const testContent = `QuantumXfer test file created at ${new Date().toISOString()}`;
                        const tempFile = path.join(os.tmpdir(), 'quantumxfer-test.txt');
                        
                        fs.writeFileSync(tempFile, testContent);
                        
                        sftp.fastPut(tempFile, './quantumxfer-test.txt', (err) => {
                            if (err) {
                                conn.end();
                                reject(new Error(`SFTP upload failed: ${err.message}`));
                                return;
                            }
                            
                            this.log('SFTP file upload successful');
                            
                            // Test file download
                            const downloadFile = path.join(os.tmpdir(), 'quantumxfer-download.txt');
                            
                            sftp.fastGet('./quantumxfer-test.txt', downloadFile, (err) => {
                                if (err) {
                                    conn.end();
                                    reject(new Error(`SFTP download failed: ${err.message}`));
                                    return;
                                }
                                
                                // Verify downloaded content
                                const downloadedContent = fs.readFileSync(downloadFile, 'utf8');
                                if (downloadedContent === testContent) {
                                    this.log('SFTP file download and verification successful');
                                    
                                    // Cleanup
                                    sftp.unlink('./quantumxfer-test.txt', (err) => {
                                        if (err) {
                                            this.log(`Cleanup warning: ${err.message}`, 'warning');
                                        }
                                        
                                        try {
                                            fs.unlinkSync(tempFile);
                                            fs.unlinkSync(downloadFile);
                                        } catch (e) {
                                            this.log(`Local cleanup warning: ${e.message}`, 'warning');
                                        }
                                        
                                        conn.end();
                                        resolve();
                                    });
                                } else {
                                    conn.end();
                                    reject(new Error('Downloaded file content does not match uploaded content'));
                                }
                            });
                        });
                    });
                });
            });
            
            conn.on('error', (err) => {
                reject(new Error(`SSH connection failed: ${err.message}`));
            });
            
            conn.connect({
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password
            });
        });
    }

    async testLargeFileTransfer(config) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        reject(new Error(`SFTP initialization failed: ${err.message}`));
                        return;
                    }
                    
                    // Create a 1MB test file
                    const testData = Buffer.alloc(1024 * 1024, 'A'); // 1MB of 'A' characters
                    const tempFile = path.join(os.tmpdir(), 'quantumxfer-large-test.bin');
                    
                    fs.writeFileSync(tempFile, testData);
                    
                    const startTime = Date.now();
                    
                    sftp.fastPut(tempFile, './quantumxfer-large-test.bin', (err) => {
                        if (err) {
                            conn.end();
                            reject(new Error(`Large file upload failed: ${err.message}`));
                            return;
                        }
                        
                        const uploadTime = Date.now() - startTime;
                        this.log(`Large file (1MB) upload completed in ${uploadTime}ms`);
                        
                        // Download it back
                        const downloadFile = path.join(os.tmpdir(), 'quantumxfer-large-download.bin');
                        const downloadStart = Date.now();
                        
                        sftp.fastGet('./quantumxfer-large-test.bin', downloadFile, (err) => {
                            if (err) {
                                conn.end();
                                reject(new Error(`Large file download failed: ${err.message}`));
                                return;
                            }
                            
                            const downloadTime = Date.now() - downloadStart;
                            this.log(`Large file (1MB) download completed in ${downloadTime}ms`);
                            
                            // Verify file size
                            const downloadedSize = fs.statSync(downloadFile).size;
                            if (downloadedSize === testData.length) {
                                this.log('Large file transfer verification successful');
                                
                                // Cleanup
                                sftp.unlink('./quantumxfer-large-test.bin', (err) => {
                                    if (err) {
                                        this.log(`Remote cleanup warning: ${err.message}`, 'warning');
                                    }
                                    
                                    try {
                                        fs.unlinkSync(tempFile);
                                        fs.unlinkSync(downloadFile);
                                    } catch (e) {
                                        this.log(`Local cleanup warning: ${e.message}`, 'warning');
                                    }
                                    
                                    conn.end();
                                    resolve();
                                });
                            } else {
                                conn.end();
                                reject(new Error(`File size mismatch: expected ${testData.length}, got ${downloadedSize}`));
                            }
                        });
                    });
                });
            });
            
            conn.on('error', (err) => {
                reject(new Error(`SSH connection failed: ${err.message}`));
            });
            
            conn.connect({
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password
            });
        });
    }

    async runAllTests() {
        this.log('🚀 Starting QuantumXfer SSH Test Suite');
        this.log('===============================================');
        
        for (const config of this.testConfigs) {
            this.log(`\n🔧 Testing configuration: ${config.name}`);
            this.log(`   Host: ${config.host}:${config.port}`);
            this.log(`   Username: ${config.username}`);
            
            await this.runTest(
                `SSH Connection - ${config.name}`,
                () => this.testSSHConnection(config)
            );
            
            await this.runTest(
                `Command Execution - ${config.name}`,
                () => this.testCommandExecution(config)
            );
            
            await this.runTest(
                `SFTP Operations - ${config.name}`,
                () => this.testSFTPOperations(config)
            );
            
            await this.runTest(
                `Large File Transfer - ${config.name}`,
                () => this.testLargeFileTransfer(config)
            );
        }
        
        this.printResults();
    }

    printResults() {
        this.log('\n📊 Test Results Summary');
        this.log('===============================================');
        this.log(`Total Tests: ${this.results.total}`);
        this.log(`Passed: ${this.results.passed}`, 'success');
        this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
        this.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        this.log('\n📋 Detailed Results:');
        this.results.tests.forEach(test => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            this.log(`${status} ${test.name}`);
            if (test.error) {
                this.log(`   Error: ${test.error}`, 'error');
            }
        });
        
        if (this.results.failed === 0) {
            this.log('\n🎉 All tests passed! QuantumXfer SSH functionality is working correctly.', 'success');
        } else {
            this.log('\n⚠️  Some tests failed. Please check the SSH server configuration.', 'warning');
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new QuantumXferTester();
    tester.runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = QuantumXferTester;
