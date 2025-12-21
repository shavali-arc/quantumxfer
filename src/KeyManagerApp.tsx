import { useState } from 'react';
import KeyGenerator from './components/KeyGenerator';
import KeyImport from './components/KeyImport';
import KeyList from './components/KeyList';

export default function KeyManagerApp() {
  const [tab, setTab] = useState<'generate'|'import'|'list'>('list');
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f1f5f9', margin: 0 }}>SSH Key Management</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setTab('list')} style={{ padding: '0.4rem 0.6rem', backgroundColor: tab==='list' ? '#3b82f6' : '#334155', border: '1px solid #475569', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>List Keys</button>
          <button onClick={() => setTab('generate')} style={{ padding: '0.4rem 0.6rem', backgroundColor: tab==='generate' ? '#3b82f6' : '#334155', border: '1px solid #475569', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>Generate</button>
          <button onClick={() => setTab('import')} style={{ padding: '0.4rem 0.6rem', backgroundColor: tab==='import' ? '#3b82f6' : '#334155', border: '1px solid #475569', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>Import</button>
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        {tab === 'list' && <KeyList />}
        {tab === 'generate' && <KeyGenerator />}
        {tab === 'import' && <KeyImport />}
      </div>
    </div>
  );
}
