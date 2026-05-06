import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;
import mqtt, { type MqttClient } from 'mqtt';

type MqttContextValue = {
  client: MqttClient | null;
  connected: boolean;
  lastMessage: { topic: string; message: string } | null;
};

const MqttContext = createContext<MqttContextValue>({ client: null, connected: false, lastMessage: null });

export const MqttProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ topic: string; message: string } | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_MQTT_URL || 'wss://2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud:8884/mqtt';
    const username = import.meta.env.VITE_MQTT_USERNAME || 'hcmut_attendance';
    const password = import.meta.env.VITE_MQTT_PASSWORD || '';

    const opts = {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 30 * 1000,
    };

    const c = mqtt.connect(url, opts);
    setClient(c);

    c.on('connect', () => {
      setConnected(true);
      console.log('[MQTT] connected');
      try { c.subscribe('bku/attendance/gate/control'); } catch (e) { console.warn('[MQTT] subscribe failed', e); }
    });

    c.on('reconnect', () => console.log('[MQTT] reconnecting'));
    c.on('close', () => { setConnected(false); console.log('[MQTT] closed'); });
    c.on('error', (err: Error) => console.error('[MQTT] error', err));
    c.on('message', (topic: string, payload: Buffer) => {
      const msg = payload.toString();
      console.log('[MQTT] message', topic, msg);
      setLastMessage({ topic, message: msg });
    });

    return () => { try { c.end(true); } catch (e) {} };
  }, []);

  return <MqttContext.Provider value={{ client, connected, lastMessage }}>{children}</MqttContext.Provider>;
};

export const useMqtt = () => useContext(MqttContext);

export default MqttContext;
