import { useState, useEffect } from 'react'
import client from '../api/client'
import './Pages.css'

function ContractHistory({ user }) {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      const response = await client.get('/contracts')
      setContracts(response.data)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container"><p>Loading contracts...</p></div>

  return (
    <div className="container">
      <h1>My Contracts</h1>
      <div className="contracts-list">
        {contracts.length > 0 ? (
          contracts.map(contract => (
            <div key={contract.id} className="contract-item">
              <h3>{contract.gig_title}</h3>
              <p>Status: {contract.status}</p>
              <p>Amount: ₹{contract.amount}</p>
              <p>Started: {new Date(contract.created_at).toLocaleDateString()}</p>
            </div>
          ))
        ) : (
          <p>No contracts found</p>
        )}
      </div>
    </div>
  )
}

export default ContractHistory
