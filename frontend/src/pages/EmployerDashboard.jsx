import './Dashboard.css'

function EmployerDashboard({ user }) {
  return (
    <div className="dashboard-container">
      <h1>Employer Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
      <p>Manage your gigs and view bidding artisans here.</p>
    </div>
  )
}

export default EmployerDashboard
