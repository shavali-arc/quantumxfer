# QuantumXfer Structured Logging Framework

## Overview

QuantumXfer implements a comprehensive structured logging framework using Winston, designed to provide audit trails, security monitoring, and operational insights for SSH file transfer operations.

## Features

- **Structured JSON Logging**: All logs are formatted as JSON for easy parsing and analysis
- **Log Levels**: Error, Warn, Info, Debug with configurable minimum levels
- **Daily Log Rotation**: Automatic rotation with configurable max file size and retention
- **Sensitive Data Sanitization**: Automatic redaction of passwords, tokens, and SSH keys
- **Audit Logging**: Dedicated audit trail for SSH operations (connections, commands, transfers)
- **Multiple Transports**: Console (development), file, error logs, and audit logs
- **Exception Handling**: Separate logging for uncaught exceptions and promise rejections

## Log Levels

Log levels control what messages are logged. Set via the `level` option in Logger constructor:

### DEBUG
- Detailed debugging information
- Variable states, function calls, detailed diagnostic data
- **Use Case**: Development and troubleshooting

### INFO
- General informational messages (default)
- SSH connection events, command execution
- System startup, configuration changes
- **Use Case**: Operational monitoring

### WARN
- Warning conditions that should be reviewed
- Connection timeouts, failed retries
- **Use Case**: Identifying potential issues

### ERROR
- Critical errors that need attention
- Connection failures, authentication errors, file transfer failures
- **Use Case**: Alerting and incident response

## Log File Structure

Logs are stored in the application's userData directory under `logs/`:

```
~/.quantumxfer/logs/
├── quantumxfer-2024-01-15.log      # All logs (daily)
├── quantumxfer-2024-01-14.log      # Previous day
├── error-2024-01-15.log            # Error logs only (daily)
├── audit-2024-01-15.log            # Audit trail (daily)
├── exception-2024-01-15.log        # Uncaught exceptions
└── rejection-2024-01-15.log        # Promise rejections
```

### Log Retention Policy

- **General logs**: 14 days
- **Error logs**: 14 days
- **Audit logs**: 30 days (longer retention for compliance)
- **Exceptions/Rejections**: 14 days

### Log Rotation

- **Trigger**: Daily based on date OR when file exceeds 10MB
- **Format**: `YYYY-MM-DD` date pattern
- **Max Files**: Based on retention policy

## Log Format

All logs are written as JSON objects with the following structure:

```json
{
  "timestamp": "2024-01-15T14:32:45.123Z",
  "level": "info",
  "message": "SSH connection established",
  "service": "quantumxfer",
  "context": "ssh-service",
  "connectionId": "conn-abc123",
  "host": "server.example.com",
  "port": 22,
  "username": "user@example.com",
  "authMethod": "key",
  "success": true,
  "duration": 2450,
  "category": "audit",
  "pid": 12345,
  "hostname": "laptop-01"
}
```

### Standard Fields

- **timestamp**: ISO 8601 timestamp
- **level**: Log level (error, warn, info, debug)
- **message**: Human-readable message
- **service**: Always "quantumxfer"
- **context**: Component that generated the log (e.g., "ssh-service", "app")
- **pid**: Process ID
- **hostname**: Machine hostname
- **category**: Log category (audit, ipc, system)

### Additional Fields

Additional metadata is included based on the log type:

#### SSH Connection Logs
```json
{
  "connectionId": "conn-xyz",
  "host": "server.example.com",
  "port": 22,
  "username": "[REDACTED]",
  "authMethod": "key|password",
  "success": true,
  "error": null,
  "duration": 2450
}
```

#### SSH Command Execution Logs
```json
{
  "connectionId": "conn-xyz",
  "command": "ls -la /home",
  "success": true,
  "exitCode": 0,
  "error": null,
  "duration": 850
}
```

#### File Transfer Logs
```json
{
  "connectionId": "conn-xyz",
  "type": "upload|download",
  "sourcePath": "/local/path/file.zip",
  "destPath": "/remote/path/file.zip",
  "fileSize": 1048576,
  "success": true,
  "error": null,
  "duration": 5200,
  "transferSpeed": "201.5 KB/s"
}
```

## Sensitive Data Sanitization

The logging framework automatically redacts sensitive information from all logs:

### Redacted Fields (by name)
- `password`, `passwd`, `pwd`
- `privateKey`, `private_key`
- `passphrase`
- `token`, `apiToken`, `api_token`, `authToken`
- `secret`, `apiSecret`, `api_secret`
- `auth`, `credentials`
- `credential`

### Redacted Patterns (in string values)
```
password=[redacted]
token=[redacted]
api_key=[redacted]
secret=[redacted]
privateKey=[redacted]
passphrase=[redacted]
```

### Example Sanitization

**Input:**
```json
{
  "host": "server.example.com",
  "username": "user",
  "password": "MySecret123!",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n..."
}
```

**Output:**
```json
{
  "host": "server.example.com",
  "username": "user",
  "password": "[REDACTED]",
  "privateKey": "[REDACTED]"
}
```

## Using the Logger

### Initialization

The logger is automatically initialized in `electron/main.js`:

```javascript
import Logger from './logger.js';

const logger = new Logger({
  level: isDev ? 'DEBUG' : 'INFO',
  enableConsole: isDev,
  enableFile: true,
  context: 'QuantumXfer-Main'
});

logger.info('QuantumXfer Application Started', {
  version: '1.0.0',
  environment: process.env.NODE_ENV,
  platform: process.platform
});
```

### Logging Methods

```javascript
// Debug level
logger.debug('Debug message', { debugInfo: 'value' });

// Info level
logger.info('Information message', { infoData: 'value' });

// Warning level
logger.warn('Warning message', { warningData: 'value' });

// Error level
logger.error('Error message', { errorData: 'value' });
```

### SSH Operation Logging

```javascript
// Log connection
logger.logSSHConnect(connectionId, config, {
  success: true,
  error: null,
  duration: 2450
});

// Log command execution
logger.logSSHCommand(connectionId, command, {
  success: true,
  exitCode: 0,
  error: null,
  duration: 850
});

// Log file transfer
logger.logFileTransfer('upload', connectionId, localPath, remotePath, fileSize, {
  success: true,
  error: null,
  duration: 5200,
  speed: '201.5 KB/s'
});
```

### Dynamic Log Level Control

```javascript
// Set log level at runtime
logger.setLogLevel('DEBUG');  // Enables debug messages
logger.setLogLevel('WARN');   // Only warn and above
```

### Creating Child Loggers

Create child loggers with different context for different modules:

```javascript
const sshLogger = logger.createChild('ssh-service');
const appLogger = logger.createChild('app-lifecycle');

sshLogger.info('SSH operation started');
appLogger.warn('Application warning');
```

## Log Analysis

### Reading Logs

```javascript
// Get last 100 log entries
const logs = logger.readRecentLogs(100);

logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.level}: ${log.message}`);
});
```

### Exporting Logs

```javascript
// Export logs to JSON file
const result = logger.exportLogs('/path/to/export.json');

if (result.success) {
  console.log(`Logs exported to: ${result.path}`);
} else {
  console.error(`Export failed: ${result.error}`);
}
```

### Querying Logs (Linux/Mac)

```bash
# View all logs for today
cat ~/.quantumxfer/logs/quantumxfer-$(date +%Y-%m-%d).log

# View error logs
cat ~/.quantumxfer/logs/error-$(date +%Y-%m-%d).log

# View audit logs
cat ~/.quantumxfer/logs/audit-$(date +%Y-%m-%d).log

# Find logs for specific host
grep '"host":"server.example.com"' ~/.quantumxfer/logs/*.log

# Find failed connections
grep '"success":false' ~/.quantumxfer/logs/audit-*.log

# Count SSH commands by user
grep '"command":' ~/.quantumxfer/logs/audit-*.log | jq -r '.username' | sort | uniq -c
```

### Analyzing with jq

```bash
# Pretty print logs
cat ~/.quantumxfer/logs/quantumxfer-2024-01-15.log | jq '.'

# Filter by level
cat ~/.quantumxfer/logs/*.log | jq 'select(.level=="error")'

# Extract specific fields
cat ~/.quantumxfer/logs/audit-*.log | jq '{timestamp, operation: .message, result: .success}'

# Summary of SSH operations
cat ~/.quantumxfer/logs/audit-*.log | jq '[.[] | select(.category=="audit")] | group_by(.message) | map({operation: .[0].message, count: length})'
```

### Log Aggregation

For centralized log management, logs can be aggregated to external systems:

#### ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# Install filebeat
apt-get install filebeat

# Configure for QuantumXfer logs
cat > /etc/filebeat/filebeat.yml <<EOF
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - ~/.quantumxfer/logs/*.log
  json.message_key: message
  json.keys_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "quantumxfer-%{+yyyy.MM.dd}"
EOF

# Start filebeat
systemctl start filebeat
```

#### Splunk

```bash
# Install Splunk forwarder
wget -O splunkforwarder.tgz "https://www.splunk.com/..."
tar xzf splunkforwarder.tgz

# Configure inputs
cat > /opt/splunkforwarder/etc/apps/search/local/inputs.conf <<EOF
[monitor:///.quantumxfer/logs]
index = quantumxfer
sourcetype = json
EOF

# Start forwarder
/opt/splunkforwarder/bin/splunk start
```

#### Datadog

```bash
# Install Datadog agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"

# Configure log collection
cat > /etc/datadog-agent/conf.d/quantumxfer.d/conf.yaml <<EOF
logs:
  - type: file
    path: ~/.quantumxfer/logs/*.log
    service: quantumxfer
    source: quantumxfer
    parser: json
EOF

# Restart agent
systemctl restart datadog-agent
```

## Best Practices

### What to Log

✅ **DO LOG:**
- SSH connection attempts and results
- Command executions and exit codes
- File transfer operations and sizes
- Authentication failures
- Network errors and timeouts
- Configuration changes
- Application startup/shutdown

❌ **DON'T LOG:**
- Passwords or private keys
- API tokens or secrets
- Full file contents (use paths instead)
- Personal identifying information
- Sensitive user data

### Performance Considerations

- Logging is asynchronous to avoid blocking operations
- Large metadata objects are automatically sanitized and serialized
- Log rotation prevents disk space issues
- Consider log level in production (INFO or WARN)

### Security Considerations

- Logs contain operational data - store securely
- Audit logs have extended 30-day retention for compliance
- Sensitive fields are automatically redacted
- Logs should be protected from unauthorized access
- Consider encrypting log files at rest

## Examples

### Example: SSH Connection Audit Trail

```json
{
  "timestamp": "2024-01-15T14:32:45.123Z",
  "level": "info",
  "message": "SSH connection established",
  "category": "audit",
  "connectionId": "conn-a1b2c3",
  "host": "prod-server-01.example.com",
  "port": 22,
  "username": "deploy-user",
  "authMethod": "key",
  "success": true,
  "duration": 2450
}
```

### Example: Failed Connection

```json
{
  "timestamp": "2024-01-15T14:35:22.456Z",
  "level": "error",
  "message": "SSH connection established",
  "category": "audit",
  "connectionId": null,
  "host": "test-server.example.com",
  "port": 22,
  "username": "testuser",
  "authMethod": "password",
  "success": false,
  "error": "Authentication failed (invalid password)",
  "duration": 1250
}
```

### Example: File Transfer

```json
{
  "timestamp": "2024-01-15T15:10:33.789Z",
  "level": "info",
  "message": "SSH file upload",
  "category": "audit",
  "connectionId": "conn-a1b2c3",
  "type": "upload",
  "sourcePath": "/home/user/backup.tar.gz",
  "destPath": "/backups/2024-01-15-backup.tar.gz",
  "fileSize": 524288000,
  "success": true,
  "duration": 45230,
  "transferSpeed": "11.6 MB/s"
}
```

## Troubleshooting

### Issue: Logs not appearing

**Solution:**
1. Check log level setting: `logger.minLevel`
2. Verify logs directory exists: `~/.quantumxfer/logs/`
3. Check file permissions
4. Review `error-*.log` for any logging errors

### Issue: Disk space growing quickly

**Solution:**
1. Logs are automatically rotated daily and limited to 10MB per file
2. Check retention policy (14 days for general logs, 30 days for audit)
3. Consider archiving old logs
4. Reduce log level from DEBUG to INFO

### Issue: Performance impact

**Solution:**
1. Logging is asynchronous - should not block operations
2. If experiencing slowness, check disk I/O
3. Consider external log shipping to reduce local I/O
4. Monitor log volume and adjust retention if needed

## Future Enhancements

- [ ] Real-time log streaming
- [ ] Advanced filtering and query API
- [ ] Log compression
- [ ] Metric extraction from logs
- [ ] Integration with monitoring systems
- [ ] Structured error codes and categorization
