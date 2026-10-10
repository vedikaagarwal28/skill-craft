import axios from 'axios'

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
})
const stateKey = 'skillcraft-v2-demo-state'
const userKey = 'skillcraft-v2-user'
const tokenKey = 'skillcraft-v2-token'

if (demoMode && new URLSearchParams(window.location.search).get('reset') === '1') {
  localStorage.removeItem(stateKey)
  localStorage.removeItem(userKey)
  localStorage.removeItem(tokenKey)
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#/'}`)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const demoUsers = [
  {
    id: 1,
    name: 'Asha Devi',
    email: 'artisan@skillcraft.demo',
    phone: '9876543210',
    role: 'artisan',
    skill: 'Handloom weaving',
    location: 'Bhagalpur, Bihar',
  },
  {
    id: 2,
    name: 'Mira Kapoor',
    email: 'employer@skillcraft.demo',
    phone: '8765432100',
    role: 'employer',
    location: 'Pune, Maharashtra',
  },
]

const demoArtisans = [
  {
    id: 1,
    name: 'Asha Devi',
    skill: 'Handloom weaving',
    location: 'Bhagalpur, Bihar',
    language: 'Hindi',
    hourlyRate: 300,
    trustScore: 4.9,
    contracts: 18,
    reviews: 15,
  },
  {
    id: 3,
    name: 'Ravi Kumar',
    skill: 'Carpentry',
    location: 'Pune, Maharashtra',
    language: 'Marathi',
    hourlyRate: 380,
    trustScore: 4.8,
    contracts: 12,
    reviews: 10,
  },
  {
    id: 4,
    name: 'Nirmala Singh',
    skill: 'Handloom weaving',
    location: 'Varanasi, Uttar Pradesh',
    language: 'Hindi',
    hourlyRate: 280,
    trustScore: 4.7,
    contracts: 9,
    reviews: 8,
  },
  {
    id: 5,
    name: 'Farida Khan',
    skill: 'Tailoring',
    location: 'Nashik, Maharashtra',
    language: 'Hindi',
    hourlyRate: 260,
    trustScore: 4.9,
    contracts: 14,
    reviews: 12,
  },
  {
    id: 6,
    name: 'Arun Prasad',
    skill: 'Electrical work',
    location: 'Pune, Maharashtra',
    language: 'Marathi',
    hourlyRate: 420,
    trustScore: 4.6,
    contracts: 11,
    reviews: 9,
  },
  {
    id: 7,
    name: 'Leela Rao',
    skill: 'Masonry',
    location: 'Bengaluru, Karnataka',
    language: 'Kannada',
    hourlyRate: 350,
    trustScore: 4.8,
    contracts: 16,
    reviews: 13,
  },
]

const initialState = {
  users: demoUsers,
  gigs: [
    {
      id: 101,
      employerId: 2,
      employerName: 'Mira Kapoor',
      skill: 'Handloom weaving',
      description:
        'Create eight naturally dyed cotton table runners for a small homeware collection. We will share references and dimensions before work begins. Materials can be supplied or included in your quote.',
      address: 'Pune, Maharashtra',
      budget: 6800,
      status: 'open',
      postedAt: '2026-10-05T09:00:00Z',
    },
    {
      id: 102,
      employerId: 2,
      employerName: 'Mira Kapoor',
      skill: 'Carpentry',
      description:
        'Repair and refinish four wooden display shelves for a neighbourhood shop. Please include the expected number of working days in your bid.',
      address: 'Pune, Maharashtra',
      budget: 9500,
      status: 'open',
      postedAt: '2026-10-04T12:00:00Z',
    },
    {
      id: 103,
      employerId: 2,
      employerName: 'Mira Kapoor',
      skill: 'Tailoring',
      description:
        'Stitch 20 cotton aprons for a community kitchen. Fabric will be supplied. Looking for strong seams and a simple, durable finish.',
      address: 'Nashik, Maharashtra',
      budget: 5200,
      status: 'open',
      postedAt: '2026-10-03T10:00:00Z',
    },
    {
      id: 104,
      employerId: 2,
      employerName: 'Mira Kapoor',
      skill: 'Electrical work',
      description:
        'Install lighting and check wiring in a two room studio. A site visit is welcome before you confirm your quote.',
      address: 'Pune, Maharashtra',
      budget: 7800,
      status: 'open',
      postedAt: '2026-10-02T09:00:00Z',
    },
    {
      id: 105,
      employerId: 2,
      employerName: 'Mira Kapoor',
      skill: 'Handloom weaving',
      description:
        'Weave a small batch of custom scarves in earthy colours for a local exhibition.',
      address: 'Mumbai, Maharashtra',
      budget: 8400,
      status: 'closed',
      postedAt: '2026-09-20T09:00:00Z',
    },
  ],
  bids: [
    {
      id: 201,
      gigId: 101,
      artisanId: 3,
      artisanName: 'Ravi Kumar',
      amount: 6200,
      note: 'I can complete the set in 12 days.',
      status: 'pending',
      appliedAt: '2026-10-05T15:00:00Z',
    },
    {
      id: 202,
      gigId: 101,
      artisanId: 4,
      artisanName: 'Nirmala Singh',
      amount: 6500,
      note: 'Experienced with naturally dyed cotton.',
      status: 'pending',
      appliedAt: '2026-10-05T17:00:00Z',
    },
    {
      id: 203,
      gigId: 105,
      artisanId: 1,
      artisanName: 'Asha Devi',
      amount: 7900,
      note: 'I can work with the requested palette.',
      status: 'accepted',
      appliedAt: '2026-09-21T10:00:00Z',
    },
  ],
  contracts: [
    {
      id: 301,
      gigId: 105,
      artisanId: 1,
      artisanName: 'Asha Devi',
      employerId: 2,
      employerName: 'Mira Kapoor',
      amount: 7900,
      paymentStatus: 'paid',
      skill: 'Handloom weaving',
      address: 'Mumbai, Maharashtra',
      createdAt: '2026-09-22T10:00:00Z',
      rating: 5,
    },
  ],
}

function getState() {
  try {
    return JSON.parse(localStorage.getItem(stateKey)) || initialState
  } catch {
    return initialState
  }
}

function saveState(state) {
  localStorage.setItem(stateKey, JSON.stringify(state))
  return state
}

async function demoHash(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const number = (value) => Number(value || 0)
const date = (value) => value || new Date().toISOString()

export function normaliseGig(row) {
  return {
    id: number(row.id ?? row.gig_id),
    employerId: number(row.employerId ?? row.employer_user_id),
    employerName: row.employerName ?? row.employer_name ?? 'Local employer',
    skill: row.skill ?? row.skill_required,
    description: row.description,
    address: row.address,
    budget: number(row.budget),
    status: row.status,
    postedAt: date(row.postedAt ?? row.posted_date),
    bidCount: number(row.bidCount ?? row.pending_applications),
    matchScore: number(row.matchScore ?? row.match_score),
  }
}

function normaliseBid(row) {
  return {
    id: number(row.id ?? row.application_id),
    gigId: number(row.gigId ?? row.gig_id),
    artisanId: number(row.artisanId ?? row.artisan_id),
    artisanName: row.artisanName ?? row.full_name,
    amount: number(row.amount ?? row.bid_amount),
    note: row.note ?? row.proposal_note,
    status: row.status ?? row.application_status,
    appliedAt: date(row.appliedAt ?? row.applied_at),
    skill: row.skill ?? row.skill_required,
    address: row.address,
    budget: number(row.budget),
    employerName: row.employerName ?? row.employer_name,
  }
}

function normaliseContract(row) {
  return {
    id: number(row.id ?? row.contract_id),
    gigId: number(row.gigId ?? row.gig_id),
    artisanId: number(row.artisanId ?? row.selected_artisan_id),
    artisanName: row.artisanName ?? row.artisan_name,
    employerId: number(row.employerId ?? row.employer_user_id),
    employerName: row.employerName ?? row.employer_name,
    amount: number(row.amount ?? row.final_amount),
    paymentStatus: row.paymentStatus ?? row.payment_status,
    skill: row.skill ?? row.skill_required,
    address: row.address,
    createdAt: date(row.createdAt ?? row.created_at),
    rating: row.rating ?? row.rating_stars,
    employerRating: row.employerRating ?? row.employer_rating_stars,
    partnerPhone: row.partnerPhone ?? row.partner_phone,
    employerPaidAt: row.employerPaidAt ?? row.employer_paid_at,
    artisanReceivedAt: row.artisanReceivedAt ?? row.artisan_received_at,
    confirmationRequired: row.confirmationRequired ?? row.confirmation_required ?? false,
  }
}

function normaliseArtisan(row) {
  return {
    id: number(row.id ?? row.artisan_id),
    name: row.name ?? row.full_name,
    skill: row.skill ?? row.skill_category,
    location: row.location ?? row.base_location,
    language: row.language ?? row.region_language,
    hourlyRate: number(row.hourlyRate ?? row.hourly_rate),
    trustScore: number(row.trustScore ?? row.trust_score),
    contracts: number(row.contracts ?? row.total_contracts_completed),
    reviews: number(row.reviews ?? row.total_reviews),
    matchScore: number(row.matchScore ?? row.match_score),
  }
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(userKey))
  } catch {
    return null
  }
}

export function signOut() {
  localStorage.removeItem(userKey)
  localStorage.removeItem(tokenKey)
}

export async function signIn(identity, password) {
  if (demoMode) {
    const user = getState().users.find(
      (item) =>
        item.email.toLowerCase() === identity.trim().toLowerCase() ||
        item.phone === identity.trim(),
    )
    if (
      !user ||
      (user.passwordHash
        ? user.passwordHash !== (await demoHash(password))
        : password !== 'password123')
    )
      throw new Error('Check your email or phone and password.')
    const { passwordHash, ...publicUser } = user
    localStorage.setItem(userKey, JSON.stringify(publicUser))
    return publicUser
  }
  const { data } = await api.post('/auth/login', { identity, password })
  localStorage.setItem(tokenKey, data.token)
  const user = {
    id: data.user.userId,
    name: data.user.fullName,
    phone: data.user.phone,
    email: data.user.email,
    role: data.user.role,
  }
  localStorage.setItem(userKey, JSON.stringify(user))
  return user
}

export async function register(details) {
  if (demoMode) {
    const state = getState()
    if (
      state.users.some(
        (user) =>
          user.email.toLowerCase() === details.email.toLowerCase() || user.phone === details.phone,
      )
    )
      throw new Error('An account with this email or phone already exists.')
    const user = {
      id: Date.now(),
      name: details.fullName,
      email: details.email,
      phone: details.phone,
      role: details.role,
      skill: details.skillCategory,
      location: details.baseLocation,
      passwordHash: await demoHash(details.password),
    }
    state.users.push(user)
    saveState(state)
    const { passwordHash, ...publicUser } = user
    localStorage.setItem(userKey, JSON.stringify(publicUser))
    return publicUser
  }
  const { data } = await api.post('/auth/register', details)
  localStorage.setItem(tokenKey, data.token)
  const user = {
    id: data.user.userId,
    name: data.user.fullName,
    phone: data.user.phone,
    email: data.user.email,
    role: data.user.role,
  }
  localStorage.setItem(userKey, JSON.stringify(user))
  return user
}

export async function listGigs({ mine = false, q = '', skill = '' } = {}) {
  if (demoMode) {
    const state = getState()
    const user = currentUser()
    return state.gigs
      .filter((gig) => (mine ? gig.employerId === user?.id : gig.status === 'open'))
      .filter((gig) => !skill || gig.skill.toLowerCase() === skill.toLowerCase())
      .filter((gig) => !q || `${gig.skill} ${gig.address} ${gig.description}`.toLowerCase().includes(q.toLowerCase()))
      .map((gig) => ({
        ...gig,
        bidCount: state.bids.filter((bid) => bid.gigId === gig.id && bid.status === 'pending')
          .length,
      }))
  }
  const { data } = await api.get(mine ? '/gigs/mine' : '/gigs', { params: mine ? {} : { q, skillRequired: skill } })
  return data.map(normaliseGig)
}

export async function listArtisans({ q = '', skill = '' } = {}) {
  if (demoMode) return demoArtisans.filter((artisan) => (!skill || artisan.skill.toLowerCase() === skill.toLowerCase()) && (!q || `${artisan.name} ${artisan.skill} ${artisan.location}`.toLowerCase().includes(q.toLowerCase()))).map(normaliseArtisan)
  const { data } = await api.get('/artisans', { params: { q, skillCategory: skill } })
  return data.map(normaliseArtisan)
}

export async function getArtisan(id) {
  if (demoMode) {
    const artisan = demoArtisans.find((item) => item.id === number(id))
    if (!artisan) throw new Error('Artisan not found.')
    return normaliseArtisan(artisan)
  }
  const { data } = await api.get(`/artisans/${id}`)
  return normaliseArtisan(data)
}

export async function getArtisanReviews(id) {
  if (demoMode)
    return [
      {
        id: 1,
        stars: 5,
        text: 'Thoughtful work and delivered right on time.',
        employer: 'Mira Kapoor',
        skill: 'Handloom weaving',
        date: '2026-09-25T10:00:00Z',
      },
      {
        id: 2,
        stars: 5,
        text: 'Clear communication throughout the project.',
        employer: 'Local Home Studio',
        skill: 'Handloom weaving',
        date: '2026-08-16T10:00:00Z',
      },
    ]
  const { data } = await api.get(`/artisans/${id}/reviews`)
  return data.map((row) => ({
    id: row.review_id,
    stars: number(row.rating_stars),
    text: row.feedback_text,
    employer: row.employer_name,
    skill: row.skill_required,
    date: row.review_date,
  }))
}

export async function getGig(id) {
  if (demoMode) {
    const state = getState()
    const gig = state.gigs.find((item) => item.id === number(id))
    if (!gig) throw new Error('Job not found.')
    const user = currentUser()
    const canSeeAll = user?.role === 'employer' && user.id === gig.employerId
    return {
      gig: normaliseGig(gig),
      applications: state.bids
        .filter((bid) => bid.gigId === gig.id && (canSeeAll || bid.artisanId === user?.id))
        .map(normaliseBid),
    }
  }
  const { data } = await api.get(`/gigs/${id}`)
  return { gig: normaliseGig(data.gig), applications: (data.applications || []).map(normaliseBid) }
}

export async function postGig(details) {
  if (demoMode) {
    const state = getState()
    const user = currentUser()
    const gig = {
      id: Date.now(),
      employerId: user.id,
      employerName: user.name,
      skill: details.skillRequired,
      description: details.description,
      address: details.address,
      budget: number(details.budget),
      status: 'open',
      postedAt: new Date().toISOString(),
    }
    state.gigs.unshift(gig)
    saveState(state)
    return gig
  }
  const { data } = await api.post('/gigs', details)
  return normaliseGig(data.gig)
}

export async function cancelGig(id) {
  if (demoMode) {
    const state = getState()
    const gig = state.gigs.find((item) => item.id === number(id))
    if (!gig || gig.employerId !== currentUser()?.id || gig.status !== 'open')
      throw new Error('This job cannot be cancelled.')
    gig.status = 'cancelled'
    saveState(state)
    return gig
  }
  const { data } = await api.patch(`/gigs/${id}/cancel`)
  return normaliseGig(data.gig)
}

export async function getMyBids() {
  if (demoMode) {
    const state = getState()
    return state.bids
      .filter((bid) => bid.artisanId === currentUser()?.id)
      .map((bid) =>
        normaliseBid({
          ...bid,
          ...{
            skill: state.gigs.find((gig) => gig.id === bid.gigId)?.skill,
            address: state.gigs.find((gig) => gig.id === bid.gigId)?.address,
          },
        }),
      )
  }
  const { data } = await api.get('/applications/mine')
  return data.map(normaliseBid)
}

export async function submitBid(gigId, amount, note) {
  if (demoMode) {
    const state = getState()
    const user = currentUser()
    const gig = state.gigs.find((item) => item.id === number(gigId))
    if (!gig || gig.status !== 'open') throw new Error('This job is no longer open.')
    if (state.bids.some((bid) => bid.gigId === gig.id && bid.artisanId === user.id))
      throw new Error('You have already sent a bid for this job.')
    const bid = {
      id: Date.now(),
      gigId: gig.id,
      artisanId: user.id,
      artisanName: user.name,
      amount: number(amount),
      note,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    }
    state.bids.push(bid)
    saveState(state)
    return bid
  }
  const { data } = await api.post(`/gigs/${gigId}/applications`, {
    bidAmount: number(amount),
    note,
  })
  return normaliseBid(data.application)
}

export async function decideBid(bidId, decision) {
  if (demoMode) {
    const state = getState()
    const bid = state.bids.find((item) => item.id === number(bidId))
    const gig = state.gigs.find((item) => item.id === bid?.gigId)
    if (!bid || !gig || gig.employerId !== currentUser()?.id || bid.status !== 'pending')
      throw new Error('This bid can no longer be changed.')
    if (decision === 'accept') {
      if (gig.status !== 'open') throw new Error('This job is no longer open.')
      bid.status = 'accepted'
      gig.status = 'closed'
      state.bids
        .filter(
          (other) => other.gigId === gig.id && other.id !== bid.id && other.status === 'pending',
        )
        .forEach((other) => {
          other.status = 'rejected'
        })
      state.contracts.push({
        id: Date.now(),
        gigId: gig.id,
        artisanId: bid.artisanId,
        artisanName: bid.artisanName,
        employerId: gig.employerId,
        employerName: gig.employerName,
        amount: bid.amount,
        paymentStatus: 'pending',
        confirmationRequired: true,
        employerPaidAt: null,
        artisanReceivedAt: null,
        events: [{ event_type: 'contract_created', created_at: new Date().toISOString() }],
        skill: gig.skill,
        address: gig.address,
        createdAt: new Date().toISOString(),
        rating: null,
      })
    } else bid.status = 'rejected'
    saveState(state)
    return bid
  }
  const { data } = await api.patch(`/applications/${bidId}/${decision}`)
  return normaliseBid(data.application)
}

export async function getContracts() {
  if (demoMode) {
    const user = currentUser()
    const state = getState()
    return state.contracts
      .filter((contract) =>
        user?.role === 'artisan'
          ? contract.artisanId === user.id
          : contract.employerId === user?.id,
      )
      .map((contract) =>
        normaliseContract({
          ...contract,
          partnerPhone: state.users.find(
            (partner) =>
              partner.id === (user.role === 'artisan' ? contract.employerId : contract.artisanId),
          )?.phone,
        }),
      )
  }
  const { data } = await api.get('/contracts/mine')
  return data.map(normaliseContract)
}

export async function markPaid(contractId) {
  if (demoMode) {
    const state = getState()
    const contract = state.contracts.find((item) => item.id === number(contractId))
    if (!contract || contract.employerId !== currentUser()?.id)
      throw new Error('You cannot update this payment.')
    if (contract.employerPaidAt) throw new Error('Payment has already been recorded.')
    contract.employerPaidAt = new Date().toISOString()
    contract.events = [...(contract.events || []), { event_type: 'payment_sent', created_at: contract.employerPaidAt }]
    saveState(state)
    return contract
  }
  const { data } = await api.patch(`/contracts/${contractId}/pay`, { paymentStatus: 'paid' })
  return normaliseContract(data.contract)
}

export async function confirmReceipt(contractId) {
  if (demoMode) {
    const state = getState()
    const contract = state.contracts.find((item) => item.id === number(contractId))
    if (!contract || contract.artisanId !== currentUser()?.id || !contract.employerPaidAt || contract.artisanReceivedAt)
      throw new Error('Receipt cannot be confirmed yet.')
    contract.artisanReceivedAt = new Date().toISOString()
    contract.paymentStatus = 'paid'
    contract.events = [...(contract.events || []), { event_type: 'receipt_confirmed', created_at: contract.artisanReceivedAt }, { event_type: 'payment_confirmed', created_at: contract.artisanReceivedAt }]
    saveState(state)
    return normaliseContract(contract)
  }
  const { data } = await api.patch(`/contracts/${contractId}/confirm-receipt`)
  return normaliseContract(data.contract)
}

export async function getContractEvents(contractId) {
  if (demoMode) return getState().contracts.find((item) => item.id === number(contractId))?.events || []
  const { data } = await api.get(`/contracts/${contractId}/events`)
  return data
}

export async function reviewContract(contractId, ratingStars, feedbackText) {
  if (demoMode) {
    const state = getState()
    const contract = state.contracts.find((item) => item.id === number(contractId))
    if (
      !contract ||
      contract.employerId !== currentUser()?.id ||
      contract.paymentStatus !== 'paid' ||
      contract.rating
    )
      throw new Error('This contract cannot be reviewed.')
    contract.rating = ratingStars
    contract.feedback = feedbackText
    saveState(state)
    return contract
  }
  const { data } = await api.post(`/contracts/${contractId}/review`, { ratingStars, feedbackText })
  return data.review
}

export async function reviewEmployer(contractId, ratingStars, feedbackText) {
  if (demoMode) {
    const state = getState()
    const contract = state.contracts.find((item) => item.id === number(contractId))
    if (!contract || contract.artisanId !== currentUser()?.id || contract.paymentStatus !== 'paid' || contract.employerRating)
      throw new Error('This employer cannot be reviewed for this contract.')
    contract.employerRating = ratingStars
    contract.employerFeedback = feedbackText
    saveState(state)
    return contract
  }
  const { data } = await api.post(`/contracts/${contractId}/employer-review`, { ratingStars, feedbackText })
  return data.review
}

export async function getEmployerReviews(id) {
  if (demoMode) {
    return getState().contracts
      .filter((contract) => contract.employerId === number(id) && contract.employerRating)
      .map((contract) => ({
        id: contract.id,
        stars: contract.employerRating,
        text: contract.employerFeedback,
        artisan: contract.artisanName,
        skill: contract.skill,
        date: contract.createdAt,
      }))
  }
  const { data } = await api.get(`/employers/${id}/reviews`)
  return data.map((row) => ({
    id: row.review_id,
    stars: Number(row.rating_stars),
    text: row.feedback_text,
    artisan: row.artisan_name,
    skill: row.skill_required,
    date: row.review_date,
  }))
}

export const money = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number(amount))
export const shortDate = (value) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  )
export function messageFrom(error) {
  return error.response?.data?.error || error.message || 'Something went wrong. Please try again.'
}
