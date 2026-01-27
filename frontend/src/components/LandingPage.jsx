import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Apple, Smartphone, Eye, Heart, MessageSquare, Star, Calendar, List } from 'lucide-react';
import "./LandingPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const FALLBACK_MOVIES = [
  { id: 1, title: "Avatar", poster_path: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg" },
  { id: 2, title: "Titanic", poster_path: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" },
  { id: 3, title: "Inception", poster_path: "https://image.tmdb.org/t/p/w500/9gk7admal4ZLVD9qsmGMDsbCoyY.jpg" },
  { id: 4, title: "The Dark Knight", poster_path: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: 5, title: "Interstellar", poster_path: "https://image.tmdb.org/t/p/w500/gEU2QniL6C8z19uVOtYnZ09UMHA.jpg" },
  { id: 6, title: "Avengers: Endgame", poster_path: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
];

const LandingPage = ({ onNavigate, user }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroBackdrop, setHeroBackdrop] = useState('');
  const [heroMovie, setHeroMovie] = useState(null);

  const getPosterUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${IMAGE_BASE_URL}${path}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchTrendingMovies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies/trending`);
        if (response.ok) {
          const data = await response.json();
          setTrendingMovies(data);
          
          if (data.length > 0) {
            const randomMovie = data[Math.floor(Math.random() * data.length)];
            setHeroBackdrop(randomMovie.backdrop_path || randomMovie.poster_path);
            setHeroMovie(randomMovie);
          }
        } else {
          console.error('Failed to fetch trending movies');
          setTrendingMovies(FALLBACK_MOVIES);
          const randomMovie = FALLBACK_MOVIES[Math.floor(Math.random() * FALLBACK_MOVIES.length)];
          setHeroBackdrop(randomMovie.poster_path);
          setHeroMovie(randomMovie);
        }
      } catch (error) {
        console.error('Error fetching trending movies:', error);
        setTrendingMovies(FALLBACK_MOVIES);
        const randomMovie = FALLBACK_MOVIES[Math.floor(Math.random() * FALLBACK_MOVIES.length)];
        setHeroBackdrop(randomMovie.poster_path);
        setHeroMovie(randomMovie);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingMovies();
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 300); // 300ms delay before closing
  };

  const handleNavigate = (target) => {
    if (onNavigate) {
      onNavigate(target)
      setShowDropdown(false);
    }
  }

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  }

  const getHeroStyle = () => {
    if (!heroBackdrop) return {};
    
    const imageUrl = heroBackdrop.startsWith('http') 
      ? heroBackdrop 
      : `${BACKDROP_BASE_URL}${heroBackdrop}`;
      
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      transition: 'background-image 0.5s ease-in-out'
    };
  };

  return (
    <div className="landing-container" style={getHeroStyle()}>
      {heroMovie && (
        <div className="backdrop-info">
          <span className="backdrop-title">{heroMovie.title || heroMovie.name}</span>
          {heroMovie.release_date && (
            <span className="backdrop-year"> ({new Date(heroMovie.release_date).getFullYear()})</span>
          )}
        </div>
      )}
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo" onClick={() => handleNavigate(user ? 'home' : 'landing')} style={{cursor: 'pointer'}}>MoviePulse</div>
          <div className="nav-links">
            <button className="nav-link" type="button">
              Films
            </button>
            <button className="nav-link" type="button">
              Lists
            </button>
          </div>
        </div>

        <div className="nav-right">
          {!user ? (
            <div className="auth-buttons">
              <button className="nav-link" type="button" onClick={() => handleNavigate('sign-in')}>
                Sign In
              </button>
              <button className="nav-link" type="button" onClick={() => handleNavigate('create-account')}>
                Create Account
              </button>
            </div>
          ) : (
            <div className="user-section">
               <div 
                 className="user-menu-container" 
                 ref={dropdownRef}
                 onMouseEnter={handleMouseEnter}
                 onMouseLeave={handleMouseLeave}
               >
                <div className="user-trigger">
                  <img 
                    src={user.picture || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                    alt="User" 
                    className="user-avatar" 
                  />
                  <span className="user-name">{user.name || "User"}</span>
                  <span className="dropdown-caret">▼</span>
                </div>
                
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-item" onClick={() => handleNavigate('home')}>Home</div>
                    <div className="dropdown-item" onClick={() => handleNavigate('profile')}>Profile</div>
                    <div className="dropdown-item">Watchlist</div>
                    <div className="dropdown-item">Reviews</div>
                    <div className="dropdown-item">Lists</div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item logout" onClick={handleLogout}>Logout</div>
                  </div>
                )}
              </div>

              <div className="notification-bell">
                <span className="bell-icon">🔔</span>
                <span className="badge">38</span>
              </div>
            </div>
          )}

          <div className="search-box">
            <input type="text" placeholder="Search" />
          </div>
        </div>
      </nav>

      {/* Main Section */}
      <main className="main-layout">
        <section className="hero">
          <div className="hero-content">
            <div className="features-grid">
              <div className="feature-item">
                <h3>Track films you’ve watched.</h3>
              </div>
              <div className="feature-item">
                <h3>Save those you want to see.</h3>
              </div>
              <div className="feature-item">
                <h3>Tell your friends what’s good.</h3>
              </div>
            </div>
            
            <div className="cta-container">
              <button className="cta-primary" onClick={() => handleNavigate('sign-in')}>
                Get started — it's free!
              </button>
            </div>

            <div className="social-proof-text">
              <p>The social network for film lovers.</p>
              <div className="platform-icons">
                <span className="platform-text">Also available on</span>
                <Apple size={20} />
                <Smartphone size={20} />
              </div>
            </div>

            <div className="trending-posters">
              {loading ? (
                <div className="loading-state">Loading trending picks…</div>
              ) : trendingMovies.length ? (
                trendingMovies.map((movie) => (
                  <div 
                    key={movie.id} 
                    className="poster-card"
                    onClick={() => navigate(`/movie/${movie.id}`)}
                    style={movie.poster_path ? { 
                      backgroundImage: `url(${getPosterUrl(movie.poster_path)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : { backgroundColor: movie.color || '#333' }}
                    title={movie.title}
                  >
                    <div className="poster-content">
                      <span className="poster-title">{movie.title}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No trending movies right now.</div>
              )}
            </div>

            <div className="detailed-features-section">
              <h4 className="section-label">MOVIEPULSE LETS YOU...</h4>
              <div className="detailed-features-grid">
                <div className="detailed-feature-card">
                  <div className="card-icon"><Eye size={32} /></div>
                  <div className="card-text">
                    Keep a complete log of every movie you've ever watched (or start fresh from today).
                  </div>
                </div>
                <div className="detailed-feature-card">
                  <div className="card-icon"><Heart size={32} /></div>
                  <div className="card-text">
                    Show appreciation for your favorite films, lists, and community reviews with a "like".
                  </div>
                </div>
                <div className="detailed-feature-card">
                  <div className="card-icon"><MessageSquare size={32} /></div>
                  <div className="card-text">
                    Write detailed reviews and follow your friends to see what they're saying.
                  </div>
                </div>
                <div className="detailed-feature-card">
                  <div className="card-icon"><Star size={32} /></div>
                  <div className="card-text">
                    Rate every film on a five-star scale to record and share your personal reaction.
                  </div>
                </div>
                <div className="detailed-feature-card">
                  <div className="card-icon"><Calendar size={32} /></div>
                  <div className="card-text">
                    Maintain a personal film diary to track what you watch and when you watch it.
                  </div>
                </div>
                <div className="detailed-feature-card">
                  <div className="card-icon"><List size={32} /></div>
                  <div className="card-text">
                    Curate and share custom lists of films for any genre, mood, or occasion.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
