import { useState, useEffect } from 'react'
import client from '../api/client'
import './Pages.css'

function GigBoard({ user }) {
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGigs()
  }, [])

  const fetchGigs = async () => {
    try {
      const response = await client.get('/gigs')
      setGigs(response.data)
    } catch (error) {
      console.error('Failed to fetch gigs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container"><p>Loading gigs...</p></div>

  return (
    <div className="container">
      <h1>Available Gigs</h1>
      <div className="gigs-grid">
        {gigs.length > 0 ? (
          gigs.map(gig => (
            <div key={gig.id} className="gig-card">
              <h3>{gig.title}</h3>
              <p>{gig.description}</p>
              <p className="budget">Budget: ₹{gig.budget}</p>
              <p className="category">{gig.skill_category}</p>
              <button className="view-btn">View Details</button>
            </div>
          ))
        ) : (
          <p>No gigs available</p>
        )}
      </div>
    </div>
  )
}

export default GigBoard
