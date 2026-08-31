import './Dashboard.css'

function ArtisanDashboard({ user }) {
  return (
    <div className="dashboard-container">
      <h1>Artisan Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
      <p>Your profile information and recent gigs will appear here.</p>
    </div>
  )
}

export default ArtisanDashboard
