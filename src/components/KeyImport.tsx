import { useState } from 'react';
import type { ElectronAPI, SSHKeyPair } from '../types/electron.d';

type OpenDialogOptions = { title?: string; properties?: Array<'openFile'|'openDirectory'|'multiSelections'|'showHiddenFiles'|'createDirectory'|'promptToCreate'|'noResolveAliases'|'treatPackageAsDirectory'|'dontAddToRecent'>; filters?: Array<{ name: string; extensions: string[] }> };

function isElectronAvailable(win: Window & { electronAPI?: ElectronAPI }): win is Window & { electronAPI: ElectronAPI } {
  return typeof win !== 'undefined' && !!win.electronAPI;
}

export default function KeyImport() {
  const [name, setName] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [publicKeyPath, setPublicKeyPath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState<'idle'|'running'|'success'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SSHKeyPair | null>(null);

  const pickPrivateKey = async () => {
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      const opts: OpenDialogOptions = {
        title: 'Select Private Key',
        properties: ['openFile'],
        filters: [{ name: 'Key Files', extensions: ['pem', 'ppk', 'key'] }]
      };
      const res = await window.electronAPI.showOpenDialog(opts as unknown as { title?: string; properties?: string[]; filters?: Array<{ name: string; extensions: string[] }> });
      if (!res.canceled && res.filePaths?.[0]) setPrivateKeyPath(res.filePaths[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  const pickPublicKey = async () => {
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      const opts: OpenDialogOptions = {
        title: 'Select Public Key (optional)',
        properties: ['openFile'],
        filters: [{ name: 'Public Key', extensions: ['pub'] }]
      };
      const res = await window.electronAPI.showOpenDialog(opts as unknown as { title?: string; properties?: string[]; filters?: Array<{ name: string; extensions: string[] }> });
      if (!res.canceled && res.filePaths?.[0]) setPublicKeyPath(res.filePaths[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  const handleImport = async () => {
    setStatus('running');
    setError(null);
    setResult(null);
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      if (!privateKeyPath) throw new Error('Private key file is required');

      const res = await window.electronAPI.sshKeys.import({
        name: name.trim() || 'imported-key',
        privateKeyPath,
        publicKeyPath: publicKeyPath || undefined,
        passphrase: passphrase || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Import failed');
      }
      setResult(res.data || null);
      setStatus('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: '1.25rem', border: '1px solid #334155' }}>
        <h2 style={{ marginBottom: '0.75rem', color: '#f1f5f9' }}>Import SSH Key</h2>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Key Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-imported-key"
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Passphrase (if encrypted)</label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="optional"
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', fontSize: 14 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Private Key File</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={privateKeyPath}
                placeholder="Select private key (.pem, .ppk, .key)"
                readOnly
                style={{ flex: 1, padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', fontSize: 14 }}
              />
              <button
                onClick={pickPrivateKey}
                style={{ padding: '0.5rem 0.75rem', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >Browse</button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Public Key File (optional)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={publicKeyPath}
                placeholder="Select public key (.pub)"
                readOnly
                style={{ flex: 1, padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', fontSize: 14 }}
              />
              <button
                onClick={pickPublicKey}
                style={{ padding: '0.5rem 0.75rem', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >Browse</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleImport}
              disabled={!privateKeyPath || status === 'running'}
              style={{ padding: '0.5rem 0.75rem', backgroundColor: privateKeyPath ? '#3b82f6' : '#334155', color: 'white', border: 'none', borderRadius: 6, cursor: privateKeyPath ? 'pointer' : 'not-allowed' }}
            >{status === 'running' ? 'Importing…' : 'Import Key'}</button>
            {error && <span style={{ color: '#fda4af', fontSize: 12 }}>{error}</span>}
          </div>
        </div>
      </div>

      {result && (
        <div style={{ backgroundColor: '#0f172a', borderRadius: 12, padding: '1rem', border: '1px solid #334155', marginTop: '1rem' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>Imported Key</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ color: '#94a3b8' }}>Name</div>
            <div style={{ color: '#f1f5f9' }}>{result.name || '(auto)'}</div>
            <div style={{ color: '#94a3b8' }}>Type</div>
            <div style={{ color: '#f1f5f9' }}>{result.type}</div>
            {result.bits && (<><div style={{ color: '#94a3b8' }}>Bits</div><div style={{ color: '#f1f5f9' }}>{result.bits}</div></>)}
            {result.fingerprint && (<><div style={{ color: '#94a3b8' }}>Fingerprint</div><div style={{ color: '#f1f5f9' }}>{result.fingerprint}</div></>)}
            {result.comment && (<><div style={{ color: '#94a3b8' }}>Comment</div><div style={{ color: '#f1f5f9' }}>{result.comment}</div></>)}
          </div>
        </div>
      )}
    </div>
  );
}
