import { useEffect, useMemo, useState } from 'react';
import type { SSHKeyGenerationOptions, SSHKeyPair, ElectronAPI } from '../types/electron.d';
type OpenDialogOptions = { title?: string; properties?: Array<'openFile'|'openDirectory'|'multiSelections'|'showHiddenFiles'|'createDirectory'|'promptToCreate'|'noResolveAliases'|'treatPackageAsDirectory'|'dontAddToRecent'> };

type GenerateStatus = 'idle' | 'running' | 'success' | 'error';

function isElectronAvailable(win: Window & { electronAPI?: ElectronAPI }): win is Window & { electronAPI: ElectronAPI } {
  return typeof win !== 'undefined' && !!win.electronAPI;
}

const defaultOptions: SSHKeyGenerationOptions = {
  type: 'rsa',
  bits: 4096,
  comment: '',
};

export default function KeyGenerator() {
  const [options, setOptions] = useState<SSHKeyGenerationOptions>(defaultOptions);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SSHKeyPair | null>(null);

  const passphraseMismatch = useMemo(() => {
    if (!passphrase && !confirmPassphrase) return false;
    return passphrase !== confirmPassphrase;
  }, [passphrase, confirmPassphrase]);

  useEffect(() => {
    // Ensure RSA bits are set when switching type
    if (options.type !== 'rsa') {
      setOptions(prev => ({ ...prev, bits: undefined }));
    } else if (!options.bits) {
      setOptions(prev => ({ ...prev, bits: 4096 }));
    }
  }, [options.type, options.bits]);

  const canGenerate = useMemo(() => {
    if (!options.type) return false;
    if (options.type === 'rsa' && !options.bits) return false;
    if (passphraseMismatch) return false;
    return true;
  }, [options.type, options.bits, passphraseMismatch]);

  const handleGenerate = async () => {
    setStatus('running');
    setError(null);
    setResult(null);

    try {
      if (!isElectronAvailable(window)) {
        throw new Error('Electron API not available. Please run the desktop app.');
      }

      const payload: SSHKeyGenerationOptions = {
        name: options.name?.trim() || undefined,
        type: options.type,
        bits: options.type === 'rsa' ? options.bits : undefined,
        comment: options.comment?.trim() || undefined,
        passphrase: passphrase ? passphrase : undefined,
      };

      const res = await window.electronAPI.sshKeys.generate(payload);
      if (!res.success) {
        throw new Error(res.error || 'Key generation failed');
      }
      setResult(res.data || null);
      setStatus('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Unexpected error');
      setStatus('error');
    }
  };

  const handleExport = async () => {
    try {
      if (!result?.name) {
        setError('Cannot export: key name is missing');
        return;
      }
      if (!isElectronAvailable(window)) {
        throw new Error('Electron API not available');
      }

      const openOptions: OpenDialogOptions = {
        title: 'Select export directory',
        properties: ['openDirectory', 'createDirectory'],
      };
      const dialog = await window.electronAPI.showOpenDialog(openOptions);
      if (dialog.canceled || !dialog.filePaths?.[0]) return;
      const dir = dialog.filePaths[0];

      const res = await window.electronAPI.sshKeys.export(result.name, dir);
      if (!res.success) {
        throw new Error(res.error || 'Export failed');
      }
      setNotification(`Exported to ${res.data?.metadataPath || dir}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Export error');
    }
  };

  const [notification, setNotification] = useState<string | null>(null);
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: '1.25rem',
        border: '1px solid #334155',
      }}>
        <h2 style={{ marginBottom: '0.75rem', color: '#f1f5f9' }}>SSH Key Generator</h2>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Key Name (optional)</label>
              <input
                type="text"
                placeholder="my-work-key"
                value={options.name || ''}
                onChange={e => setOptions(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
                  borderRadius: 6, color: 'white', fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Type</label>
              <select
                value={options.type}
                onChange={e => setOptions(prev => ({ ...prev, type: e.target.value as SSHKeyGenerationOptions['type'] }))}
                style={{
                  width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
                  borderRadius: 6, color: 'white', fontSize: 14
                }}
              >
                <option value="rsa">RSA</option>
                <option value="ed25519">ED25519</option>
                <option value="ecdsa">ECDSA</option>
              </select>
            </div>
          </div>

          {options.type === 'rsa' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>RSA Bits</label>
              <select
                value={options.bits || 4096}
                onChange={e => setOptions(prev => ({ ...prev, bits: parseInt(e.target.value) }))}
                style={{
                  width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
                  borderRadius: 6, color: 'white', fontSize: 14
                }}
              >
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Comment (email or note)</label>
            <input
              type="text"
              placeholder="user@example.com"
              value={options.comment || ''}
              onChange={e => setOptions(prev => ({ ...prev, comment: e.target.value }))}
              style={{
                width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
                borderRadius: 6, color: 'white', fontSize: 14
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Passphrase (optional)</label>
              <input
                type="password"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
                  borderRadius: 6, color: 'white', fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Confirm Passphrase</label>
              <input
                type="password"
                value={confirmPassphrase}
                onChange={e => setConfirmPassphrase(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
                  borderRadius: 6, color: 'white', fontSize: 14
                }}
              />
              {passphraseMismatch && (
                <div style={{ color: '#f87171', fontSize: 12, marginTop: '0.25rem' }}>Passphrases do not match</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || status === 'running'}
              style={{
                padding: '0.5rem 0.75rem', backgroundColor: canGenerate ? '#3b82f6' : '#334155',
                border: 'none', borderRadius: 6, color: 'white', cursor: canGenerate ? 'pointer' : 'not-allowed'
              }}
            >
              {status === 'running' ? 'Generating…' : 'Generate Key'}
            </button>
            {notification && (
              <span style={{ color: '#a7f3d0', fontSize: 12 }}>{notification}</span>
            )}
            {error && (
              <span style={{ color: '#fda4af', fontSize: 12 }}>{error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Result Panel */}
      {result && (
        <div style={{
          backgroundColor: '#0f172a', borderRadius: 12, padding: '1rem', border: '1px solid #334155', marginTop: '1rem'
        }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>Generated Key</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ color: '#94a3b8' }}>Name</div>
            <div style={{ color: '#f1f5f9' }}>{result.name || '(auto)'}</div>
            <div style={{ color: '#94a3b8' }}>Type</div>
            <div style={{ color: '#f1f5f9' }}>{result.type}</div>
            {result.bits && (
              <>
                <div style={{ color: '#94a3b8' }}>Bits</div>
                <div style={{ color: '#f1f5f9' }}>{result.bits}</div>
              </>
            )}
            {result.fingerprint && (
              <>
                <div style={{ color: '#94a3b8' }}>Fingerprint</div>
                <div style={{ color: '#f1f5f9' }}>{result.fingerprint}</div>
              </>
            )}
            {result.comment && (
              <>
                <div style={{ color: '#94a3b8' }}>Comment</div>
                <div style={{ color: '#f1f5f9' }}>{result.comment}</div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={() => {
                if (result.publicKey) navigator.clipboard.writeText(result.publicKey);
                setNotification('Public key copied');
              }}
              disabled={!result.publicKey}
              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#334155', border: 'none', borderRadius: 6, color: 'white' }}
            >Copy Public Key</button>
            <button
              onClick={() => {
                if (result.privateKey) navigator.clipboard.writeText(result.privateKey);
                setNotification('Private key copied');
              }}
              disabled={!result.privateKey}
              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#334155', border: 'none', borderRadius: 6, color: 'white' }}
            >Copy Private Key</button>
            <button
              onClick={handleExport}
              disabled={!result.name}
              style={{ padding: '0.5rem 0.75rem', backgroundColor: result.name ? '#10b981' : '#334155', border: 'none', borderRadius: 6, color: 'white' }}
            >Export to Folder</button>
          </div>
        </div>
      )}
    </div>
  );
}
