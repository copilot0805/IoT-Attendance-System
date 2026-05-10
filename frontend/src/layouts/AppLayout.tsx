import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export function AppLayout() {
  const { user, logout } = useAuth();
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
          <NavLink to="/users">User Management</NavLink>
          <NavLink to="/attendance-test">Attendance Test</NavLink>
        </nav>

        <div className="sidebar-footer">
          <p className="muted">Logged in as</p>
          <p>{user?.email}</p>
          <p className="pill">Role: {user?.role}</p>
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
