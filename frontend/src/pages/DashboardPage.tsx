export function DashboardPage() {
  return (
    <section className="content">
      <header className="section-head">
        <h2>Dashboard</h2>
        <p>Starter hub for your frontend implementation.</p>
      </header>

      <div className="grid cards">
        <article className="card">
          <h3>User Management</h3>
          <p>Create employee account, upload face photo, and update records.</p>
        </article>

        <article className="card">
          <h3>Attendance Validation</h3>
          <p>Upload JPEG image to test backend attendance recognition endpoint.</p>
        </article>

        <article className="card">
          <h3>Next Suggested API</h3>
          <p>Ask backend team to add user list and attendance logs for real dashboard.</p>
        </article>
      </div>
    </section>
  );
}
