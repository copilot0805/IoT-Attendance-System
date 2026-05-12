import { useEffect, useState } from 'react';
import { useMqtt } from '../app/mqtt';
import { useToast } from '../components/Toast';

export function AttendanceLivePage() {
  const { connected, lastMessage } = useMqtt();
  const toast = useToast();
  const [messages, setMessages] = useState<Array<{ t: string; m: string }>>([]);

  useEffect(() => {
    if (lastMessage) {
      setMessages((s) => [{ t: new Date().toLocaleTimeString(), m: lastMessage.message }, ...s].slice(0, 30));
      try {
        const json = JSON.parse(lastMessage.message);
        if (json.command === 'unlock') {
          toast.push(
            `Unlock command received for ${json.name || json.user || 'unknown'}`,
            'success',
          );
        } else {
          toast.push(`Message: ${JSON.stringify(json)}`, 'info');
        }
      } catch (e) {
        toast.push(`Raw message: ${lastMessage.message}`, 'info');
      }
    }
  }, [lastMessage, toast]);

  return (
    <section className="content">
      <header className="section-head">
        <h2>Live Attendance (MQTT)</h2>
        <p>Shows incoming MQTT messages and triggers UI notifications when commands arrive.</p>
      </header>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Broker status: <strong>{connected ? 'Connected' : 'Disconnected'}</strong></div>
          <div>Last: {lastMessage ? `${lastMessage.topic}` : '—'}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Recent messages</h4>
          <div style={{ maxHeight: 360, overflow: 'auto', marginTop: 8 }}>
            {messages.length === 0 ? <div className="muted">No messages yet</div> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {messages.map((m, i) => (
                  <li key={i} style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{m.t}</div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>{m.m}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AttendanceLivePage;
