import axios from 'axios';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { http } from '../api/http';

type Role = 'ADMIN' | 'EMPLOYEE';

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed'
    );
  }
  return (error as Error).message || 'Unexpected error';
}

export function UserManagementPage() {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const [enroll, setEnroll] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as Role,
    photo: null as File | null,
  });

  const [updatePhoto, setUpdatePhoto] = useState({
    userId: '',
    photo: null as File | null,
  });

  const [deleteUserId, setDeleteUserId] = useState('');

  const enrollUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');

    if (!enroll.photo) {
      setFeedback('Please select a photo for enrollment.');
      return;
    }

    const formData = new FormData();
    formData.append('full_name', enroll.full_name);
    formData.append('email', enroll.email);
    formData.append('password', enroll.password);
    formData.append('role', enroll.role);
    formData.append('photo', enroll.photo);

    try {
      setLoading(true);
      const { data } = await http.post('/users/enroll', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback(`Enroll success: ${data.message}`);
    } catch (error) {
      setFeedback(`Enroll failed: ${extractError(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPhoto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');

    if (!updatePhoto.userId || !updatePhoto.photo) {
      setFeedback('Please provide user id and photo.');
      return;
    }

    const formData = new FormData();
    formData.append('photo', updatePhoto.photo);

    try {
      setLoading(true);
      const { data } = await http.put(`/users/${updatePhoto.userId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback(`Update success: ${data.message}`);
    } catch (error) {
      setFeedback(`Update failed: ${extractError(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');

    if (!deleteUserId) {
      setFeedback('Please provide user id.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await http.delete(`/users/${deleteUserId}`);
      setFeedback(`Delete success: ${data.message}`);
    } catch (error) {
      setFeedback(`Delete failed: ${extractError(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content">
      <header className="section-head">
        <h2>User Management</h2>
        <p>Current backend has enroll, update photo, and delete endpoints only.</p>
      </header>

      <div className="grid forms-3">
        <form className="card stack" onSubmit={enrollUser}>
          <h3>Enroll User</h3>
          <input
            placeholder="Full name"
            value={enroll.full_name}
            onChange={(e) => setEnroll((p) => ({ ...p, full_name: e.target.value }))}
          />
          <input
            placeholder="Email"
            type="email"
            value={enroll.email}
            onChange={(e) => setEnroll((p) => ({ ...p, email: e.target.value }))}
          />
          <input
            placeholder="Password"
            type="password"
            value={enroll.password}
            onChange={(e) => setEnroll((p) => ({ ...p, password: e.target.value }))}
          />
          <select
            value={enroll.role}
            onChange={(e) => setEnroll((p) => ({ ...p, role: e.target.value as Role }))}
          >
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) =>
              setEnroll((p) => ({ ...p, photo: e.target.files?.[0] || null }))
            }
          />
          <button className="button" type="submit" disabled={loading}>
            Submit
          </button>
        </form>

        <form className="card stack" onSubmit={updateUserPhoto}>
          <h3>Update Face Photo</h3>
          <input
            placeholder="User ID (UUID)"
            value={updatePhoto.userId}
            onChange={(e) =>
              setUpdatePhoto((p) => ({ ...p, userId: e.target.value.trim() }))
            }
          />
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) =>
              setUpdatePhoto((p) => ({ ...p, photo: e.target.files?.[0] || null }))
            }
          />
          <button className="button" type="submit" disabled={loading}>
            Update
          </button>
        </form>

        <form className="card stack" onSubmit={deleteUser}>
          <h3>Delete User</h3>
          <input
            placeholder="User ID (UUID)"
            value={deleteUserId}
            onChange={(e) => setDeleteUserId(e.target.value.trim())}
          />
          <button className="button danger" type="submit" disabled={loading}>
            Delete
          </button>
        </form>
      </div>

      {feedback ? <div className="alert">{feedback}</div> : null}
    </section>
  );
}
