import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  IndianRupee,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  cancelGig,
  confirmReceipt,
  currentUser,
  decideBid,
  demoMode,
  getArtisan,
  getArtisanReviews,
  getContracts,
  getContractEvents,
  getGig,
  getMyBids,
  listArtisans,
  listGigs,
  markPaid,
  messageFrom,
  money,
  postGig,
  register,
  reviewContract,
  shortDate,
  signIn,
  signOut,
  submitBid,
} from './marketplace'

const skills = [
  'Handloom weaving',
  'Carpentry',
  'Tailoring',
  'Electrical work',
  'Plumbing',
  'Masonry',
]

function useData(load, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = () =>
    load()
      .then(setData)
      .catch((error) => setError(messageFrom(error)))
  useEffect(() => {
    let active = true
    setLoading(true)
    load()
      .then((value) => {
        if (active) {
          setData(value)
          setError('')
        }
      })
      .catch((error) => {
        if (active) setError(messageFrom(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, deps)
  return { data, error, loading, refresh }
}

function Button({ children, variant = 'primary', ...props }) {
  return (
    <button className={`button button-${variant}`} {...props}>
      {children}
    </button>
  )
}
function Notice({ children, good = false }) {
  return children ? (
    <div className={`notice ${good ? 'notice-good' : ''}`} role="status">
      {children}
    </div>
  ) : null
}
function Status({ value }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {{
        open: 'Open',
        closed: 'Matched',
        pending: 'Pending',
        accepted: 'Accepted',
        rejected: 'Declined',
        cancelled: 'Cancelled',
        paid: 'Paid',
        disputed: 'Disputed',
      }[value] || value}
    </span>
  )
}
function Title({ eyebrow, title, text, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  )
}
function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <span>✳</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  )
}

function jobTitle(gig) {
  const firstSentence = gig.description?.trim().split(/[.!?]/)[0].trim()
  if (!firstSentence || firstSentence.split(/\s+/)[0].length > 28) {
    return `${gig.skill} project`
  }
  return firstSentence
}

function Card({ gig }) {
  return (
    <Link className="gig-card" to={`/gigs/${gig.id}`}>
      <div className="card-top">
        <span className="category">{gig.skill}</span>
        <Status value={gig.status} />
      </div>
      {gig.matchScore >= 2 && <span className="fit-note">Matches your skill profile</span>}
      <h3>{jobTitle(gig)}</h3>
      <p>{gig.description}</p>
      <div className="card-meta">
        <span>
          <MapPin size={15} />
          {gig.address}
        </span>
        <span>
          <Clock3 size={15} />
          {shortDate(gig.postedAt)}
        </span>
      </div>
      <div className="card-bottom">
        <div>
          <small>Project budget</small>
          <strong>{money(gig.budget)}</strong>
        </div>
        <span className="arrow-circle">
          <ArrowUpRight size={19} />
        </span>
      </div>
    </Link>
  )
}

function Header({ user, setUser }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const logout = () => {
    signOut()
    setUser(null)
    setOpen(false)
    navigate('/')
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to={user ? '/dashboard' : '/'} className="brand" onClick={() => setOpen(false)}>
          <span className="brand-symbol">✳</span>
          <span>
            skillcraft<small>WORK, WITH WORTH.</small>
          </span>
        </Link>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
          {user && (
            <NavLink to="/dashboard" onClick={() => setOpen(false)}>
              {user.role === 'artisan' ? 'My workspace' : 'Hiring overview'}
            </NavLink>
          )}
          {(!user || user.role === 'artisan') && (
            <NavLink to="/explore" onClick={() => setOpen(false)}>
              Find work
            </NavLink>
          )}
          {(!user || user.role === 'employer') && (
            <NavLink to="/artisans" onClick={() => setOpen(false)}>
              Find artisans
            </NavLink>
          )}
          {user?.role === 'artisan' && (
            <NavLink to="/my-bids" onClick={() => setOpen(false)}>
              My bids
            </NavLink>
          )}
          {user?.role === 'employer' && (
            <NavLink to="/my-jobs" onClick={() => setOpen(false)}>
              My jobs
            </NavLink>
          )}
          {user && (
            <NavLink to="/contracts" onClick={() => setOpen(false)}>
              {user.role === 'artisan' ? 'My agreements' : 'Hires & payments'}
            </NavLink>
          )}
          {user?.role === 'employer' && (
            <NavLink className="mobile-post-link" to="/post-job" onClick={() => setOpen(false)}>
              Post a job
            </NavLink>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="hello">Hi, {user.name?.split(' ')[0]}</span>
              {user.role === 'employer' && (
                <Link className="button button-primary" to="/post-job">
                  Post a job <ArrowRight size={16} />
                </Link>
              )}
              <button className="plain-button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="plain-button" to="/signin">
                Sign in
              </Link>
              <Link className="button button-primary" to="/join">
                Join SkillCraft <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>skillcraft</strong>
        <p>Better work starts closer to home.</p>
      </div>
      <span>Built for skilled hands and good work. · © {new Date().getFullYear()}</span>
    </footer>
  )
}

function Home() {
  const { data: loadedGigs } = useData(() => listGigs(), [])
  const gigs = loadedGigs || []
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">THE LOCAL WORK NETWORK</span>
          <h1>
            Good work.
            <br />
            <em>Fairly found.</em>
          </h1>
          <p>
            A place for skilled artisans and local employers to find each other directly. Real
            opportunities, clear bids, and a record of work you can stand behind.
          </p>
          <div className="hero-links">
            <Link className="button button-primary" to="/explore">
              Explore opportunities <ArrowRight size={18} />
            </Link>
            <a className="under-link" href="#how-it-works">
              How it works <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="hero-small">Built around skill, locality, and trust.</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="weave">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="art-seal">
            SKILL
            <br />
            HAS
            <br />
            VALUE<span>01 / 03</span>
          </div>
          <div className="art-caption">
            Made for the people
            <br />
            behind the work.
          </div>
        </div>
      </section>
      <section className="section" id="how-it-works">
        <div className="section-head">
          <div>
            <span className="eyebrow">A MORE DIRECT WAY</span>
            <h2>
              Work should speak
              <br />
              for itself.
            </h2>
          </div>
          <p>
            SkillCraft brings the whole journey into one place—from finding a job to the final
            payment—so good work can lead to the next opportunity.
          </p>
        </div>
        <div className="steps">
          <div>
            <b>01</b>
            <h3>Find the right fit</h3>
            <p>
              Explore local jobs by skill, location, and budget. See the details before you commit.
            </p>
          </div>
          <div>
            <b>02</b>
            <h3>Agree on the work</h3>
            <p>Artisans send a clear price. Employers compare bids and choose the right partner.</p>
          </div>
          <div>
            <b>03</b>
            <h3>Build a record</h3>
            <p>Keep contracts, recorded payment status, and work feedback together.</p>
          </div>
        </div>
      </section>
      <section className="section opportunity-section">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">OPEN RIGHT NOW</span>
            <h2>Work worth a look.</h2>
          </div>
          <Link className="under-link" to="/explore">
            Browse all work <ArrowRight size={18} />
          </Link>
        </div>
        <div className="gig-grid">
          {gigs.slice(0, 3).map((gig) => (
            <Card gig={gig} key={gig.id} />
          ))}
        </div>
      </section>
      <section className="section split-cta">
        <div className="cta-block">
          <span className="eyebrow">FOR ARTISANS</span>
          <h2>Your skill is your story.</h2>
          <p>
            Find projects that respect your craft. Bid directly and keep a clear record of every
            agreement.
          </p>
          <Link className="under-link" to="/join?role=artisan">
            Join as an artisan <ArrowRight size={17} />
          </Link>
        </div>
        <div className="cta-block dark">
          <span className="eyebrow">FOR EMPLOYERS</span>
          <h2>Meet the person behind the work.</h2>
          <p>Post a job with a clear brief, review offers, and build lasting local partnerships.</p>
          <Link className="under-link" to="/artisans">
            Find skilled people <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  )
}

function Explore() {
  const [query, setQuery] = useState('')
  const [skill, setSkill] = useState('All skills')
  const [sort, setSort] = useState('fit')
  const { data: loadedGigs, loading, error } = useData(() => listGigs({ q: query, skill: skill === 'All skills' ? '' : skill }), [query, skill])
  const gigs = loadedGigs || []
  const results = useMemo(
    () =>
      gigs
        .sort((a, b) =>
          sort === 'high'
            ? b.budget - a.budget
            : sort === 'low'
              ? a.budget - b.budget
              : sort === 'fit'
                ? (b.matchScore - a.matchScore) || new Date(b.postedAt) - new Date(a.postedAt)
                : new Date(b.postedAt) - new Date(a.postedAt),
        ),
    [gigs, query, skill, sort],
  )
  return (
    <main className="page">
      <Title
        eyebrow="THE JOB BOARD"
        title="Find work that fits."
        text="Clear briefs from local employers. Search by skill or place, then send a bid that reflects the value of your work."
      />
      <div className="filters">
        <label className="search">
          <Search size={19} />
          <input
            aria-label="Search jobs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a skill, place, or keyword"
          />
        </label>
        <label>
          <SlidersHorizontal size={17} />
          <select
            aria-label="Filter by skill"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          >
            <option>All skills</option>
            {skills.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <select
            aria-label="Sort jobs"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="fit">Best fit first</option>
            <option value="newest">Newest first</option>
            <option value="high">Highest budget</option>
            <option value="low">Lowest budget</option>
          </select>
        </label>
      </div>
      <p className="count">
        {loading
          ? 'Finding opportunities…'
          : `${results.length} ${results.length === 1 ? 'opportunity' : 'opportunities'} found`}
      </p>
      <Notice>{error}</Notice>
      {!loading &&
        (results.length ? (
          <div className="gig-grid">
            {results.map((gig) => (
              <Card gig={gig} key={gig.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="No matching jobs yet"
            text="Try another skill or a broader search."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setSkill('All skills')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ))}
    </main>
  )
}

function ArtisanCard({ artisan }) {
  return (
    <Link className="artisan-card" to={`/artisans/${artisan.id}`}>
      <div className="artisan-card-top">
        <span className="artisan-avatar">
          {artisan.name
            ?.split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
        </span>
        <span className="trust-score">
          <strong>{artisan.trustScore ? artisan.trustScore.toFixed(1) : '—'}</strong>
          <small>WORK-BASED SCORE</small>
        </span>
      </div>
      <h3>{artisan.name}</h3>
      {artisan.matchScore >= 2 && <span className="fit-note">Fits an open job of yours</span>}
      <span className="category">{artisan.skill}</span>
      <p>
        <MapPin size={15} />
        {artisan.location}
      </p>
      <div className="artisan-proof">
        <span>
          <strong>{artisan.contracts}</strong>
          <small>tracked contracts</small>
        </span>
        <span>
          <strong>{artisan.reviews}</strong>
          <small>contract-linked reviews</small>
        </span>
        <span className="artisan-open">
          <ArrowUpRight size={18} />
        </span>
      </div>
    </Link>
  )
}

function Artisans() {
  const [query, setQuery] = useState('')
  const [skill, setSkill] = useState('All skills')
  const { data: loaded, loading, error } = useData(() => listArtisans({ q: query, skill: skill === 'All skills' ? '' : skill }), [query, skill])
  const artisans = loaded || []
  return (
    <main className="page">
      <Title
        eyebrow="THE PEOPLE BEHIND THE WORK"
        title="Find skilled artisans."
        text="Explore local talent through skills, tracked contracts, and feedback from recorded agreements."
      />
      <div className="filters artisan-filters">
        <label className="search">
          <Search size={19} />
          <input
            aria-label="Search artisans"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a name, skill, or place"
          />
        </label>
        <label>
          <SlidersHorizontal size={17} />
          <select
            aria-label="Filter artisans by skill"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          >
            <option>All skills</option>
            {skills.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="count">{loading ? 'Finding artisans…' : `${artisans.length} artisans found`}</p>
      <Notice>{error}</Notice>
      {!loading &&
        (artisans.length ? (
          <div className="artisan-grid">
            {artisans.map((item) => (
              <ArtisanCard artisan={item} key={item.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="No artisans match yet"
            text="Try a different skill or location."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setSkill('All skills')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ))}
    </main>
  )
}

function ArtisanProfile() {
  const { id } = useParams()
  const profile = useData(() => getArtisan(id), [id])
  const history = useData(() => getArtisanReviews(id), [id])
  const artisan = profile.data
  return (
    <main className="page profile-page">
      <Link className="back-link" to="/artisans">
        <ArrowLeft size={16} /> Back to artisans
      </Link>
      {profile.loading ? (
        <p>Loading profile…</p>
      ) : profile.error ? (
        <Notice>{profile.error}</Notice>
      ) : (
        artisan && (
          <>
            <div className="profile-hero">
              <span className="profile-avatar">
                {artisan.name
                  ?.split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </span>
              <div>
                <span className="eyebrow">ARTISAN PROFILE</span>
                <h1>{artisan.name}</h1>
                <span className="category">{artisan.skill}</span>
                <p>
                  <MapPin size={16} />
                  {artisan.location}
                </p>
              </div>
              <div className="profile-score">
                <strong>{artisan.trustScore ? artisan.trustScore.toFixed(1) : '—'}</strong>
                <span>Contract-linked score</span>
                <small>From completed work and reviews</small>
              </div>
            </div>
            <div className="profile-columns">
              <section className="profile-section">
                <span className="eyebrow">THE WORK RECORD</span>
                <h2>Experience you can see.</h2>
                <p>
                  SkillCraft keeps each agreement and its feedback connected, so a reputation grows
                  from finished work.
                </p>
                <div className="profile-facts">
                  <div>
                    <strong>{artisan.contracts}</strong>
                    <span>Tracked contracts</span>
                  </div>
                  <div>
                    <strong>{artisan.reviews}</strong>
                    <span>Contract-linked reviews</span>
                  </div>
                  <div>
                    <strong>{money(artisan.hourlyRate)}</strong>
                    <span>Hourly rate</span>
                  </div>
                </div>
                <div className="profile-detail">
                  <span>Primary skill</span>
                  <strong>{artisan.skill}</strong>
                </div>
                <div className="profile-detail">
                  <span>Base location</span>
                  <strong>{artisan.location}</strong>
                </div>
                <div className="profile-detail">
                  <span>Language</span>
                  <strong>{artisan.language || 'Not listed'}</strong>
                </div>
              </section>
              <section className="profile-section">
                <span className="eyebrow">WORK RECORD FEEDBACK</span>
                <h2>What employers say.</h2>
                {history.error && <Notice>{history.error}</Notice>}
                {(history.data || []).length ? (
                  history.data.map((review) => (
                    <article className="review" key={review.id}>
                      <div className="review-stars">{'★'.repeat(review.stars)}</div>
                      <p>“{review.text || 'Work completed and reviewed.'}”</p>
                      <span>
                        {review.employer} · {shortDate(review.date)}
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="muted">No reviews have been shared yet.</p>
                )}
              </section>
            </div>
          </>
        )
      )}
    </main>
  )
}

function Detail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, refresh } = useData(() => getGig(id), [id])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  if (loading)
    return (
      <main className="page">
        <p>Loading job…</p>
      </main>
    )
  if (error || !data)
    return (
      <main className="page">
        <Notice>{error || 'Job not found.'}</Notice>
        <Link to="/explore" className="under-link">
          Back to jobs <ArrowRight size={16} />
        </Link>
      </main>
    )
  const { gig, applications } = data
  const mine = user?.role === 'employer' && gig.employerId === user.id
  const alreadyBid =
    user?.role === 'artisan' && applications.some((bid) => bid.artisanId === user.id)
  async function bid(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await submitBid(gig.id, amount, note)
      setMessage('Your bid was sent. Track it in My bids.')
      setAmount('')
      setNote('')
      await refresh()
    } catch (error) {
      setMessage(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  async function decide(id, action) {
    setBusy(true)
    setMessage('')
    try {
      await decideBid(id, action)
      setMessage(
        action === 'accept' ? 'Bid accepted. A contract has been created.' : 'Bid declined.',
      )
      await refresh()
    } catch (error) {
      setMessage(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  async function cancel() {
    setBusy(true)
    setMessage('')
    try {
      await cancelGig(gig.id)
      setMessage('Job cancelled.')
      await refresh()
    } catch (error) {
      setMessage(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page">
      <Link className="back-link" to={mine ? '/my-jobs' : '/explore'}>
        <ArrowLeft size={16} /> {mine ? 'Back to my jobs' : 'Back to opportunities'}
      </Link>
      <div className="detail-layout">
        <div>
          <div className="detail-head">
            <span className="eyebrow">JOB #{gig.id}</span>
            <h1>{jobTitle(gig)}</h1>
            <div className="detail-badges">
              <span className="category">{gig.skill}</span>
              <Status value={gig.status} />
            </div>
          </div>
          <section className="detail-section">
            <h2>The work</h2>
            <p>{gig.description}</p>
          </section>
          <section className="detail-section">
            <h2>The details</h2>
            <div className="facts">
              <div>
                <MapPin size={19} />
                <span>
                  <small>Location</small>
                  <strong>{gig.address}</strong>
                </span>
              </div>
              <div>
                <IndianRupee size={19} />
                <span>
                  <small>Budget</small>
                  <strong>{money(gig.budget)}</strong>
                </span>
              </div>
              <div>
                <Clock3 size={19} />
                <span>
                  <small>Posted</small>
                  <strong>{shortDate(gig.postedAt)}</strong>
                </span>
              </div>
            </div>
          </section>
          {mine && (
            <section className="detail-section">
              <span className="eyebrow">OFFERS RECEIVED</span>
              <h2>
                {applications.length} {applications.length === 1 ? 'bid' : 'bids'} for this job
              </h2>
              {applications.length ? (
                <div className="bid-list">
                  {applications.map((item) => (
                    <article className="bid-row" key={item.id}>
                      <span className="avatar">{item.artisanName?.charAt(0)}</span>
                      <div>
                        <strong>{item.artisanName}</strong>
                        <p>{item.note || 'Available for this project.'}</p>
                        <small>Sent {shortDate(item.appliedAt)}</small>
                      </div>
                      <div className="bid-right">
                        <strong>{money(item.amount)}</strong>
                        <Status value={item.status} />
                        {item.status === 'pending' && gig.status === 'open' && (
                          <div className="bid-buttons">
                            <Button disabled={busy} onClick={() => decide(item.id, 'accept')}>
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() => decide(item.id, 'reject')}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No bids yet"
                  text="Your job is live. Offers will appear here as artisans respond."
                />
              )}
            </section>
          )}
        </div>
        <aside>
          <div className="side-card">
            <span className="eyebrow">THE AGREEMENT</span>
            <strong className="side-budget">{money(gig.budget)}</strong>
            <small>Suggested project budget</small>
            <div className="side-divider" />
            <div className="person">
              <span className="avatar">{gig.employerName?.charAt(0)}</span>
              <div>
                <small>Posted by</small>
                <strong>{gig.employerName}</strong>
              </div>
            </div>
            <div className="side-divider" />
            {user?.role === 'artisan' && gig.status === 'open' && !alreadyBid && (
              <form className="bid-form" onSubmit={bid}>
                <label>
                  Your bid (₹)
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter your price"
                  />
                </label>
                <label>
                  A short note <small>(optional)</small>
                  <textarea
                    rows="3"
                    maxLength="500"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="How would you approach this work?"
                  />
                </label>
                <Button disabled={busy} type="submit">
                  Send your bid <ArrowRight size={17} />
                </Button>
                <small>You can bid once on a job.</small>
              </form>
            )}
            {alreadyBid && (
              <div className="side-message">
                <Check size={18} />
                You’ve already bid. <Link to="/my-bids">Track your offer</Link>
              </div>
            )}
            {mine && gig.status === 'open' && (
              <Button variant="outline" disabled={busy} onClick={cancel}>
                Cancel this job
              </Button>
            )}
            {!user && (
              <>
                <p>Sign in to send a bid and start a clear agreement.</p>
                <Button onClick={() => navigate('/signin')}>
                  Sign in to bid <ArrowRight size={17} />
                </Button>
              </>
            )}
            {gig.status !== 'open' && <p>This job is no longer accepting bids.</p>}
          </div>
          <div className="trust-note">
            <ShieldCheck size={20} />
            Every accepted bid becomes a trackable contract.
          </div>
          <Notice
            good={
              message.startsWith('Your') ||
              message.includes('accepted') ||
              message.includes('cancelled') ||
              message.includes('declined')
            }
          >
            {message}
          </Notice>
        </aside>
      </div>
    </main>
  )
}

function Signin({ setUser }) {
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function enter(login, secret) {
    setBusy(true)
    setError('')
    try {
      const user = await signIn(login, secret)
      setUser(user)
      navigate('/dashboard')
    } catch (error) {
      setError(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow">GOOD TO HAVE YOU BACK</span>
        <h1>The next good job starts here.</h1>
        <p>Pick up where you left off. Your bids, jobs, and agreements are all in one place.</p>
        <span className="story-mark">✳</span>
      </div>
      <div className="auth-content">
        <div className="auth-card">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to SkillCraft</h2>
          <p>Use your email or phone number.</p>
          <Notice>{error}</Notice>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              enter(identity, password)
            }}
          >
            <label>
              Email or phone
              <input
                autoComplete="username"
                required
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
            </label>
            <Button disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            New here? <Link to="/join">Create an account</Link>
          </p>
          {demoMode && (
            <div className="demo-box">
              <span className="eyebrow">EXPLORE THE PREVIEW</span>
              <p>
                Try both sides of the marketplace. Password: <strong>password123</strong>
              </p>
              <button
                disabled={busy}
                onClick={() => enter('artisan@skillcraft.demo', 'password123')}
              >
                Enter as artisan <ArrowRight size={16} />
              </button>
              <button
                disabled={busy}
                onClick={() => enter('employer@skillcraft.demo', 'password123')}
              >
                Enter as employer <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Join({ setUser }) {
  const navigate = useNavigate()
  const [role, setRole] = useState(
    new URLSearchParams(window.location.search).get('role') === 'employer' ? 'employer' : 'artisan',
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function create(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const user = await register({
        fullName: form.get('fullName'),
        email: form.get('email'),
        phone: form.get('phone'),
        password: form.get('password'),
        role,
        skillCategory: form.get('skillCategory'),
        baseLocation: form.get('baseLocation'),
        hourlyRate: Number(form.get('hourlyRate')),
      })
      setUser(user)
      navigate('/dashboard')
    } catch (error) {
      setError(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow">COME BUILD WITH US</span>
        <h1>A better way to work together.</h1>
        <p>Create a profile and start building direct, trusted working relationships.</p>
        <span className="story-mark">✳</span>
      </div>
      <div className="auth-content">
        <div className="auth-card">
          <span className="eyebrow">GET STARTED</span>
          <h2>Join SkillCraft</h2>
          <p>How will you use the platform?</p>
          <div className="role-picker">
            <button
              type="button"
              className={role === 'artisan' ? 'selected' : ''}
              onClick={() => setRole('artisan')}
            >
              I’m an artisan<small>Find work and send bids</small>
            </button>
            <button
              type="button"
              className={role === 'employer' ? 'selected' : ''}
              onClick={() => setRole('employer')}
            >
              I’m an employer<small>Post jobs and hire</small>
            </button>
          </div>
          <Notice>{error}</Notice>
          <form onSubmit={create}>
            <label>
              Full name
              <input name="fullName" required minLength="2" placeholder="Your name" />
            </label>
            <div className="form-two">
              <label>
                Email
                <input name="email" type="email" required placeholder="you@example.com" />
              </label>
              <label>
                Phone
                <input name="phone" required minLength="10" placeholder="Your phone number" />
              </label>
            </div>
            {role === 'artisan' && (
              <div className="form-two">
                <label>
                  Your main skill
                  <select name="skillCategory" required defaultValue="">
                    <option value="" disabled>
                      Choose a skill
                    </option>
                    {skills.map((skill) => (
                      <option key={skill}>{skill}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input name="baseLocation" required placeholder="Town, state" />
                </label>
                <label>
                  Hourly rate (₹)
                  <input name="hourlyRate" type="number" min="1" required placeholder="e.g. 300" />
                </label>
              </div>
            )}
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength="6"
                required
                placeholder="At least 6 characters"
              />
            </label>
            <Button disabled={busy} type="submit">
              {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}

function Dashboard({ user }) {
  const primary = useData(
    () => (user.role === 'artisan' ? getMyBids() : listGigs({ mine: true })),
    [user.id, user.role],
  )
  const agreements = useData(() => getContracts(), [user.id, user.role])
  const opportunities = useData(() => listGigs(), [])
  const items = primary.data || []
  const contracts = agreements.data || []
  const paid = contracts
    .filter((item) => item.paymentStatus === 'paid')
    .reduce((sum, item) => sum + item.amount, 0)
  return (
    <main className="page">
      <Title
        eyebrow={user.role === 'artisan' ? 'YOUR WORKSPACE' : 'YOUR HIRING SPACE'}
        title={`Good to see you, ${user.name?.split(' ')[0]}.`}
        text={
          user.role === 'artisan'
            ? 'Keep an eye on your bids, agreements, and new opportunities.'
            : 'Your jobs, offers, and agreements at a glance.'
        }
        action={
          <Link
            className="button button-primary"
            to={user.role === 'artisan' ? '/explore' : '/post-job'}
          >
            {user.role === 'artisan' ? 'Find work' : 'Post a job'} <ArrowRight size={17} />
          </Link>
        }
      />
      <div className="stats">
        <div>
          <small>{user.role === 'artisan' ? 'Bids sent' : 'Jobs posted'}</small>
          <strong>{items.length}</strong>
          <span>
            {user.role === 'artisan' ? 'Across local opportunities' : 'Across your projects'}
          </span>
        </div>
        <div>
          <small>Active agreements</small>
          <strong>{contracts.filter((item) => item.paymentStatus === 'pending').length}</strong>
          <span>Waiting for settlement</span>
        </div>
        <div className="stat-dark">
          <small>{user.role === 'artisan' ? 'Marked paid to you' : 'Payments marked paid'}</small>
          <strong>{money(paid)}</strong>
          <span>{user.role === 'artisan' ? 'Recorded by employers' : 'Recorded by you'}</span>
        </div>
      </div>
      <div className="panels">
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                {user.role === 'artisan' ? 'OFFERS YOU SENT' : 'JOBS YOU POSTED'}
              </span>
              <h2>{user.role === 'artisan' ? 'Your recent bids' : 'Your jobs'}</h2>
            </div>
            <Link to={user.role === 'artisan' ? '/my-bids' : '/my-jobs'}>
              View all <ArrowRight size={16} />
            </Link>
          </div>
          {items.length ? (
            items.slice(0, 3).map((item) => (
              <Link
                className="compact-row"
                key={item.id}
                to={user.role === 'artisan' ? `/gigs/${item.gigId}` : `/gigs/${item.id}`}
              >
                <span>
                  <strong>{item.skill}</strong>
                  <small>{item.address}</small>
                </span>
                <Status value={item.status} />
              </Link>
            ))
          ) : (
            <Empty
              title="Nothing in motion yet"
              text={
                user.role === 'artisan'
                  ? 'Find your first opportunity and send a bid.'
                  : 'Post a clear brief to get your first offers.'
              }
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                {user.role === 'artisan' ? 'OPEN RIGHT NOW' : 'YOUR HIRING RECORD'}
              </span>
              <h2>{user.role === 'artisan' ? 'Open jobs' : 'Your agreements'}</h2>
            </div>
            <Link to={user.role === 'artisan' ? '/explore' : '/contracts'}>
              View all <ArrowRight size={16} />
            </Link>
          </div>
          {user.role === 'artisan'
            ? (opportunities.data || []).slice(0, 3).map((gig) => (
                <Link className="compact-row" to={`/gigs/${gig.id}`} key={gig.id}>
                  <span>
                    <strong>{gig.skill}</strong>
                    <small>{gig.address}</small>
                  </span>
                  <b>{money(gig.budget)}</b>
                </Link>
              ))
            : contracts.slice(0, 3).map((contract) => (
                <Link className="compact-row" to="/contracts" key={contract.id}>
                  <span>
                    <strong>{contract.skill}</strong>
                    <small>With {contract.artisanName}</small>
                  </span>
                  <Status value={contract.paymentStatus} />
                </Link>
              ))}
          {user.role === 'employer' && !contracts.length && (
            <Empty title="No agreements yet" text="Accept a bid to create your first contract." />
          )}
        </section>
      </div>
      <div className="dashboard-note">
        <ShieldCheck size={23} />
        <span>
          <strong>Every good project builds a record.</strong> Agreed bids become contracts, and
          paid-status contracts can receive feedback.
        </span>
      </div>
    </main>
  )
}

function RecordList({ kind }) {
  const jobs = kind === 'jobs'
  const {
    data: loadedRows,
    loading,
    error,
  } = useData(() => (jobs ? listGigs({ mine: true }) : getMyBids()), [])
  const rows = loadedRows || []
  return (
    <main className="page">
      <Title
        eyebrow={jobs ? 'YOUR PROJECTS' : 'YOUR OFFERS'}
        title={jobs ? 'Jobs you’ve posted' : 'My bids'}
        text={
          jobs
            ? 'Review incoming offers and keep each job moving.'
            : 'A clear view of every offer you have sent and where it stands.'
        }
        action={
          <Link className="button button-primary" to={jobs ? '/post-job' : '/explore'}>
            {jobs ? 'Post a job' : 'Find more work'} <ArrowRight size={17} />
          </Link>
        }
      />
      <Notice>{error}</Notice>
      {loading ? (
        <p>Loading…</p>
      ) : rows.length ? (
        <div className="list-surface">
          {rows.map((item) => (
            <Link className="list-row" to={`/gigs/${jobs ? item.id : item.gigId}`} key={item.id}>
              <span className="list-icon">✳</span>
              <span className="list-copy">
                <strong>{item.skill}</strong>
                <small>
                  <MapPin size={14} />
                  {item.address} · {jobs ? 'Posted' : 'Sent'}{' '}
                  {shortDate(jobs ? item.postedAt : item.appliedAt)}
                </small>
              </span>
              <span className="list-value">
                <strong>{money(jobs ? item.budget : item.amount)}</strong>
                <Status value={item.status} />
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title={jobs ? 'No jobs posted yet' : 'No bids sent yet'}
          text={
            jobs
              ? 'Start with a clear brief so artisans can make a thoughtful offer.'
              : 'Find a job that fits your skills and send your first offer.'
          }
          action={
            <Link className="button button-primary" to={jobs ? '/post-job' : '/explore'}>
              {jobs ? 'Post your first job' : 'Browse opportunities'} <ArrowRight size={17} />
            </Link>
          }
        />
      )}
    </main>
  )
}

function PostJob() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const gig = await postGig({
        skillRequired: form.get('skillRequired'),
        description: form.get('description'),
        address: form.get('address'),
        budget: Number(form.get('budget')),
      })
      navigate(`/gigs/${gig.id}`)
    } catch (error) {
      setError(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page narrow">
      <Link className="back-link" to="/my-jobs">
        <ArrowLeft size={16} /> Back to my jobs
      </Link>
      <Title
        eyebrow="START A PROJECT"
        title="Post a new job"
        text="A thoughtful brief helps the right person understand the work and price it fairly."
      />
      <div className="form-surface">
        <Notice>{error}</Notice>
        <form onSubmit={save}>
          <label>
            Skill needed
            <select name="skillRequired" required defaultValue="">
              <option value="" disabled>
                Choose a category
              </option>
              {skills.map((skill) => (
                <option key={skill}>{skill}</option>
              ))}
            </select>
          </label>
          <label>
            Describe the work
            <textarea
              name="description"
              required
              minLength="25"
              rows="6"
              placeholder="What needs doing? Include size, materials, timing, and what a good result looks like."
            />
            <small>
              At least 25 characters. Give artisans enough detail to make a useful offer.
            </small>
          </label>
          <div className="form-two">
            <label>
              Location
              <input name="address" required placeholder="City, state or neighbourhood" />
            </label>
            <label>
              Budget (₹)
              <input
                name="budget"
                type="number"
                min="1"
                required
                placeholder="Your estimated budget"
              />
            </label>
          </div>
          <div className="form-end">
            <span>
              <ShieldCheck size={19} /> You can review bids before accepting anyone.
            </span>
            <Button disabled={busy} type="submit">
              {busy ? 'Posting…' : 'Publish job'} <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Contracts({ user }) {
  const {
    data: loadedContracts,
    loading,
    error,
    refresh,
  } = useData(() => getContracts(), [user.id])
  const contracts = loadedContracts || []
  const [reviewId, setReviewId] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState({})
  async function pay(id) {
    setBusy(true)
    setMessage('')
    try {
      await markPaid(id)
      setMessage('Payment sent recorded. The artisan can now confirm receipt.')
      await refresh()
    } catch (error) {
      setMessage(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  async function receive(id) {
    setBusy(true)
    setMessage('')
    try {
      await confirmReceipt(id)
      setMessage('Receipt confirmed. This agreement is now marked paid.')
      await refresh()
    } catch (error) {
      setMessage(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  async function showHistory(id) {
    try {
      if (history[id]) { setHistory({ ...history, [id]: null }); return }
      const events = await getContractEvents(id)
      setHistory({ ...history, [id]: events })
    } catch (error) {
      setMessage(messageFrom(error))
    }
  }
  async function review(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      await reviewContract(reviewId, Number(form.get('ratingStars')), form.get('feedbackText'))
      setReviewId(null)
      setMessage('Review saved. Thank you for recognising good work.')
      await refresh()
    } catch (error) {
      setMessage(messageFrom(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className={`page contract-page contract-page-${user.role}`}>
      <Title
        eyebrow={user.role === 'artisan' ? 'YOUR WORK RECORD' : 'YOUR HIRING RECORD'}
        title={user.role === 'artisan' ? 'My agreements' : 'Hires & payments'}
        text={
          user.role === 'artisan'
            ? 'Work you were selected for, with agreed amounts and payment status.'
            : 'People you hired, agreed amounts, payment status, and your reviews.'
        }
      />
      <Notice>{error}</Notice>
      <Notice good={message.startsWith('Payment') || message.startsWith('Receipt') || message.startsWith('Review')}>
        {message}
      </Notice>
      {loading ? (
        <p>Loading contracts…</p>
      ) : contracts.length ? (
        <div className="contract-grid">
          {contracts.map((contract) => (
            <article className="contract-card" key={contract.id}>
              <div className="contract-top">
                <span className="eyebrow">CONTRACT #{contract.id}</span>
                <Status value={contract.paymentStatus} />
              </div>
              <h2>{contract.skill}</h2>
              <p>
                <MapPin size={15} />
                {contract.address}
              </p>
              <div className="contract-person">
                <small>{user.role === 'artisan' ? 'Employer' : 'Artisan'}</small>
                <strong>
                  {user.role === 'artisan' ? contract.employerName : contract.artisanName}
                </strong>
                {contract.partnerPhone && (
                  <a className="contact-link" href={'tel:' + contract.partnerPhone}>
                    Call {contract.partnerPhone}
                  </a>
                )}
              </div>
              <div className="contract-bottom">
                <span>
                  <small>Agreed amount</small>
                  <strong>{money(contract.amount)}</strong>
                </span>
                <small>{shortDate(contract.createdAt)}</small>
              </div>
              {contract.confirmationRequired && contract.paymentStatus === 'pending' && (
                <p className="contract-step">{contract.employerPaidAt ? (user.role === 'artisan' ? 'Employer recorded payment. Confirm when you receive it.' : 'Waiting for the artisan to confirm receipt.') : (user.role === 'artisan' ? 'Waiting for the employer to record payment.' : 'Record payment after you send it to the artisan.')}</p>
              )}
              {user.role === 'employer' && (
                <div className="contract-actions">
                  {contract.paymentStatus === 'pending' && !contract.employerPaidAt && (
                    <Button disabled={busy} onClick={() => pay(contract.id)}>
                      Record payment sent <Check size={16} />
                    </Button>
                  )}
                  {contract.paymentStatus === 'paid' && !contract.rating && (
                    <Button variant="outline" onClick={() => setReviewId(contract.id)}>
                      Leave a review <ArrowRight size={16} />
                    </Button>
                  )}
                  {contract.rating && (
                    <span className="rating">
                      {'★'.repeat(Number(contract.rating))} <small>Contract review</small>
                    </span>
                  )}
                </div>
              )}
              {user.role === 'artisan' && contract.paymentStatus === 'pending' && contract.employerPaidAt && (
                <div className="contract-actions"><Button disabled={busy} onClick={() => receive(contract.id)}>Confirm receipt <Check size={16} /></Button></div>
              )}
              <button className="history-toggle" onClick={() => showHistory(contract.id)}>{history[contract.id] ? 'Hide activity' : 'View activity'}</button>
              {history[contract.id] && <ol className="contract-history">{history[contract.id].map((event) => <li key={event.event_id || `${event.event_type}-${event.created_at}`}><span>{event.event_type.replaceAll('_', ' ')}</span><small>{shortDate(event.created_at)}</small></li>)}</ol>}
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="No contracts yet"
          text="Once a bid is accepted, its agreement and payment record will appear here."
          action={
            <Link
              className="button button-primary"
              to={user.role === 'artisan' ? '/explore' : '/my-jobs'}
            >
              {user.role === 'artisan' ? 'Find work' : 'See my jobs'} <ArrowRight size={17} />
            </Link>
          }
        />
      )}
      {reviewId && (
        <div className="modal-backdrop" onClick={() => setReviewId(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" aria-label="Close" onClick={() => setReviewId(null)}>
              <X size={20} />
            </button>
            <span className="eyebrow">RECOGNISE GOOD WORK</span>
            <h2 id="review-title">Leave a review</h2>
            <p>Your feedback contributes to the artisan’s contract-linked work record.</p>
            <form onSubmit={review}>
              <label>
                Rating
                <select name="ratingStars" required defaultValue="">
                  <option value="" disabled>
                    Choose a rating
                  </option>
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <option key={stars} value={stars}>
                      {stars} {stars === 1 ? 'star' : 'stars'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your feedback
                <textarea
                  name="feedbackText"
                  rows="4"
                  maxLength="1000"
                  placeholder="What went well?"
                />
              </label>
              <Button disabled={busy} type="submit">
                Save review <ArrowRight size={17} />
              </Button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

function Guard({ user, role, children }) {
  return !user ? (
    <Navigate to="/signin" replace />
  ) : role && user.role !== role ? (
    <Navigate to="/dashboard" replace />
  ) : (
    children
  )
}
function Shell() {
  const [user, setUser] = useState(currentUser)
  return (
    <>
      <Header user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route
          path="/explore"
          element={user?.role === 'employer' ? <Navigate to="/my-jobs" replace /> : <Explore />}
        />
        <Route
          path="/artisans"
          element={user?.role === 'artisan' ? <Navigate to="/dashboard" replace /> : <Artisans />}
        />
        <Route
          path="/artisans/:id"
          element={
            user?.role === 'artisan' ? <Navigate to="/dashboard" replace /> : <ArtisanProfile />
          }
        />
        <Route path="/gigs/:id" element={<Detail user={user} />} />
        <Route
          path="/signin"
          element={user ? <Navigate to="/dashboard" /> : <Signin setUser={setUser} />}
        />
        <Route
          path="/join"
          element={user ? <Navigate to="/dashboard" /> : <Join setUser={setUser} />}
        />
        <Route
          path="/dashboard"
          element={
            <Guard user={user}>
              <Dashboard user={user} />
            </Guard>
          }
        />
        <Route
          path="/my-bids"
          element={
            <Guard user={user} role="artisan">
              <RecordList kind="bids" />
            </Guard>
          }
        />
        <Route
          path="/my-jobs"
          element={
            <Guard user={user} role="employer">
              <RecordList kind="jobs" />
            </Guard>
          }
        />
        <Route
          path="/post-job"
          element={
            <Guard user={user} role="employer">
              <PostJob />
            </Guard>
          }
        />
        <Route
          path="/contracts"
          element={
            <Guard user={user}>
              <Contracts user={user} />
            </Guard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
