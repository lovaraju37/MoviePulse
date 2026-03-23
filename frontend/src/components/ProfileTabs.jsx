import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ReviewCard from './ReviewCard';
import MoviePoster from './MoviePoster';
import ReviewModal from './ReviewModal';
import { Heart, Clock, Star, Film, Grid, List as ListIcon, User, UserPlus, UserMinus, BarChart2 } from 'lucide-react';
import './ProfileTabs.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// ── Reusable Rating Dropdown ──────────────────────────────────────────────────
// Supports: null = any, 'none' = no rating, [lo, hi] = range (0.5–5 half-star steps)
const RatingDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  // hoverSlot: 0–9 (half-star slots). dragStartSlot set on mousedown for range drag.
  const [hoverSlot, setHoverSlot] = useState(null);
  const [dragStartSlot, setDragStartSlot] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    // Cancel drag if mouse released outside stars
    const upHandler = () => { if (dragStartSlot !== null) setDragStartSlot(null); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('mouseup', upHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('mouseup', upHandler);
    };
  }, [dragStartSlot]);

  // slot 0 = 0.5★, slot 9 = 5★
  const slotToVal = (slot) => (slot + 1) * 0.5;

  const getLabel = () => {
    if (!value) return 'RATING';
    if (value === 'none') return 'RATING · No rating';
    if (Array.isArray(value)) {
      const [lo, hi] = value;
      if (lo === hi) return `RATING · ${lo}★`;
      return `RATING · ${lo}–${hi}★`;
    }
    return 'RATING';
  };

  // Which slots should be lit up?
  // Priority: dragging > hovering (fills 0..hoverSlot) > saved value
  const getSlotHighlight = (slot) => {
    if (dragStartSlot !== null && hoverSlot !== null) {
      // range drag: fill between dragStart and current hover
      const lo = Math.min(dragStartSlot, hoverSlot);
      const hi = Math.max(dragStartSlot, hoverSlot);
      return slot >= lo && slot <= hi;
    }
    if (hoverSlot !== null) {
      // simple hover: fill from 0 up to hoverSlot
      return slot <= hoverSlot;
    }
    if (Array.isArray(value)) {
      const lo = Math.round(value[0] / 0.5) - 1;
      const hi = Math.round(value[1] / 0.5) - 1;
      return slot >= lo && slot <= hi;
    }
    return false;
  };

  const handleHalfEnter = (slot) => setHoverSlot(slot);

  const handleHalfDown = (slot, e) => {
    e.preventDefault();
    setDragStartSlot(slot);
    setHoverSlot(slot);
  };

  const handleHalfUp = (slot) => {
    if (dragStartSlot !== null) {
      // range drag completed
      const lo = Math.min(dragStartSlot, slot);
      const hi = Math.max(dragStartSlot, slot);
      onChange([slotToVal(lo), slotToVal(hi)]);
      setDragStartSlot(null);
    } else {
      // simple click — single value (lo = 0, hi = clicked slot)
      onChange([0.5, slotToVal(slot)]);
    }
    setOpen(false);
  };

  const handleMouseLeaveStars = () => {
    setHoverSlot(null);
    setDragStartSlot(null);
  };

  // For each star, compute fill: 'full', 'half', or 'empty'
  const getStarFill = (starIdx) => {
    const leftOn = getSlotHighlight(starIdx * 2);
    const rightOn = getSlotHighlight(starIdx * 2 + 1);
    if (leftOn && rightOn) return 'full';
    if (leftOn) return 'half';
    return 'empty';
  };

  return (
    <div className="rating-dropdown" ref={ref}>
      <button
        className={`rating-dropdown-btn ${value ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {getLabel()} <span className="rating-dropdown-chevron">▾</span>
      </button>
      {open && (
        <div className="rating-dropdown-menu">
          <div
            className={`rating-dropdown-option ${!value ? 'selected' : ''}`}
            onClick={() => { onChange(null); setOpen(false); }}
          >
            Any rating
          </div>
          <div
            className={`rating-dropdown-option muted ${value === 'none' ? 'selected' : ''}`}
            onClick={() => { onChange('none'); setOpen(false); }}
          >
            No rating
          </div>
          <div className="rating-dropdown-divider" />
          <div className="rating-dropdown-stars-label">RATING (OR RANGE)</div>
          <div
            className="rating-dropdown-stars"
            onMouseLeave={handleMouseLeaveStars}
          >
            {[0,1,2,3,4].map(si => {
              const fill = getStarFill(si);
              return (
                <span key={si} className={`rating-dropdown-star-wrap`}>
                  {/* left half */}
                  <span
                    className={`rating-half left ${getSlotHighlight(si*2) ? 'on' : 'off'}`}
                    onMouseEnter={() => handleHalfEnter(si*2)}
                    onMouseDown={(e) => handleHalfDown(si*2, e)}
                    onMouseUp={() => handleHalfUp(si*2)}
                  />
                  {/* right half */}
                  <span
                    className={`rating-half right ${getSlotHighlight(si*2+1) ? 'on' : 'off'}`}
                    onMouseEnter={() => handleHalfEnter(si*2+1)}
                    onMouseDown={(e) => handleHalfDown(si*2+1, e)}
                    onMouseUp={() => handleHalfUp(si*2+1)}
                  />
                  {/* visual star rendered based on fill */}
                  <span className={`rating-dropdown-star ${fill}`} aria-hidden="true">★</span>
                </span>
              );
            })}
          </div>
          <div className="rating-dropdown-hint">Drag to define range</div>
        </div>
      )}
    </div>
  );
};

const MovieGrid = ({ movies, emptyMessage }) => {
  return (
    <div className="overview-section" style={{ marginBottom: '20px' }}>
      {movies.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
          {movies.map(item => (
            <div key={item.id}>
              <MoviePoster 
                movie={{
                    id: item.movieId || item.id,
                    title: item.movieTitle || item.title,
                    poster_path: item.posterPath || item.poster_path
                }}
                showTitleTooltip={true}
              />
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>{emptyMessage}</p>
      )}
    </div>
  );
};

export const ProfileOverview = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;
  const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));

  const navigate = useNavigate();
  const [favMovies, setFavMovies] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [topActor, setTopActor] = useState(null);
  const [topDirector, setTopDirector] = useState(null);
  const [ratingHistogram, setRatingHistogram] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    const fetchProfileWatched = isOwnProfile
      ? fetch(`${API_BASE_URL}/api/watched`, { headers })
      : fetch(`${API_BASE_URL}/api/watched/user/${user.id}`, { headers });

    Promise.all([
      fetch(`${API_BASE_URL}/api/users/${user.id}/favorites`, { headers }).then(r => r.ok ? r.json() : []),
      fetchProfileWatched.then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([favIds, watchedData, reviewsData]) => {
      // Favorites
      Promise.all(
        favIds.slice(0, 5).map(mid =>
          fetch(`${API_BASE_URL}/api/movies/${mid}`, { headers }).then(r => r.ok ? r.json() : null)
        )
      ).then(favMoviesData => {
        setFavMovies(favMoviesData.filter(Boolean).map(m => ({
          movieId: String(m.id), movieTitle: m.title, posterPath: m.poster_path
        })));
      });

      setRecentMovies(watchedData.slice(0, 5));

      setReviews(reviewsData
        .filter(r => r.content && r.content.trim())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(r => ({ ...r, isLiked: r.isReviewLiked || false, likesCount: r.likesCount || 0 }))
      );

      // Rating histogram — count each 0.5-step rating
      const hist = {};
      reviewsData.forEach(r => {
        if (r.rating != null && r.rating > 0) {
          const key = String(r.rating);
          hist[key] = (hist[key] || 0) + 1;
        }
      });
      setRatingHistogram(hist);

      // Diary
      const seen = new Set();
      const diary = [...watchedData]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 12)
        .map(w => {
          const d = new Date(w.createdAt);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const isFirstOfMonth = !seen.has(key);
          seen.add(key);
          return {
            id: w.id, movieId: w.movieId, movieTitle: w.movieTitle,
            day: d.getDate(),
            month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            year: d.getFullYear(),
            isFirstOfMonth,
          };
        });
      setDiaryEntries(diary);

      // Most viewed actor & director — fetch movie details (includes credits) for up to 20 watched movies
      const sample = watchedData.slice(0, 20);
      Promise.all(
        sample.map(w =>
          fetch(`${API_BASE_URL}/api/movies/${w.movieId}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      ).then(moviesArr => {
        const actorCount = {};
        const actorMeta = {};
        const directorCount = {};
        const directorMeta = {};

        moviesArr.forEach(c => {
          if (!c) return;
          const cast = c.credits?.cast || c.cast || [];
          const crew = c.credits?.crew || c.crew || [];
          cast.slice(0, 5).forEach(p => {
            actorCount[p.id] = (actorCount[p.id] || 0) + 1;
            actorMeta[p.id] = { id: p.id, name: p.name, profile_path: p.profile_path };
          });
          crew.filter(p => p.job === 'Director').forEach(p => {
            directorCount[p.id] = (directorCount[p.id] || 0) + 1;
            directorMeta[p.id] = { id: p.id, name: p.name, profile_path: p.profile_path };
          });
        });

        const topActorId = Object.keys(actorCount).sort((a, b) => actorCount[b] - actorCount[a])[0];
        const topDirectorId = Object.keys(directorCount).sort((a, b) => directorCount[b] - directorCount[a])[0];
        if (topActorId) setTopActor({ ...actorMeta[topActorId], count: actorCount[topActorId] });
        if (topDirectorId) setTopDirector({ ...directorMeta[topDirectorId], count: directorCount[topDirectorId] });
      });

      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [user, authUser, profileUser]);

  if (!user) return null;
  if (loading) return <div className="tab-content">Loading...</div>;

  return (
    <div className="tab-content overview-layout">
      {/* Left: main content */}
      <div className="overview-main">
        <div style={{ marginBottom: '24px' }}>
          <div className="profile-content-title">FAVORITE FILMS</div>
          <MovieGrid movies={favMovies} emptyMessage="No favorite movies yet." />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div className="profile-content-title">RECENT ACTIVITY</div>
          <MovieGrid movies={recentMovies} emptyMessage="No recent activity." />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div className="profile-content-title" style={{ marginBottom: 0 }}>RECENT REVIEWS</div>
            <button
              onClick={() => navigate(isOwnProfile ? '/profile/reviews' : `/user/${user.id}/reviews`)}
              style={{ background: 'transparent', border: 'none', color: '#00e054', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              More
            </button>
          </div>
          {reviews.length > 0 ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Recent</div>
                <div className="reviews-list">
                  {reviews.slice(0, 2).map(review => (
                    <ReviewCard key={review.id} review={review} reviewAuthor={user} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Popular</div>
                <div className="reviews-list">
                  {[...reviews].sort((a, b) => b.likesCount - a.likesCount).slice(0, 2).map(review => (
                    <ReviewCard key={`pop-${review.id}`} review={review} reviewAuthor={user} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No reviews yet.</p>
          )}
        </div>
      </div>

      {/* Right sidebar: actor + director + diary */}
      <div className="overview-sidebar-col">

        {/* Most viewed actor */}
        {topActor && (
          <div className="overview-person-widget" onClick={() => navigate(`/person/${topActor.id}`)}>
            <div className="overview-person-label">MOST WATCHED ACTOR</div>
            <div className="overview-person-row">
              <img
                src={topActor.profile_path
                  ? `https://image.tmdb.org/t/p/w92${topActor.profile_path}`
                  : 'https://via.placeholder.com/46x46?text=?'}
                alt={topActor.name}
                className="overview-person-avatar"
              />
              <div>
                <div className="overview-person-name">{topActor.name}</div>
                <div className="overview-person-count">{topActor.count} film{topActor.count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        )}

        {/* Most viewed director */}
        {topDirector && (
          <div className="overview-person-widget" onClick={() => navigate(`/person/${topDirector.id}`, { state: { department: 'Directing' } })}>
            <div className="overview-person-label">MOST WATCHED DIRECTOR</div>
            <div className="overview-person-row">
              <img
                src={topDirector.profile_path
                  ? `https://image.tmdb.org/t/p/w92${topDirector.profile_path}`
                  : 'https://via.placeholder.com/46x46?text=?'}
                alt={topDirector.name}
                className="overview-person-avatar"
              />
              <div>
                <div className="overview-person-name">{topDirector.name}</div>
                <div className="overview-person-count">{topDirector.count} film{topDirector.count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        )}

        {/* Diary */}
        <div className="overview-diary-sidebar">
          <div className="diary-sidebar-header" onClick={() => navigate(isOwnProfile ? '/profile/diary' : `/user/${user.id}/diary`)} style={{ cursor: 'pointer' }}>
            <span className="diary-sidebar-title">DIARY</span>
            <span className="diary-sidebar-more">{diaryEntries.length}</span>
          </div>
          {diaryEntries.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '0.85rem', padding: '8px 0' }}>No entries yet.</p>
          ) : (
            <div className="diary-sidebar-list">
              {diaryEntries.map(entry => (
                <div key={entry.id} className="diary-sidebar-row">
                  <div className="diary-sidebar-month-col">
                    {entry.isFirstOfMonth && <span className="diary-sidebar-month">{entry.month}</span>}
                  </div>
                  <span className="diary-sidebar-day">{entry.day}</span>
                  <span className="diary-sidebar-film" onClick={() => navigate(`/movie/${entry.movieId}`)}>
                    {entry.movieTitle}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ratings histogram */}
        {Object.keys(ratingHistogram).length > 0 && (() => {
          const steps = [0.5,1,1.5,2,2.5,3,3.5,4,4.5,5];
          const counts = steps.map(s => ratingHistogram[String(s)] || 0);
          const maxCount = Math.max(...counts, 1);
          const totalRatings = counts.reduce((a, b) => a + b, 0);
          return (
            <div className="ratings-histogram-box">
              <div className="ratings-histogram-header">
                <span
                  className="ratings-histogram-title"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(isOwnProfile ? '/profile/films' : `/user/${user.id}/films`)}
                >RATINGS</span>
                <span className="ratings-histogram-total">{totalRatings}</span>
              </div>
              <div className="ratings-histogram-bars">
                {steps.map((step, i) => (
                  <div key={step} className="ratings-histogram-bar-col" title={`${step}★: ${counts[i]}`}
                    onClick={() => navigate(`${isOwnProfile ? '/profile/films' : `/user/${user.id}/films`}?rating=${step}`)}
                    style={{ cursor: counts[i] > 0 ? 'pointer' : 'default' }}
                  >
                    <div
                      className="ratings-histogram-bar"
                      style={{ height: `${Math.max(2, (counts[i] / maxCount) * 52)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="ratings-histogram-labels">
                <span className="ratings-histogram-star green">★</span>
                <span className="ratings-histogram-star green">★★★★★</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export const ProfileActivity = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        // Sort by created date desc
        const sorted = data
            .filter(r => r.content && r.content.trim())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(review => ({
                ...review,
                isLiked: review.isReviewLiked || false,
                likesCount: review.likesCount || 0
            }));
        setReviews(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch reviews", err);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) return <div className="tab-content">Loading activity...</div>;

  return (
    <div className="tab-content">
      <div className="profile-content-title">Activity Feed</div>
      {reviews.length > 0 ? (
        <div className="reviews-list">
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} reviewAuthor={user} />
          ))}
        </div>
      ) : (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>No recent activity to show.</p>
      )}
    </div>
  );
};

export const ProfileFilms = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;
  const navigate = useNavigate();

  const [watchedMovies, setWatchedMovies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null); // null=all, 'none'=unrated, [lo,hi]=range
  const [sortBy, setSortBy] = useState('added');

  // Read ?rating= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('rating');
    if (r) setRatingFilter([parseFloat(r), parseFloat(r)]);
  }, []);

  useEffect(() => {
    if (!user) return;
    const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
    const endpoint = isOwnProfile ? `${API_BASE_URL}/api/watched` : `${API_BASE_URL}/api/watched/user/${user.id}`;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    Promise.all([
      fetch(endpoint, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([watchedData, reviewsData]) => {
      setWatchedMovies(watchedData);
      setReviews(reviewsData);
      setLoading(false);
    }).catch(err => { setError(err.message); setLoading(false); });
  }, [user, authUser, profileUser]);

  if (loading) return <div className="tab-content"><div className="profile-content-title">Loading films...</div></div>;
  if (error) return <div className="tab-content"><p>Error: {error}</p></div>;

  // Build rating map: movieId -> user's personal rating
  const ratingMap = {};
  reviews.forEach(r => { if (r.rating) ratingMap[String(r.movieId)] = r.rating; });

  // Filter by user's personal rating
  let filtered = watchedMovies.filter(item => {
    const userRating = ratingMap[String(item.movieId)] || null;
    if (ratingFilter === null) return true;
    if (ratingFilter === 'none') return !userRating;
    if (Array.isArray(ratingFilter)) {
      const [lo, hi] = ratingFilter;
      return userRating !== null && userRating >= lo && userRating <= hi;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return (b.voteAverage || 0) - (a.voteAverage || 0);
    if (sortBy === 'myrating') return (ratingMap[String(b.movieId)] || 0) - (ratingMap[String(a.movieId)] || 0);
    if (sortBy === 'name') return (a.movieTitle || '').localeCompare(b.movieTitle || '');
    if (sortBy === 'year') return (b.releaseDate || '').localeCompare(a.releaseDate || '');
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;
    return (
      <span className="films-star-rating">
        {'★'.repeat(full)}{half ? '½' : ''}
      </span>
    );
  };

  return (
    <div className="tab-content">
      <div className="films-tab-header">
        <div className="profile-content-title" style={{ marginBottom: 0 }}>
          WATCHED — {filtered.length} FILMS
        </div>
        <div className="films-tab-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <RatingDropdown value={ratingFilter} onChange={setRatingFilter} mode="user" />
          <select className="films-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="added">Sort by DATE ADDED</option>
            <option value="rating">Sort by TITLE RATING</option>
            <option value="myrating">Sort by YOUR RATING</option>
            <option value="name">Sort by NAME</option>
            <option value="year">Sort by YEAR</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#64748b', marginTop: '20px' }}>No films found.</p>
      ) : (
        <div className="films-grid">
          {filtered.map(item => (
            <div key={item.id} className="films-grid-item">
              <MoviePoster
                movie={{ id: item.movieId, title: item.movieTitle, poster_path: item.posterPath, vote_average: item.voteAverage, release_date: item.releaseDate }}
                showTitleTooltip={true}
              />
              {ratingMap[String(item.movieId)] && (
                <div className="films-item-rating">{renderStars(ratingMap[String(item.movieId)])}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProfileDiary = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [reviewModal, setReviewModal] = useState(null); // { movie, initialData }

  useEffect(() => {
    if (!user) return;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
    const watchedEndpoint = isOwnProfile ? `${API_BASE_URL}/api/watched` : `${API_BASE_URL}/api/watched/user/${user.id}`;

    Promise.all([
      fetch(watchedEndpoint, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/likes/user/${user.id}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([watched, reviews, likes]) => {
      const reviewMap = {};
      reviews.forEach(r => { reviewMap[String(r.movieId)] = r; });
      const likeSet = new Set(likes.map(l => String(l.movieId)));

      const merged = watched.map(w => {
        const rev = reviewMap[String(w.movieId)];
        return {
          id: w.id,
          movieId: w.movieId,
          movieTitle: w.movieTitle,
          posterPath: w.posterPath,
          releaseDate: w.releaseDate,
          watchedAt: w.createdAt,
          rating: rev?.rating || 0,
          isLiked: likeSet.has(String(w.movieId)),
          isRewatch: rev?.rewatch || false,
          hasReview: !!(rev?.content && rev.content.trim()),
          reviewId: rev?.id,
          reviewContent: rev?.content || '',
          containsSpoiler: rev?.containsSpoiler || false,
          watchedDate: rev?.watchedDate || w.createdAt,
        };
      });

      // Sort by watchedAt desc
      merged.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
      setEntries(merged);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, authUser, profileUser]);

  // Sync like state when toggled from MoviePoster anywhere on the page
  useEffect(() => {
    const handler = (e) => {
      const { movieId, isLiked } = e.detail;
      setEntries(prev => prev.map(entry =>
        String(entry.movieId) === String(movieId) ? { ...entry, isLiked } : entry
      ));
    };
    window.addEventListener('movieLikeChanged', handler);
    return () => window.removeEventListener('movieLikeChanged', handler);
  }, []);

  if (loading) return <div className="tab-content">Loading diary...</div>;
  if (!entries.length) return (
    <div className="tab-content">
      <p style={{ color: '#64748b' }}>No diary entries yet.</p>
    </div>
  );

  const handleLikeToggle = async (entry) => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
    const isLiked = entry.isLiked;
    try {
      if (isLiked) {
        await fetch(`${API_BASE_URL}/api/likes/${entry.movieId}`, { method: 'DELETE', headers });
      } else {
        await fetch(`${API_BASE_URL}/api/likes`, { method: 'POST', headers, body: JSON.stringify({ movieId: entry.movieId, movieTitle: entry.movieTitle, posterPath: entry.posterPath }) });
      }
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isLiked: !isLiked } : e));
    } catch (err) { console.error(err); }
  };

  const handleReviewSave = (savedReview) => {
    setEntries(prev => prev.map(e =>
      String(e.movieId) === String(savedReview.movieId)
        ? { ...e, rating: savedReview.rating || e.rating, hasReview: true, reviewId: savedReview.id, isRewatch: savedReview.rewatch || e.isRewatch }
        : e
    ));
    setReviewModal(null);
  };

  // Apply rating filter
  const filteredEntries = entries.filter(e => {
    if (ratingFilter === null) return true;
    if (ratingFilter === 'none') return !e.rating;
    if (Array.isArray(ratingFilter)) {
      const [lo, hi] = ratingFilter;
      return e.rating >= lo && e.rating <= hi;
    }
    return true;
  });

  // Group by month
  const groups = {};
  filteredEntries.forEach(e => {
    const d = new Date(e.watchedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups[key]) groups[key] = { label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(), entries: [] };
    groups[key].entries.push(e);
  });

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;
    return (
      <span className="diary-stars">
        {[...Array(full)].map((_, i) => <Star key={i} size={13} fill="#00e054" color="#00e054" strokeWidth={0} />)}
        {half && <span style={{ color: '#00e054', fontSize: '12px', lineHeight: 1 }}>½</span>}
      </span>
    );
  };

  return (
    <>
    <div className="tab-content diary-tab">
      {/* Diary filter bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <RatingDropdown value={ratingFilter} onChange={setRatingFilter} mode="user" />
      </div>
      {/* Column headers */}
      <div className="diary-header-row">
        <span className="diary-col-month">Month</span>
        <span className="diary-col-day">Day</span>
        <span className="diary-col-film">Film</span>
        <span className="diary-col-released">Released</span>
        <span className="diary-col-rating">Rating</span>
        <span className="diary-col-like">Like</span>
        <span className="diary-col-rewatch">Rewatch</span>
        <span className="diary-col-review">Review</span>
        <span className="diary-col-edit">Edit</span>
      </div>

      {Object.values(groups).map((group, gi) => (
        <div key={gi} className="diary-group">
          {group.entries.map((entry, i) => {
            const d = new Date(entry.watchedAt);
            const day = d.getDate();
            const monthLabel = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const year = d.getFullYear();
            const showMonth = i === 0;

            return (
              <div key={entry.id} className="diary-row">
                <div className="diary-col-month">
                  {showMonth && (
                    <div className="diary-month-badge">
                      <span className="diary-month-name">{monthLabel}</span>
                      <span className="diary-month-year">{year}</span>
                    </div>
                  )}
                </div>
                <div className="diary-col-day">
                  <span className="diary-day-num">{day}</span>
                </div>
                <div className="diary-col-film" onClick={() => navigate(`/movie/${entry.movieId}`)} style={{ cursor: 'pointer' }}>
                  <img
                    src={entry.posterPath ? `${IMAGE_BASE_URL}${entry.posterPath}` : 'https://via.placeholder.com/40x60?text=?'}
                    alt={entry.movieTitle}
                    className="diary-poster"
                  />
                  <span className="diary-title">{entry.movieTitle}</span>
                </div>
                <div className="diary-col-released">
                  <span className="diary-year">{entry.releaseDate?.substring(0, 4)}</span>
                </div>
                <div className="diary-col-rating">{renderStars(entry.rating)}</div>
                <div className="diary-col-like">
                  <Heart
                    size={15}
                    fill={entry.isLiked ? '#ff5c5c' : 'none'}
                    color={entry.isLiked ? '#ff5c5c' : '#475569'}
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleLikeToggle(entry)}
                  />
                </div>
                <div className="diary-col-rewatch">
                  {entry.isRewatch && <span className="diary-rewatch-dot" title="Rewatch">↺</span>}
                </div>
                <div className="diary-col-review">
                  {entry.hasReview && (
                    <span
                      className="diary-review-icon"
                      title="View review"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/movie/${entry.movieId}/activity?userId=${user.id}&tab=REVIEWS`)}
                    >≡</span>
                  )}
                </div>
                <div className="diary-col-edit">
                  <button
                    className="diary-edit-btn"
                    title="Write / edit review"
                    onClick={() => setReviewModal({
                      movie: { id: entry.movieId, title: entry.movieTitle, poster_path: entry.posterPath },
                      initialData: {
                        rating: entry.rating,
                        isRewatch: entry.isRewatch,
                        rewatch: entry.isRewatch,
                        isWatched: true,
                        isLiked: entry.isLiked,
                        review: entry.reviewContent,
                        containsSpoiler: entry.containsSpoiler,
                        watchedDate: entry.watchedDate ? entry.watchedDate.substring(0, 10) : undefined,
                      }
                    })}
                  >✎</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
    {reviewModal && (
      <ReviewModal
        movie={reviewModal.movie}
        onClose={() => setReviewModal(null)}
        onSave={handleReviewSave}
        initialData={reviewModal.initialData}
      />
    )}
    </>
  );
};

export const ProfileReviews = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      const fetchReviews = fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, { headers });
      
      const fetchMyLikes = (!isOwnProfile && authUser)
          ? fetch(`${API_BASE_URL}/api/likes`, { headers })
          : isOwnProfile 
            ? fetch(`${API_BASE_URL}/api/likes`, { headers })
            : Promise.resolve(null);

      Promise.all([
        fetchReviews.then(res => res.ok ? res.json() : []),
        fetchMyLikes.then(res => res ? (res.ok ? res.json() : []) : [])
      ]).then(([reviewsData]) => {
        
        // Sort reviews by date descending and add isLiked status
        const sortedReviews = reviewsData
          .filter(r => r.content && r.content.trim())
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(review => ({
            ...review,
            isLiked: review.isReviewLiked || false,
            likesCount: review.likesCount || 0
          }));
          
        setReviews(sortedReviews);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user, authUser, profileUser]);

  if (!user) return null;
  if (loading) return <div className="tab-content">Loading...</div>;

  if (reviews.length === 0) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">You have written 0 reviews</div>
        <p>Reviews you have written will appear here.</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="profile-content-title">You have written {reviews.length} reviews</div>
      <div className="reviews-list">
        {reviews.map(review => (
          <ReviewCard key={review.id} review={review} reviewAuthor={user} />
        ))}
      </div>
    </div>
  );
};

export const ProfileWatchlist = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;

  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surprise, setSurprise] = useState(null);

  useEffect(() => {
    if (user) {
      const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
      const endpoint = isOwnProfile ? `${API_BASE_URL}/api/watchlist` : `${API_BASE_URL}/api/watchlist/user/${user.id}`;
      fetch(endpoint, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(async res => {
          if (!res.ok) throw new Error(`Failed to fetch watchlist: ${res.status}`);
          return res.json();
        })
        .then(data => { setWatchlist(data); setLoading(false); })
        .catch(err => { console.error(err); setError(err.message); setLoading(false); });
    }
  }, [user, authUser, profileUser]);

  const handleSurprise = () => {
    if (!watchlist.length) return;
    const pick = watchlist[Math.floor(Math.random() * watchlist.length)];
    setSurprise(pick);
  };

  if (loading) return <div className="tab-content"><div className="profile-content-title">Loading watchlist...</div></div>;
  if (error) return <div className="tab-content"><p>Error: {error}</p></div>;
  if (!watchlist.length) return <div className="tab-content"><div className="profile-content-title">You want to see 0 films</div><p>Your watchlist is empty.</p></div>;

  return (
    <div className="tab-content">
      <div className="watchlist-header">
        <div className="profile-content-title" style={{ marginBottom: 0 }}>
          YOU WANT TO SEE {watchlist.length} FILMS
        </div>
        <button className="watchlist-surprise-btn" onClick={handleSurprise} title="Surprise me">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="3" ry="3"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          Surprise Me
        </button>
      </div>

      {/* Surprise result */}
      {surprise && (
        <div className="watchlist-surprise-result" onClick={() => navigate(`/movie/${surprise.movieId}`)}>
          <img
            src={surprise.posterPath
              ? `https://image.tmdb.org/t/p/w92${surprise.posterPath}`
              : 'https://via.placeholder.com/46x69?text=?'}
            alt={surprise.movieTitle}
            className="watchlist-surprise-poster"
          />
          <div>
            <div className="watchlist-surprise-title">{surprise.movieTitle}</div>
            <div className="watchlist-surprise-sub">{surprise.releaseDate?.substring(0, 4)}</div>
          </div>
          <button className="watchlist-surprise-close" onClick={e => { e.stopPropagation(); setSurprise(null); }}>×</button>
        </div>
      )}

      <div className="watchlist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {watchlist.map(item => (
          <div key={item.id} className="watchlist-item">
            <MoviePoster
              movie={{ id: item.movieId, title: item.movieTitle, poster_path: item.posterPath, vote_average: item.voteAverage, release_date: item.releaseDate }}
              showTitleTooltip={true}
            />
            <div className="watchlist-item-info" onClick={() => navigate(`/movie/${item.movieId}`)} style={{ cursor: 'pointer' }}>
              <h4 style={{ fontSize: '0.9rem', marginTop: '8px', marginBottom: '4px' }}>{item.movieTitle}</h4>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>
                <span>★ {item.voteAverage}</span>
                <span style={{ marginLeft: '10px' }}>{item.releaseDate?.substring(0, 4)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProfileLists = () => {
  const { user: authUser, token } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;
  const navigate = useNavigate();

  const [lists, setLists] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tags: '', visibility: 'public', ranked: false });
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState([]);
  const [filmSearch, setFilmSearch] = useState('');
  const [filmResults, setFilmResults] = useState([]);
  const [selectedFilms, setSelectedFilms] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const isOwn = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE_URL}/api/lists/user/${user.id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }).then(r => r.ok ? r.json() : []).then(setLists).catch(() => {});
  }, [user, token]);

  const openModal = () => {
    if (!authUser) { navigate('/signin'); return; }
    setForm({ name: '', description: '', tags: '', visibility: 'public', ranked: false });
    setTagList([]); setTagInput(''); setSelectedFilms([]); setFilmSearch(''); setFilmResults([]);
    setShowModal(true);
  };

  const handleTagKey = (e) => {
    if ((e.key === 'Tab' || e.key === 'Enter') && tagInput.trim()) {
      e.preventDefault();
      if (!tagList.includes(tagInput.trim())) setTagList(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleFilmSearch = (val) => {
    setFilmSearch(val);
    clearTimeout(searchTimeout);
    if (!val.trim()) { setFilmResults([]); return; }
    setSearchTimeout(setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(val)}`);
        const data = await r.json();
        setFilmResults((data.results || data).slice(0, 6));
      } catch {}
    }, 350));
  };

  const addFilm = (film) => {
    if (!selectedFilms.find(f => String(f.id) === String(film.id))) {
      setSelectedFilms(prev => [...prev, film]);
    }
    setFilmSearch(''); setFilmResults([]);
  };

  const removeFilm = (id) => setSelectedFilms(prev => prev.filter(f => String(f.id) !== String(id)));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      description: form.description,
      tags: tagList.join(','),
      visibility: form.visibility,
      ranked: form.ranked,
      movieIds: selectedFilms.map(f => String(f.id)),
    };
    try {
      const r = await fetch(`${API_BASE_URL}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const created = await r.json();
        setLists(prev => [created, ...prev]);
        setShowModal(false);
      }
    } catch {}
  };

  return (
    <div className="tab-content">
      {/* Hero banner */}
      <div className="lists-hero">
        <p className="lists-hero-text">Collect, curate, and share. Lists are the perfect way to group films.</p>
        {isOwn && (
          <button className="lists-start-btn" onClick={openModal}>Start your own list</button>
        )}
      </div>

      {lists.length > 0 && (
        <>
          <div className="lists-section-label">
            {isOwn ? 'YOUR LISTS' : 'LISTS'}
          </div>
          <div className="lists-grid">
            {lists.map(list => (
              <div key={list.id} className="list-card">
                <div className="list-card-title">{list.name}</div>
                <div className="list-card-meta">{list.filmCount} film{list.filmCount !== 1 ? 's' : ''}</div>
                {list.description && <div className="list-card-desc">{list.description}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {lists.length === 0 && !isOwn && (
        <p className="lists-empty">No lists yet.</p>
      )}

      {/* New List Modal */}
      {showModal && (
        <div className="nl-overlay" onClick={() => setShowModal(false)}>
          <div className="nl-modal" onClick={e => e.stopPropagation()}>
            <h2 className="nl-title">New List</h2>
            <div className="nl-body">
              {/* Left column */}
              <div className="nl-left">
                <div className="nl-field">
                  <label className="nl-label"><span className="nl-required">●</span> Name</label>
                  <input className="nl-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="nl-field">
                  <label className="nl-label">Tags <span className="nl-hint">Press Tab to complete, Enter to create</span></label>
                  <div className="nl-tags-wrap">
                    {tagList.map(t => (
                      <span key={t} className="nl-tag">{t} <button onClick={() => setTagList(p => p.filter(x => x !== t))}>×</button></span>
                    ))}
                    <input
                      className="nl-tag-input"
                      placeholder="eg. top 10"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKey}
                    />
                  </div>
                </div>
                <div className="nl-field">
                  <label className="nl-label">Who can view</label>
                  <select className="nl-select" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                    <option value="public">Anyone — Public list</option>
                    <option value="private">Only me — Private list</option>
                  </select>
                </div>
                <div className="nl-field nl-ranked-row">
                  <input type="checkbox" id="nl-ranked" checked={form.ranked} onChange={e => setForm(f => ({ ...f, ranked: e.target.checked }))} />
                  <label htmlFor="nl-ranked" className="nl-ranked-label">Ranked list</label>
                  <span className="nl-hint">Show position for each film.</span>
                </div>
              </div>
              {/* Right column */}
              <div className="nl-right">
                <div className="nl-field">
                  <label className="nl-label">Description</label>
                  <textarea className="nl-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Film add bar */}
            <div className="nl-film-bar">
              <button className="nl-add-film-btn">ADD A FILM</button>
              <div className="nl-film-search-wrap">
                <input
                  className="nl-film-input"
                  placeholder="Enter name of film..."
                  value={filmSearch}
                  onChange={e => handleFilmSearch(e.target.value)}
                />
                {filmResults.length > 0 && (
                  <div className="nl-film-dropdown">
                    {filmResults.map(f => (
                      <div key={f.id} className="nl-film-option" onClick={() => addFilm(f)}>
                        {f.poster_path && <img src={`https://image.tmdb.org/t/p/w45${f.poster_path}`} alt="" />}
                        <span>{f.title} {f.release_date ? `(${f.release_date.slice(0,4)})` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="nl-actions">
                <button className="nl-cancel-btn" onClick={() => setShowModal(false)}>CANCEL</button>
                <button className="nl-save-btn" onClick={handleSave}>SAVE</button>
              </div>
            </div>

            {/* Selected films */}
            {selectedFilms.length === 0 ? (
              <div className="nl-empty-films">
                <p><strong>Your list is empty.</strong></p>
                <p>Add films using the field above, or from the links on a film poster or page.</p>
              </div>
            ) : (
              <div className="nl-selected-films">
                {selectedFilms.map((f, i) => (
                  <div key={f.id} className="nl-selected-film">
                    {form.ranked && <span className="nl-rank">{i + 1}</span>}
                    {f.poster_path && <img src={`https://image.tmdb.org/t/p/w45${f.poster_path}`} alt="" />}
                    <span>{f.title}</span>
                    <button className="nl-remove-film" onClick={() => removeFilm(f.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfileLikes = () => {
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;

  const [likes, setLikes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null);

  useEffect(() => {
    if (!user) return;
    const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
    const endpoint = isOwnProfile ? `${API_BASE_URL}/api/likes` : `${API_BASE_URL}/api/likes/user/${user.id}`;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    Promise.all([
      fetch(endpoint, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(async ([likesData, reviewsData]) => {
      // Backfill missing titles from TMDB
      const enriched = await Promise.all(likesData.map(async item => {
        if (item.movieTitle) return item;
        try {
          const res = await fetch(`${API_BASE_URL}/api/movies/${item.movieId}`);
          if (res.ok) {
            const m = await res.json();
            return { ...item, movieTitle: m.title, posterPath: item.posterPath || m.poster_path };
          }
        } catch (_) {}
        return item;
      }));
      setLikes(enriched);
      setReviews(reviewsData);
      setLoading(false);
    }).catch(err => { setError(err.message); setLoading(false); });
  }, [user, authUser, profileUser]);

  if (loading) return <div className="tab-content"><div className="profile-content-title">Loading likes...</div></div>;
  if (error) return <div className="tab-content"><p>Error: {error}</p></div>;
  if (!likes.length) return <div className="tab-content"><div className="profile-content-title">You have liked 0 films</div><p>Films you have liked will appear here.</p></div>;

  const ratingMap = {};
  reviews.forEach(r => { if (r.rating) ratingMap[String(r.movieId)] = r.rating; });

  const filtered = likes.filter(item => {
    const userRating = ratingMap[String(item.movieId)] || null;
    if (ratingFilter === null) return true;
    if (ratingFilter === 'none') return !userRating;
    if (Array.isArray(ratingFilter)) {
      const [lo, hi] = ratingFilter;
      return userRating !== null && userRating >= lo && userRating <= hi;
    }
    return true;
  });

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;
    return <span className="films-star-rating">{'★'.repeat(full)}{half ? '½' : ''}</span>;
  };

  return (
    <div className="tab-content">
      <div className="films-tab-header">
        <div className="profile-content-title" style={{ marginBottom: 0 }}>YOU HAVE LIKED {filtered.length} FILMS</div>
        <RatingDropdown value={ratingFilter} onChange={setRatingFilter} mode="user" />
      </div>
      <div className="films-grid">
        {filtered.map(item => (
          <div key={item.id} className="films-grid-item">
            <MoviePoster
              movie={{ id: item.movieId, title: item.movieTitle || item.title, movieTitle: item.movieTitle || item.title, poster_path: item.posterPath, vote_average: item.voteAverage, release_date: item.releaseDate }}
              showTitleTooltip={true}
            />
            {ratingMap[String(item.movieId)] && (
              <div className="films-item-rating">{renderStars(ratingMap[String(item.movieId)])}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
