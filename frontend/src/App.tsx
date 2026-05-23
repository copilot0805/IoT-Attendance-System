import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import { authStorage } from "./auth";
import type {
  AttendanceLogItem,
  RosterItem,
  Shift,
  TimesheetItem,
  User
} from "./types";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  if (!authStorage.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  if (!authStorage.isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Shell({ children }: { children: JSX.Element }) {
  const navigate = useNavigate();
  const isAdmin = authStorage.isAdmin();

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>IoT Attendance</h2>
        <nav>
          <Link to="/">Dashboard</Link>
          {isAdmin && <Link to="/users">Users</Link>}
          {isAdmin && <Link to="/shifts">Shifts</Link>}
          {isAdmin && <Link to="/roster">Roster</Link>}
          <Link to="/timesheets">Timesheets</Link>
          <Link to="/logs">Attendance Logs</Link>
          <Link to="/verify">Verify Face Test</Link>
        </nav>
        <button
          onClick={() => {
            authStorage.clear();
            navigate("/login");
          }}
        >
          Logout
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await api.post("/login", { email, password });
      console.log("LOGIN RESPONSE", response.data);
      const token = response.data.access_token || response.data.accessToken || response.data.token;
      if (!token) {
        throw new Error("Login response did not include a valid access token");
      }
      authStorage.setToken(token);
      navigate("/");
    } catch (e: any) {
      console.log("LOGIN ERROR", e?.response?.status, e?.response?.data);
      setError(e?.response?.data?.error || e?.message || "Login failed");
    }
  };

  return (
    <div className="card auth-card">
      <h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="card">
      <h1>Dashboard</h1>
      <p>Frontend is synced with latest backend endpoints.</p>
      <ul>
        <li>Users management</li>
        <li>Shifts and roster assignment</li>
        <li>Timesheets and attendance logs</li>
      </ul>
    </div>
  );
}

function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [enrollPhoto, setEnrollPhoto] = useState<File | null>(null);
  const [updateUserId, setUpdateUserId] = useState("");
  const [updatePhoto, setUpdatePhoto] = useState<File | null>(null);
  const [deleteUserId, setDeleteUserId] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/users", {
        params: { search, page, limit }
      });
      setItems(response.data.data || []);
      setError("");
    } catch (e: any) {
      console.log("LOAD USERS ERROR", e?.response?.status, e?.response?.data, e?.config?.headers);
      setError(e?.response?.data?.error || "Cannot load users");
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const enroll = async (event: FormEvent) => {
    event.preventDefault();
    if (!enrollPhoto) {
      setError("Please choose a photo for enroll");
      return;
    }
    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);
    formData.append("photo", enrollPhoto);
    try {
      const response = await api.post("/users/enroll", formData);
      setSuccess(response.data.message || "Enroll success");
      setFullName("");
      setEmail("");
      setPassword("");
      setEnrollPhoto(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Enroll failed");
    }
  };

  const updateFace = async (event: FormEvent) => {
    event.preventDefault();
    if (!updatePhoto || !updateUserId) {
      setError("Please fill user id and new photo");
      return;
    }
    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("photo", updatePhoto);
    try {
      const response = await api.put(`/users/${updateUserId}`, formData);
      setSuccess(response.data.message || "Update face success");
      setUpdatePhoto(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Update face failed");
    }
  };

  const deleteUserAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!deleteUserId) {
      setError("Please fill user id to delete");
      return;
    }
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`/users/${deleteUserId}`);
      setSuccess(response.data.message || "Delete success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div className="card">
      <h1>Users</h1>
      <div className="inline">
        <input
          placeholder="Search name/email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => void load()}>Search</button>
        <button
          onClick={() => {
            setPage((p) => Math.max(1, p - 1));
          }}
        >
          Prev page
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next page</button>
      </div>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <p>Use the User ID column below to fill the update/delete forms.</p>

      <div className="grid-two">
        <section className="card inset">
          <h3>Enroll user</h3>
          <form onSubmit={enroll}>
            <input
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEnrollPhoto(e.target.files?.[0] || null)}
            />
            <button type="submit">Enroll</button>
          </form>
        </section>

        <section className="card inset">
          <h3>Update / Delete user</h3>
          <form onSubmit={updateFace}>
            <input
              placeholder="User ID to update photo"
              value={updateUserId}
              onChange={(e) => setUpdateUserId(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUpdatePhoto(e.target.files?.[0] || null)}
            />
            <button type="submit">Update photo</button>
          </form>
          <form onSubmit={deleteUserAction}>
            <input
              placeholder="User ID to delete"
              value={deleteUserId}
              onChange={(e) => setDeleteUserId(e.target.value)}
            />
            <button type="submit">Delete user</button>
          </form>
        </section>
      </div>

      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.user_id}>
              <td>{user.user_id}</td>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShiftsPage() {
  const [items, setItems] = useState<Shift[]>([]);
  const [startTime, setStartTime] = useState("08:00:00");
  const [endTime, setEndTime] = useState("17:00:00");
  const [updateShiftId, setUpdateShiftId] = useState("");
  const [updateStartTime, setUpdateStartTime] = useState("08:00:00");
  const [updateEndTime, setUpdateEndTime] = useState("17:00:00");
  const [deleteShiftId, setDeleteShiftId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/shifts");
      setItems(response.data);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot load shifts");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createShift = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.post("/shifts", { start_time: startTime, end_time: endTime });
      setSuccess("Create shift success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot create shift");
    }
  };

  const updateShiftAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!updateShiftId) {
      setError("Please provide shift id to update");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await api.put(`/shifts/${updateShiftId}`, {
        start_time: updateStartTime,
        end_time: updateEndTime
      });
      setSuccess("Update shift success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot update shift");
    }
  };

  const deleteShiftAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!deleteShiftId) {
      setError("Please provide shift id to delete");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await api.delete(`/shifts/${deleteShiftId}`);
      setSuccess("Delete shift success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot delete shift");
    }
  };

  return (
    <div className="card">
      <h1>Shifts</h1>
      <form className="inline" onSubmit={createShift}>
        <input value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <input value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <button type="submit">Create</button>
      </form>
      <form className="inline" onSubmit={updateShiftAction}>
        <input
          placeholder="Shift ID"
          value={updateShiftId}
          onChange={(e) => setUpdateShiftId(e.target.value)}
        />
        <input
          value={updateStartTime}
          onChange={(e) => setUpdateStartTime(e.target.value)}
        />
        <input value={updateEndTime} onChange={(e) => setUpdateEndTime(e.target.value)} />
        <button type="submit">Update</button>
      </form>
      <form className="inline" onSubmit={deleteShiftAction}>
        <input
          placeholder="Shift ID"
          value={deleteShiftId}
          onChange={(e) => setDeleteShiftId(e.target.value)}
        />
        <button type="submit">Delete</button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {items.map((shift) => (
            <tr key={shift.shift_id}>
              <td>{shift.shift_id}</td>
              <td>{shift.start_time}</td>
              <td>{shift.end_time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RosterPage() {
  const [items, setItems] = useState<RosterItem[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [singleUserId, setSingleUserId] = useState("");
  const [singleShiftId, setSingleShiftId] = useState("");
  const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
  const [removeUserId, setRemoveUserId] = useState("");
  const [removeShiftId, setRemoveShiftId] = useState("");
  const [removeDate, setRemoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkText, setBulkText] = useState(
    JSON.stringify(
      [
        {
          user_id: "",
          shift_id: "",
          working_date: new Date().toISOString().slice(0, 10)
        }
      ],
      null,
      2
    )
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/user-shifts", {
        params: { start_date: startDate, end_date: endDate }
      });
      setItems(response.data);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot load roster");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const assignSingle = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/user-shifts", {
        user_id: singleUserId,
        shift_id: singleShiftId,
        working_date: singleDate
      });
      setSuccess(response.data.message || "Assign success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Assign failed");
    }
  };

  const assignBulk = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const parsed = JSON.parse(bulkText);
      const response = await api.post("/user-shifts/bulk", {
        assignments: parsed
      });
      setSuccess(response.data.message || "Bulk assign success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Bulk assign failed");
    }
  };

  const removeAssign = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const response = await api.delete("/user-shifts", {
        params: {
          user_id: removeUserId,
          shift_id: removeShiftId,
          working_date: removeDate
        }
      });
      setSuccess(response.data.message || "Remove assignment success");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Remove assignment failed");
    }
  };

  return (
    <div className="card">
      <h1>Roster</h1>
      <div className="inline">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={() => void load()}>Load</button>
      </div>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <div className="grid-two">
        <section className="card inset">
          <h3>Assign single shift</h3>
          <form onSubmit={assignSingle}>
            <input
              placeholder="User ID"
              value={singleUserId}
              onChange={(e) => setSingleUserId(e.target.value)}
            />
            <input
              placeholder="Shift ID"
              value={singleShiftId}
              onChange={(e) => setSingleShiftId(e.target.value)}
            />
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
            />
            <button type="submit">Assign</button>
          </form>
        </section>
        <section className="card inset">
          <h3>Remove assignment</h3>
          <form onSubmit={removeAssign}>
            <input
              placeholder="User ID"
              value={removeUserId}
              onChange={(e) => setRemoveUserId(e.target.value)}
            />
            <input
              placeholder="Shift ID"
              value={removeShiftId}
              onChange={(e) => setRemoveShiftId(e.target.value)}
            />
            <input
              type="date"
              value={removeDate}
              onChange={(e) => setRemoveDate(e.target.value)}
            />
            <button type="submit">Remove</button>
          </form>
        </section>
      </div>

      <section className="card inset">
        <h3>Bulk assign (JSON array)</h3>
        <form onSubmit={assignBulk}>
          <textarea
            rows={9}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <button type="submit">Assign bulk</button>
        </form>
      </section>

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Date</th>
            <th>Shift</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={`${row.user_id}-${row.shift_id}-${row.working_date}`}>
              <td>{row.full_name}</td>
              <td>{row.working_date}</td>
              <td>
                {row.start_time} - {row.end_time}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimesheetsPage() {
  const [items, setItems] = useState<TimesheetItem[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/timesheets", { params: { date } });
      setItems(response.data);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot load timesheets");
    }
  };

  return (
    <div className="card">
      <h1>Timesheets</h1>
      <div className="inline">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={() => void load()}>Load</button>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Hours</th>
            <th>In</th>
            <th>Out</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={`${row.user_id}-${row.start_time}-${row.end_time}`}>
              <td>{row.full_name}</td>
              <td>{row.status}</td>
              <td>{row.working_hours}</td>
              <td>{row.check_in || "-"}</td>
              <td>{row.check_out || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogsPage() {
  const [items, setItems] = useState<AttendanceLogItem[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/attendance/logs", { params: { date, limit: 50, offset: 0 } });
      setItems(response.data);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Cannot load logs");
    }
  };

  return (
    <div className="card">
      <h1>Attendance Logs</h1>
      <div className="inline">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={() => void load()}>Load</button>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Event</th>
            <th>Time</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, index) => (
            <tr key={`${row.full_name}-${row.event_time}-${index}`}>
              <td>{row.full_name}</td>
              <td>{row.event_type}</td>
              <td>{new Date(row.event_time).toLocaleString()}</td>
              <td>{row.imgurl ? <a href={row.imgurl}>View</a> : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerifyFacePage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!imageFile) {
      setError("Please choose JPEG image first");
      return;
    }
    setError("");
    setResultText("");
    try {
      const bytes = await imageFile.arrayBuffer();
      const response = await api.post("/verify-face", bytes, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      setResultText(JSON.stringify(response.data, null, 2));
    } catch (e: any) {
      setError(e?.response?.data?.error || "Verify failed");
    }
  };

  return (
    <div className="card">
      <h1>Verify Face Test</h1>
      <form onSubmit={submit}>
        <input
          type="file"
          accept="image/jpeg,image/jpg"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
        <button type="submit">Send to /verify-face</button>
      </form>
      {error && <p className="error">{error}</p>}
      {resultText && <pre className="result">{resultText}</pre>}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Shell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route
                  path="/users"
                  element={
                    <AdminRoute>
                      <UsersPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/shifts"
                  element={
                    <AdminRoute>
                      <ShiftsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/roster"
                  element={
                    <AdminRoute>
                      <RosterPage />
                    </AdminRoute>
                  }
                />
                <Route path="/timesheets" element={<TimesheetsPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/verify" element={<VerifyFacePage />} />
              </Routes>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
