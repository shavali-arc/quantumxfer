import KeyGenerator from './components/KeyGenerator';

export default function KeyManagerApp() {
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
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>QuantumXfer</div>
      </div>

      <div style={{ padding: '1rem' }}>
        <KeyGenerator />
      </div>
    </div>
  );
}
