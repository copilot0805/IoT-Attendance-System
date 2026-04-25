import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="center-box">
      <h2>Page not found</h2>
      <p>The route you requested does not exist.</p>
      <Link to="/" className="button">
        Back to dashboard
      </Link>
    </div>
  );
}
