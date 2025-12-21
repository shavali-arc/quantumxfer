import { useEffect, useState } from 'react';
import type { ElectronAPI, SSHKeyPair } from '../types/electron.d';

function isElectronAvailable(win: Window & { electronAPI?: ElectronAPI }): win is Window & { electronAPI: ElectronAPI } {
  return typeof win !== 'undefined' && !!win.electronAPI;
}

export default function KeyList() {
  const [keys, setKeys] = useState<SSHKeyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<SSHKeyPair | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKeys = keys.filter(k => 
    k.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.type?.includes(searchQuery.toLowerCase()) ||
    k.fingerprint?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      const res = await window.electronAPI.sshKeys.list();
      if (!res.success) throw new Error(res.error || 'Failed to list keys');
      setKeys(res.data || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete key "${name}"? This cannot be undone.`)) return;
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      const res = await window.electronAPI.sshKeys.delete(name);
      if (!res.success) throw new Error(res.error || 'Failed to delete key');
      await loadKeys();
      if (selectedKey?.name === name) setShowDetails(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  const handleTest = async (name: string, passphrase?: string) => {
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      const res = await window.electronAPI.sshKeys.test(name, passphrase);
      if (!res.success) throw new Error(res.error || 'Key test failed');
      alert(`✓ Key "${name}" is valid${res.data?.requiresPassphrase ? ' (requires passphrase)' : ''}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`✗ Key test failed: ${msg}`);
    }
  };

  const handleExport = async (name: string) => {
    try {
      if (!isElectronAvailable(window)) throw new Error('Electron API not available');
      const opts: { title?: string; properties?: string[] } = {
        title: `Export key "${name}"`,
        properties: ['openDirectory', 'createDirectory'] as unknown as string[],
      };
      const dialog = await window.electronAPI.showOpenDialog(opts as unknown as { title?: string; properties?: string[] });
      if (dialog.canceled || !dialog.filePaths?.[0]) return;
      const dir = dialog.filePaths[0];

      const res = await window.electronAPI.sshKeys.export(name, dir);
      if (!res.success) throw new Error(res.error || 'Export failed');
      alert(`✓ Key exported to ${res.data?.metadataPath || dir}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`✗ Export failed: ${msg}`);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header & Search */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: '1rem', border: '1px solid #334155', marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: '0.75rem', color: '#f1f5f9' }}>Stored SSH Keys</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, type, or fingerprint…"
            style={{
              flex: 1, padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155',
              borderRadius: 6, color: 'white', fontSize: 14
            }}
          />
          <button
            onClick={loadKeys}
            style={{
              padding: '0.5rem 0.75rem', backgroundColor: '#3b82f6', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12
            }}
          >Refresh</button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#7f1d1d', color: '#fecaca', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading keys…</div>
      )}

      {/* Empty State */}
      {!loading && keys.length === 0 && (
        <div style={{
          backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12,
          padding: '2rem', textAlign: 'center', color: '#94a3b8'
        }}>
          <p>No SSH keys stored yet.</p>
          <p style={{ fontSize: 12 }}>Generate or import a key to get started.</p>
        </div>
      )}

      {/* Keys Table */}
      {!loading && filteredKeys.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', backgroundColor: '#0f172a',
            border: '1px solid #334155', borderRadius: 12, overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Bits</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Fingerprint</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Created</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => (
                <tr key={key.name} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem', color: '#f1f5f9' }}>{key.name || '(unnamed)'}</td>
                  <td style={{ padding: '0.75rem', color: '#f1f5f9' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.25rem 0.5rem', backgroundColor: '#334155',
                      borderRadius: 4, fontSize: 12
                    }}>
                      {key.type || 'unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#f1f5f9' }}>{key.bits || '—'}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {key.fingerprint || '—'}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8', fontSize: 12 }}>
                    {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => { setSelectedKey(key); setShowDetails(true); }}
                        title="View details"
                        style={{
                          padding: '0.4rem 0.6rem', backgroundColor: '#3b82f6', color: 'white',
                          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11
                        }}
                      >📋</button>
                      <button
                        onClick={() => handleTest(key.name || '')}
                        title="Test key validity"
                        style={{
                          padding: '0.4rem 0.6rem', backgroundColor: '#10b981', color: 'white',
                          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11
                        }}
                      >✓</button>
                      <button
                        onClick={() => handleExport(key.name || '')}
                        title="Export key"
                        style={{
                          padding: '0.4rem 0.6rem', backgroundColor: '#f59e0b', color: '#111827',
                          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600
                        }}
                      >⬇</button>
                      <button
                        onClick={() => handleDelete(key.name || '')}
                        title="Delete key"
                        style={{
                          padding: '0.4rem 0.6rem', backgroundColor: '#ef4444', color: 'white',
                          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11
                        }}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No Results */}
      {!loading && filteredKeys.length === 0 && keys.length > 0 && (
        <div style={{
          backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12,
          padding: '2rem', textAlign: 'center', color: '#94a3b8'
        }}>
          No keys match your search.
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedKey && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1e293b', borderRadius: 12, border: '1px solid #334155',
            padding: '1.5rem', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', color: '#f1f5f9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Key Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                  fontSize: 20, padding: 0
                }}
              >✕</button>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[
                ['Name', selectedKey.name || '(unnamed)'],
                ['Type', selectedKey.type || 'unknown'],
                ['Bits', selectedKey.bits ? String(selectedKey.bits) : '—'],
                ['Fingerprint', selectedKey.fingerprint || '—'],
                ['Comment', selectedKey.comment || '—'],
                ['Created', selectedKey.createdAt ? new Date(selectedKey.createdAt).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                  <div style={{ color: '#94a3b8' }}>{label}</div>
                  <div style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { handleTest(selectedKey.name || ''); }}
                style={{
                  padding: '0.5rem 0.75rem', backgroundColor: '#10b981', color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12
                }}
              >Test Key</button>
              <button
                onClick={() => { handleExport(selectedKey.name || ''); }}
                style={{
                  padding: '0.5rem 0.75rem', backgroundColor: '#f59e0b', color: '#111827',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}
              >Export</button>
              <button
                onClick={() => { setShowDetails(false); }}
                style={{
                  marginLeft: 'auto', padding: '0.5rem 0.75rem', backgroundColor: '#334155',
                  color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
