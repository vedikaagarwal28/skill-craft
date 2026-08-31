import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          SkillCraft
        </Link>
        
        <div className="navbar-links">
          {user?.role === 'artisan' && (
            <>
              <Link to="/gigs" className="nav-link">Browse Gigs</Link>
              <Link to="/contracts" className="nav-link">My Contracts</Link>
              <Link to="/artisan/dashboard" className="nav-link">Dashboard</Link>
            </>
          )}
          
          {user?.role === 'employer' && (
            <>
              <Link to="/gigs" className="nav-link">Manage Gigs</Link>
              <Link to="/employer/dashboard" className="nav-link">Dashboard</Link>
            </>
          )}
          
          {user?.role === 'admin' && (
            <Link to="/admin/dashboard" className="nav-link">Admin</Link>
          )}

          <span className="user-info">{user?.email}</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
