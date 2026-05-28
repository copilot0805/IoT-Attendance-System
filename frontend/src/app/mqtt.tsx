import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type MqttContextValue = {
  client: any | null;
  connected: boolean;
  lastMessage: { topic: string; message: string } | null;
};

const MqttContext = createContext<MqttContextValue>({ client: null, connected: false, lastMessage: null });

export const MqttProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<any | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ topic: string; message: string } | null>(null);

  useEffect(() => {
    // const url = import.meta.env.VITE_MQTT_URL || 'wss://2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud:8884/mqtt';
    // MOCKED TO BYPASS BUFFER AND MQTT CRASH IN VITE
  }, []);

  return <MqttContext.Provider value={{ client, connected, lastMessage }}>{children}</MqttContext.Provider>;
};

export const useMqtt = () => useContext(MqttContext);

export default MqttContext;
