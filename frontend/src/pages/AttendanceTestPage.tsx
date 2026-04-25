import axios from 'axios';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { http } from '../api/http';

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

export function AttendanceTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const runTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult('');

    if (!file) {
      setResult('Please select an image file first.');
      return;
    }

    try {
      setLoading(true);
      const bytes = await file.arrayBuffer();
      const { data } = await http.post('/attendance', bytes, {
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(extractError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content">
      <header className="section-head">
        <h2>Attendance Endpoint Test</h2>
        <p>Upload JPEG and call POST /attendance using raw binary payload.</p>
      </header>

      <form className="card stack" onSubmit={runTest}>
        <input
          type="file"
          accept="image/jpeg,image/jpg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send to Attendance API'}
        </button>
      </form>

      <pre className="result-box">{result || 'No response yet.'}</pre>
    </section>
  );
}
