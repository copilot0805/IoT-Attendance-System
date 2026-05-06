import { Link } from 'react-router-dom';
import { useMqtt } from '../app/mqtt';
import { useAuth } from '../features/auth/useAuth';

export function DashboardPage() {
  const { user } = useAuth();
  const { connected, lastMessage } = useMqtt();

  return (
    <section className="content">
      <header className="section-head">
        <h2>Dashboard</h2>
        <p>Overview hệ thống chấm công và lối tắt thao tác nhanh.</p>
      </header>

      <div className="grid cards">
        <article className="card">
          <h3>Current User</h3>
          <p>{user?.name || user?.email}</p>
          <p className="muted">Role: {user?.role}</p>
        </article>

        <article className="card">
          <h3>MQTT Gate Status</h3>
          <p>{connected ? 'Connected' : 'Disconnected'}</p>
          <p className="muted">Last topic: {lastMessage?.topic || '—'}</p>
        </article>

        <article className="card">
          <h3>Last Message</h3>
          <p style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {lastMessage?.message || 'No message yet'}
          </p>
        </article>
      </div>

      <div className="grid cards">
        {user?.role === 'ADMIN' ? (
          <Link to="/users" className="card">
            <h3>User Management</h3>
            <p>Thêm/sửa/xóa người dùng và cập nhật ảnh khuôn mặt.</p>
          </Link>
        ) : null}

        <Link to="/attendance-test" className="card">
          <h3>Attendance Test</h3>
          <p>Upload ảnh JPEG và test trực tiếp endpoint nhận diện.</p>
        </Link>

        <Link to="/attendance-live" className="card">
          <h3>Live Attendance</h3>
          <p>Theo dõi MQTT message realtime từ hệ thống cửa.</p>
        </Link>

        {user?.role === 'ADMIN' ? (
          <Link to="/attendance-logs" className="card">
            <h3>Attendance Logs</h3>
            <p>Xem lịch sử sự kiện chấm công (nếu backend hỗ trợ).</p>
          </Link>
        ) : null}
      </div>

      <div className="alert">
        {user?.role === 'ADMIN'
          ? 'Bạn đang dùng quyền ADMIN: có thể truy cập toàn bộ chức năng.'
          : 'Bạn đang dùng quyền EMPLOYEE: chỉ hiển thị các trang phù hợp quyền truy cập.'}
      </div>
    </section>
  );
}
