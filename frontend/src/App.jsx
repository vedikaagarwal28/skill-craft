import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import ArtisanDashboard from './pages/ArtisanDashboard'
import EmployerDashboard from './pages/EmployerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import GigBoard from './pages/GigBoard'
import GigDetail from './pages/GigDetail'
import ContractHistory from './pages/ContractHistory'
import Navbar from './components/Navbar'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return <div className="container"><p>Loading...</p></div>
  }

  return (
    <Router>
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/artisan/dashboard" 
          element={user?.role === 'artisan' ? <ArtisanDashboard user={user} /> : <Navigate to="/login" />}
        />
        <Route 
          path="/employer/dashboard" 
          element={user?.role === 'employer' ? <EmployerDashboard user={user} /> : <Navigate to="/login" />}
        />
        <Route 
          path="/admin/dashboard" 
          element={user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/login" />}
        />
        
        <Route path="/gigs" element={user ? <GigBoard user={user} /> : <Navigate to="/login" />} />
        <Route path="/gigs/:gigId" element={user ? <GigDetail user={user} /> : <Navigate to="/login" />} />
        <Route path="/contracts" element={user ? <ContractHistory user={user} /> : <Navigate to="/login" />} />

        <Route path="/" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App
