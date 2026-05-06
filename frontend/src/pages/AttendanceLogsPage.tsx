import { useEffect, useState } from 'react';
import { http } from '../api/http';

export function AttendanceLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await http.get('/attendance/logs');
        if (mounted) setLogs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError('Could not fetch attendance logs (endpoint may be unavailable)');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="content">
      <header className="section-head">
        <h2>Attendance Logs</h2>
        <p>Read-only view of attendance events (requires backend endpoint `/attendance/logs`).</p>
      </header>

      <div className="card">
        {loading ? <div className="muted">Loading...</div> : null}
        {error ? <div className="alert error">{error}</div> : null}
        {!loading && !error && logs.length === 0 ? <div className="muted">No logs available</div> : null}

        {logs.length > 0 && (
          <div style={{ overflow: 'auto', maxHeight: 480 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Time</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>User</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: 8 }}>{new Date(l.time || Date.now()).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{l.user || l.name || '—'}</td>
                    <td style={{ padding: 8 }}>{l.action || l.status || '—'}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{JSON.stringify(l.payload || l, null, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default AttendanceLogsPage;
