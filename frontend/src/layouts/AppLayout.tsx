import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { useMqtt } from '../app/mqtt';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { connected, lastMessage } = useMqtt();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>IoT Attendance</h1>
            <p>Frontend Skeleton</p>
          </div>
        </div>

        <nav className="menu">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          {user?.role === 'ADMIN' ? <NavLink to="/users">User Management</NavLink> : null}
          <NavLink to="/attendance-test">Attendance Test</NavLink>
          <NavLink to="/attendance-live">Live Attendance</NavLink>
          {user?.role === 'ADMIN' ? (
            <NavLink to="/attendance-logs">Attendance Logs</NavLink>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <p className="muted">Logged in as</p>
          <p>{user?.email}</p>
          <p className="pill">Role: {user?.role}</p>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            <div>MQTT: {connected ? 'Connected' : 'Disconnected'}</div>
            <div style={{ marginTop: 4, color: '#666' }}>
              Last: {lastMessage ? lastMessage.message : '—'}
            </div>
          </div>
          <button onClick={handleLogout} className="button ghost" type="button">
            Logout
          </button>
        </div>
      </aside>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
