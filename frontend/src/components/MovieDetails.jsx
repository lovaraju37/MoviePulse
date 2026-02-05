import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from './Navbar';
import './MovieDetails.css';
import ReviewModal from './ReviewModal';
import { useAuth } from '../context/AuthContext';
import { Eye, Heart, Clock, Star, Share2, X, Plus, Minus } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const releaseTypeMap = {
  1: 'PREMIERE',
  3: 'THEATRICAL',
  4: 'DIGITAL'
};

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CAST');
  const [releaseSort, setReleaseSort] = useState('DATE');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState(() => {
    try {
      const saved = localStorage.getItem('preferredCountries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isWatchlistHovered, setIsWatchlistHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeHovered, setIsLikeHovered] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isWatchedHovered, setIsWatchedHovered] = useState(false);
  const [friendActivity, setFriendActivity] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showLogOptions, setShowLogOptions] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

  useEffect(() => {
    localStorage.setItem('preferredCountries', JSON.stringify(selectedCountries));
  }, [selectedCountries]);

  useEffect(() => {
      if (user && movie) {
          // Check watchlist status
          fetch(`${API_BASE_URL}/api/watchlist/${movie.id}/check`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          })
          .then(res => res.json())
          .then(data => setInWatchlist(data.inWatchlist))
          .catch(err => console.error(err));

          // Check like status
          fetch(`${API_BASE_URL}/api/likes/${movie.id}/check`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          })
          .then(res => res.json())
          .then(data => setIsLiked(data.isLiked))
          .catch(err => console.error(err));

          // Check watched status
          fetch(`${API_BASE_URL}/api/watched/${movie.id}/check`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          })
          .then(res => res.json())
          .then(data => setIsWatched(data.isWatched))
          .catch(err => console.error(err));

          // Check review status
          fetch(`${API_BASE_URL}/api/reviews/movie/${movie.id}/check`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          })
          .then(res => res.json())
          .then(data => {
              if (data.hasReview) {
                  setUserRating(data.rating);
                  setUserReview(data.review);
              } else {
                  setUserRating(0);
                  setUserReview(null);
              }
          })
          .catch(err => console.error(err));

          // Check friend activity
          fetch(`${API_BASE_URL}/api/movies/${movie.id}/friend-activity`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          })
          .then(async res => {
              if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data)) {
                      setFriendActivity(data);
                  } else {
                      setFriendActivity([]);
                  }
              } else {
                  setFriendActivity([]);
              }
          })
          .catch(err => {
              console.error('Error fetching friend activity:', err);
              setFriendActivity([]);
          });
      }
  }, [user, movie]);

  const toggleWatched = () => {
    if (!user) {
        navigate('/signin');
        return;
    }

    if (isWatched) {
        fetch(`${API_BASE_URL}/api/watched/${movie.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(() => setIsWatched(false))
        .catch(err => console.error(err));
    } else {
        fetch(`${API_BASE_URL}/api/watched`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                movieId: movie.id,
                title: movie.title,
                posterPath: movie.poster_path,
                voteAverage: movie.vote_average,
                releaseDate: movie.release_date
            })
        })
        .then(res => res.json())
        .then(() => {
            setIsWatched(true);
            setInWatchlist(false);
        })
        .catch(err => console.error(err));
    }
  };

  const toggleLike = () => {
    if (!user) {
        navigate('/signin');
        return;
    }

    if (isLiked) {
        fetch(`${API_BASE_URL}/api/likes/${movie.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(() => setIsLiked(false))
        .catch(err => console.error(err));
    } else {
        fetch(`${API_BASE_URL}/api/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                movieId: movie.id,
                title: movie.title,
                posterPath: movie.poster_path,
                voteAverage: movie.vote_average,
                releaseDate: movie.release_date
            })
        })
        .then(res => res.json())
        .then(() => setIsLiked(true))
        .catch(err => console.error(err));
    }
  };

  const toggleWatchlist = () => {
      if (!user) {
          navigate('/signin');
          return;
      }

      if (inWatchlist) {
          fetch(`${API_BASE_URL}/api/watchlist/${movie.id}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          })
          .then(res => res.json())
          .then(() => setInWatchlist(false))
          .catch(err => console.error(err));
      } else {
          fetch(`${API_BASE_URL}/api/watchlist`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                  movieId: movie.id,
                  title: movie.title,
                  posterPath: movie.poster_path,
                  voteAverage: movie.vote_average,
                  releaseDate: movie.release_date
              })
          })
          .then(res => res.json())
          .then(() => setInWatchlist(true))
          .catch(err => console.error(err));
      }
  };

  const handleSaveReview = (reviewData) => {
    // Send to backend
    fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            ...reviewData,
            movieTitle: movie.title,
            moviePosterUrl: movie.poster_path,
            movieYear: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log('Review saved successfully:', data);
    })
    .catch(err => console.error('Error saving review:', err));

    // Handle Watched Status - Persist to backend and update local state
    if (reviewData.isWatched) {
        if (!isWatched) {
            setIsWatched(true);
            setInWatchlist(false); // Remove from watchlist if watched
            
            // Persist to backend
            fetch(`${API_BASE_URL}/api/watched`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    movieId: movie.id,
                    title: movie.title,
                    posterPath: movie.poster_path,
                    voteAverage: movie.vote_average,
                    releaseDate: movie.release_date
                })
            }).catch(e => console.error("Failed to persist watched status", e));
        }
    } else {
        // User explicitly unchecked "Watched"
        if (isWatched) {
            setIsWatched(false);
            // Persist removal
            fetch(`${API_BASE_URL}/api/watched/${movie.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }).catch(e => console.error("Failed to remove watched status", e));
        }
    }

    if (reviewData.isLiked !== isLiked) {
        setIsLiked(reviewData.isLiked);
    }
    if (reviewData.rating !== undefined) {
        setUserRating(parseFloat(reviewData.rating));
    }
    
    // Optimistic update for userReview
    setUserReview({
        ...reviewData,
        createdAt: new Date().toISOString(),
        id: 'temp-' + Date.now() 
    });

    // Re-fetch review status to ensure data consistency
    fetch(`${API_BASE_URL}/api/reviews/movie/${movie.id}/check`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.hasReview) {
            setUserRating(data.rating);
            setUserReview(data.review);
        }
    });

    setIsReviewModalOpen(false);
  };

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMovie(data);
        } else {
          const apiKey = import.meta.env.VITE_TMDB_API_KEY;
          if (apiKey) {
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&append_to_response=credits,release_dates`);
            if (tmdbRes.ok) {
              const data = await tmdbRes.json();
              setMovie(data);
            } else {
              console.error('Failed to fetch movie details');
            }
          } else {
            console.error('Failed to fetch movie details');
          }
        }
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [id]);

  const availableCountries = React.useMemo(() => {
    if (!movie?.release_dates?.results) return [];
    return movie.release_dates.results.map(c => ({
        code: c.iso_3166_1,
        name: new Intl.DisplayNames(['en'], { type: 'region' }).of(c.iso_3166_1)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [movie]);

  // Process releases: flatten, filter, and group
  const groupedReleases = React.useMemo(() => {
    if (!movie?.release_dates?.results) return releaseSort === 'DATE' ? {} : [];

    const allReleases = [];
    movie.release_dates.results.forEach(country => {
       if (selectedCountries.length > 0 && !selectedCountries.includes(country.iso_3166_1)) return;
       
       const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(country.iso_3166_1);
       country.release_dates.forEach(release => {
          if ([1, 3, 4].includes(release.type)) {
             allReleases.push({
                ...release,
                countryCode: country.iso_3166_1,
                countryName: countryName,
                typeName: releaseTypeMap[release.type]
             });
          }
       });
    });

    if (releaseSort === 'DATE') {
        // Group by type
        const grouped = {
           'PREMIERE': [],
           'THEATRICAL': [],
           'DIGITAL': []
        };
    
        allReleases.forEach(r => {
           if (grouped[r.typeName]) {
              grouped[r.typeName].push(r);
           }
        });
    
        // Sort each group by Date
        Object.keys(grouped).forEach(key => {
           grouped[key].sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
           // Remove empty groups
           if (grouped[key].length === 0) delete grouped[key];
        });
    
        return grouped;
    } else {
        // Group by Country
        const grouped = {};
        allReleases.forEach(r => {
            if (!grouped[r.countryName]) {
                grouped[r.countryName] = {
                    countryName: r.countryName,
                    countryCode: r.countryCode,
                    releases: []
                };
            }
            grouped[r.countryName].releases.push(r);
        });
        
        // Convert to array and sort by Country Name
        const sortedCountries = Object.values(grouped).sort((a, b) => a.countryName.localeCompare(b.countryName));
        
        // Sort releases within each country by Date
        sortedCountries.forEach(c => {
            c.releases.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
        });
        
        return sortedCountries;
    }
  }, [movie, releaseSort, selectedCountries]);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!movie) return <div className="error-screen">Movie not found</div>;

  const backdropStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url(${BACKDROP_BASE_URL}${movie.backdrop_path})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  const directorObj = movie.credits?.crew?.find(person => person.job === 'Director');
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const getCrewPriority = (job) => {
    const jobLower = job.toLowerCase();
    if (jobLower === 'director') return 1;
    if (jobLower.includes('producer')) return 2;
    if (jobLower === 'writer' || jobLower === 'screenplay' || jobLower === 'story') return 3;
    if (jobLower.includes('music') || jobLower.includes('composer') || jobLower.includes('sound')) return 4;
    return 99;
  };

  const featuredCrew = movie.credits?.crew ? [...movie.credits.crew]
    .filter(person => getCrewPriority(person.job) < 99)
    .sort((a, b) => getCrewPriority(a.job) - getCrewPriority(b.job))
    : [];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="movie-details-container" style={backdropStyle}>
      <Navbar />
      
      <div className="movie-content-wrapper">
        <div className="poster-section">
          <img 
            src={movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450'} 
            alt={movie.title} 
            className="main-poster"
          />
        </div>
        
        <div className="info-section">
          <div className="top-content-row">
            <div className="main-text-column">
              <h1 className="movie-title-large">
                <span className="title-text">{movie.title}</span>
                <span className="meta-group">
                  <span className="release-year-link">{releaseYear}</span>
                  {directorObj && <span className="director-wrapper">Directed by <span className="director-link" onClick={() => navigate(`/person/${directorObj.id}`, { state: { department: 'Directing' } })} style={{cursor: 'pointer'}}>{directorObj.name}</span></span>}
                </span>
              </h1>
              
              {movie.tagline && <div className="tagline">{movie.tagline}</div>}
              
              <div className="overview-text">
                {movie.overview}
              </div>
            </div>

            <div className="action-sidebar">
              {!user ? (
                 <div className="action-card-content logged-out">
                    <div className="action-row clickable" onClick={() => navigate('/signin')}>
                       Sign in to log, rate or review
                    </div>
                    <div className="action-divider"></div>
                    <div className="action-row clickable">
                       Share
                    </div>
                 </div>
              ) : (
                 <div className="action-card-content logged-in">
                    <div className="icons-row">
                       <div 
                          className="icon-btn"
                          onClick={toggleWatched}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setIsWatchedHovered(true)}
                          onMouseLeave={() => setIsWatchedHovered(false)}
                       >
                          <Eye 
                              size={24} 
                              strokeWidth={1.5} 
                              color={isWatched ? '#00e054' : '#fff'}
                              fill="none"
                          />
                          <span className="icon-label" style={{ color: isWatched ? '#00e054' : 'inherit' }}>
                             {isWatched ? (isWatchedHovered ? 'Remove' : 'Watched') : 'Watch'}
                          </span>
                       </div>
                       <div 
                          className="icon-btn"
                          onClick={toggleLike}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setIsLikeHovered(true)}
                          onMouseLeave={() => setIsLikeHovered(false)}
                       >
                          <Heart 
                             size={24} 
                             strokeWidth={1.5} 
                             color={isLiked ? '#ff5c5c' : '#fff'}
                             fill={isLiked ? '#ff5c5c' : 'none'}
                          />
                          <span className="icon-label" style={{ color: isLiked ? '#ff5c5c' : 'inherit' }}>
                             {isLiked && isLikeHovered ? 'Remove' : 'Like'}
                          </span>
                       </div>
                       <div 
                          className="icon-btn" 
                          onClick={toggleWatchlist} 
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setIsWatchlistHovered(true)}
                          onMouseLeave={() => setIsWatchlistHovered(false)}
                       >
                          <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                              <Clock 
                                size={24} 
                                strokeWidth={inWatchlist ? 2 : 1.5} 
                                color={inWatchlist ? '#40bcf4' : '#fff'} 
                                fill="none" 
                            />
                              <div style={{
                                  position: 'absolute',
                                  bottom: '-2px',
                                  right: '-5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: '#000', 
                                  borderRadius: '50%',
                                  width: '12px',
                                  height: '12px',
                                  border: inWatchlist ? '1px solid #40bcf4' : '1px solid #fff'
                              }}>
                                  {inWatchlist ? (
                                      <Minus size={8} color="#40bcf4" strokeWidth={4} />
                                  ) : (
                                      <Plus size={8} color="#fff" strokeWidth={3} />
                                  )}
                              </div>
                          </div>
                          <span className="icon-label" style={{ color: inWatchlist ? '#40bcf4' : 'inherit' }}>
                              {inWatchlist && isWatchlistHovered ? 'Remove' : 'Watchlist'}
                          </span>
                       </div>
                    </div>
                    <div className="action-divider"></div>
                    <div className="rate-row">
                       <span className="rate-label">Rate</span>
                       <div className="stars">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                                {/* Background Star (Empty) */}
                                <Star 
                                    size={20} 
                                    color={i <= Math.ceil(userRating) ? "#40bcf4" : "#678"} 
                                    strokeWidth={1} 
                                    className="star-icon"
                                />
                                
                                {/* Filled Star Overlay */}
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    width: i <= Math.floor(userRating) ? '100%' : (i === Math.ceil(userRating) && userRating % 1 !== 0) ? '50%' : '0%', 
                                    overflow: 'hidden' 
                                }}>
                                    <Star 
                                        size={20} 
                                        fill="#40bcf4" 
                                        color="#40bcf4"
                                        strokeWidth={1}
                                    />
                                </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="action-divider"></div>
                    <div className="menu-options">
                       <div className="menu-item" onClick={() => navigate(`/movie/${id}/activity`)}>Show your activity</div>
                       
                       {userReview ? (
                           <div style={{ position: 'relative' }}>
                               <div 
                                   className="menu-item" 
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       setShowLogOptions(!showLogOptions);
                                   }}
                               >
                                   Edit your review...
                               </div>
                               {showLogOptions && (
                                   <div 
                                     style={{ 
                                         position: 'absolute', 
                                         top: '100%', 
                                         left: 0, 
                                         width: '100%', 
                                         backgroundColor: '#334155', 
                                         zIndex: 20,
                                         boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                         borderRadius: '0 0 4px 4px'
                                     }}
                                   >
                                       <div 
                                           className="menu-item"
                                           onClick={() => {
                                               setModalInitialData({
                                                   ...userReview,
                                                   isLiked: isLiked,
                                                   isWatched: isWatched
                                               });
                                               setIsReviewModalOpen(true);
                                               setShowLogOptions(false);
                                           }}
                                           style={{ fontSize: '0.85rem', paddingLeft: '25px', textAlign: 'left' }}
                                       >
                                           Edit existing review
                                       </div>
                                       <div 
                                           className="menu-item"
                                           onClick={() => {
                                               setModalInitialData({});
                                               setIsReviewModalOpen(true);
                                               setShowLogOptions(false);
                                           }}
                                           style={{ fontSize: '0.85rem', paddingLeft: '25px', textAlign: 'left' }}
                                       >
                                           Log another review
                                       </div>
                                   </div>
                               )}
                           </div>
                       ) : (
                           <div className="menu-item" onClick={() => {
                               setModalInitialData({});
                               setIsReviewModalOpen(true);
                           }}>
                               Review or log...
                           </div>
                       )}
                       
                       <div className="menu-item">Add to lists...</div>
                    </div>
                    <div className="action-divider"></div>
                    <div className="menu-item share-btn">Share</div>
                 </div>
              )}
            </div>
          </div>

          <div className="tabs-container">
            <div className="tabs-header">
              {['CAST', 'CREW', 'DETAILS', 'GENRES', 'RELEASES'].map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 'CAST' && (
                <>
                  <div className="cast-grid">
                    {movie.credits?.cast?.slice(0, 4).map(person => (
                      <div key={person.id} className="cast-card" onClick={() => navigate(`/person/${person.id}`, { state: { department: 'Acting' } })} style={{cursor: 'pointer'}}>
                         <div className="cast-image-container">
                            {person.profile_path ? (
                              <img src={`${IMAGE_BASE_URL}${person.profile_path}`} alt={person.name} />
                            ) : (
                              <div className="no-image">No Image</div>
                            )}
                         </div>
                         <div className="cast-info">
                            <span className="cast-name">{person.name}</span>
                            <span className="cast-character">{person.character}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                  {movie.credits?.cast?.length > 4 && (
                    <button 
                      className="view-all-btn" 
                      onClick={() => navigate(`/movie/${id}/credits`)}
                    >
                      View All
                    </button>
                  )}
                </>
              )}
              
              {activeTab === 'CREW' && (
                 <>
                   <div className="cast-grid">
                      {featuredCrew.slice(0, 4).map((person, index) => (
                        <div key={`${person.id}-${index}`} className="cast-card" onClick={() => navigate(`/person/${person.id}`, { state: { department: person.department } })} style={{cursor: 'pointer'}}>
                           <div className="cast-image-container">
                              {person.profile_path ? (
                                <img src={`${IMAGE_BASE_URL}${person.profile_path}`} alt={person.name} />
                              ) : (
                                <div className="no-image">No Image</div>
                              )}
                           </div>
                           <div className="cast-info">
                              <span className="cast-name">{person.name}</span>
                              <span className="cast-character">{person.job}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                   {featuredCrew.length > 4 && (
                     <button 
                        className="view-all-btn" 
                        onClick={() => navigate(`/movie/${id}/credits`, { state: { activeTab: 'CREW' } })}
                     >
                        View All
                     </button>
                   )}
                 </>
              )}

              {activeTab === 'DETAILS' && (
                <div className="details-list">
                   <div className="detail-row">
                      <span className="detail-label">Studios</span>
                      <span className="detail-value">
                        {movie.production_companies?.map(c => c.name).join(', ') || 'N/A'}
                      </span>
                   </div>
                   <div className="detail-row">
                      <span className="detail-label">Country</span>
                      <span className="detail-value">
                        {movie.production_countries?.map(c => c.name).join(', ') || 'N/A'}
                      </span>
                   </div>
                   <div className="detail-row">
                      <span className="detail-label">Primary Language</span>
                      <span className="detail-value">
                        {movie.original_language ? new Intl.DisplayNames(['en'], { type: 'language' }).of(movie.original_language) : 'N/A'}
                      </span>
                   </div>
                   <div className="detail-row">
                      <span className="detail-label">Spoken Languages</span>
                      <span className="detail-value">
                        {movie.spoken_languages?.map(l => l.english_name).join(', ') || 'N/A'}
                      </span>
                   </div>
                </div>
              )}

              {activeTab === 'GENRES' && (
                <div className="genres-list">
                  {movie.genres?.map(genre => (
                    <span key={genre.id} className="genre-tag">{genre.name}</span>
                  ))}
                </div>
              )}

              {activeTab === 'RELEASES' && (
                 <div className="releases-list">
                    <div className="releases-controls">
                       <div className="sort-container">
                          <span 
                             className="sort-label"
                             onClick={() => setShowSortMenu(!showSortMenu)}
                          >
                             SORT BY {releaseSort} <span className="sort-arrow">⌄</span>
                          </span>
                          {showSortMenu && (
                             <div className="sort-menu">
                                <div 
                                   className={`sort-option ${releaseSort === 'DATE' ? 'active' : ''}`}
                                   onClick={() => { setReleaseSort('DATE'); setShowSortMenu(false); }}
                                >
                                   Date
                                </div>
                                <div 
                                   className={`sort-option ${releaseSort === 'COUNTRY' ? 'active' : ''}`}
                                   onClick={() => { setReleaseSort('COUNTRY'); setShowSortMenu(false); }}
                                >
                                   Country
                                </div>
                             </div>
                          )}
                       </div>

                       <div className="sort-container" style={{ marginLeft: '20px' }}>
                          <span 
                             className="sort-label"
                             onClick={() => setShowFilterMenu(!showFilterMenu)}
                          >
                             FILTER: {selectedCountries.length === 0 ? 'ALL' : `SELECTED (${selectedCountries.length})`} <span className="sort-arrow">⌄</span>
                          </span>
                          {showFilterMenu && (
                             <div className="sort-menu" style={{ width: '260px', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Search countries..." 
                                        value={countrySearchTerm}
                                        onChange={(e) => setCountrySearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            backgroundColor: '#334155',
                                            border: '1px solid #475569',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            minWidth: 0
                                        }}
                                    />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFilterMenu(false);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '4px',
                                            transition: 'background 0.2s, color 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#94a3b8';
                                        }}
                                        title="Close menu"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1 }}>
                                    <div 
                                       className={`sort-option ${selectedCountries.length === 0 ? 'active' : ''}`}
                                       onClick={() => setSelectedCountries([])}
                                       style={{ fontStyle: 'italic', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                       Show All (Clear Filter)
                                    </div>
                                    {availableCountries
                                        .filter(c => c.name.toLowerCase().includes(countrySearchTerm.toLowerCase()))
                                        .sort((a, b) => {
                                            const aSelected = selectedCountries.includes(a.code);
                                            const bSelected = selectedCountries.includes(b.code);
                                            if (aSelected && !bSelected) return -1;
                                            if (!aSelected && bSelected) return 1;
                                            return 0;
                                        })
                                        .map(country => {
                                            const isSelected = selectedCountries.includes(country.code);
                                            return (
                                                <div 
                                                   key={country.code}
                                                   className={`sort-option ${isSelected ? 'active' : ''}`}
                                                   onClick={(e) => {
                                                       e.stopPropagation();
                                                       if (isSelected) {
                                                           setSelectedCountries(prev => prev.filter(c => c !== country.code));
                                                       } else {
                                                           setSelectedCountries(prev => [...prev, country.code]);
                                                           setCountrySearchTerm('');
                                                       }
                                                   }}
                                                   style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                                                >
                                                   <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        readOnly 
                                                        style={{ 
                                                            cursor: 'pointer', 
                                                            accentColor: '#00e054',
                                                            width: '16px',
                                                            height: '16px'
                                                        }}
                                                   />
                                                   <span>{country.name}</span>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                             </div>
                          )}
                       </div>
                    </div>

                    {releaseSort === 'DATE' ? (
                       Object.keys(groupedReleases).length > 0 ? (
                         Object.entries(groupedReleases).map(([type, releases]) => (
                           <div key={type} className="release-section">
                              <div className="release-header">
                                 <span className="release-header-title">{type}</span>
                              </div>
                              <div className="release-rows">
                                 {releases.map((release, idx) => (
                                    <div key={`${release.countryCode}-${idx}`} className="release-row">
                                      <span className="release-date">{formatDate(release.release_date)}</span>
                                      <div className="release-country">
                                         <img 
                                            src={`https://flagcdn.com/w40/${release.countryCode.toLowerCase()}.png`}
                                            srcSet={`https://flagcdn.com/w80/${release.countryCode.toLowerCase()}.png 2x`}
                                            width="24"
                                            alt={release.countryName} 
                                            className="country-flag-img"
                                            style={{ marginRight: '8px', borderRadius: '2px' }}
                                         />
                                         <span className="country-name">{release.countryName}</span>
                                      </div>
                                      <div className="release-note-container">
                                          {release.certification && <span className="release-cert">{release.certification}</span>}
                                          {release.note && <span className="release-note-text">{release.note}</span>}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                         ))
                       ) : (
                          <div className="no-data">No release dates available</div>
                       )
                    ) : (
                       groupedReleases.length > 0 ? (
                          groupedReleases.map((country) => (
                             <div key={country.countryName} className="country-release-row">
                                <div className="country-info-col">
                                   <img 
                                      src={`https://flagcdn.com/w40/${country.countryCode.toLowerCase()}.png`}
                                      srcSet={`https://flagcdn.com/w80/${country.countryCode.toLowerCase()}.png 2x`}
                                      width="32"
                                      alt={country.countryName} 
                                      className="country-flag-img-large"
                                      style={{ marginRight: '12px', borderRadius: '4px' }}
                                   />
                                   <span className="country-name-large">{country.countryName}</span>
                                </div>
                                <div className="country-releases-col">
                                   {country.releases.map((release, idx) => (
                                      <div key={idx} className="country-release-item">
                                         <span className="release-date-text">{formatDate(release.release_date)}</span>
                                         <span className="release-separator">•</span>
                                         <span className="release-type-text">{release.typeName === 'PREMIERE' ? 'Premiere' : (release.typeName === 'THEATRICAL' ? 'Theatrical' : 'Digital')}</span>
                                         {release.note && <span className="release-note-detail">{release.note}</span>}
                                         {release.certification && <span className="release-cert-badge">{release.certification}</span>}
                                      </div>
                                   ))}
                                </div>
                             </div>
                          ))
                       ) : (
                          <div className="no-data">No release dates available</div>
                       )
                    )}
                 </div>
              )}
            </div>
          </div>

          <div className="runtime-section">
             {movie.runtime} mins
          </div>

          {user && friendActivity.length > 0 && (
          <div className="friend-activity-section">
             <div className="activity-header">
                <span className="activity-title">ACTIVITY FROM FRIENDS</span>
                <span className="activity-stats">
                   {friendActivity.filter(a => a.status === 'WATCHED' || a.status === 'LIKED').length} WATCHED • {friendActivity.filter(a => a.status === 'WATCHLIST').length} WANT TO WATCH
                </span>
             </div>
             <div className="activity-avatars">
                {friendActivity.map((friend) => (
                   <div key={friend.userId} className="friend-avatar" style={{
                       backgroundImage: `url(${friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random`})`,
                       backgroundSize: 'cover',
                       position: 'relative',
                       cursor: 'pointer'
                   }}
                   onClick={() => navigate(`/movie/${movie.id}/activity?userId=${friend.userId}`)}
                   >
                      <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          backgroundColor: '#14181c',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #14181c'
                      }}>
                          {friend.status === 'LIKED' && <Heart size={10} fill="#ff5c5c" color="#ff5c5c" />}
                          {friend.status === 'WATCHED' && <Eye size={10} color="#00e054" />}
                          {friend.status === 'WATCHLIST' && <Clock size={10} color="#40bcf4" />}
                      </div>
                      <div className="friend-tooltip">
                          {friend.status === 'LIKED' && `Liked by ${friend.name}`}
                          {friend.status === 'WATCHED' && `Watched by ${friend.name}`}
                          {friend.status === 'WATCHLIST' && `${friend.name} wants to watch`}
                      </div>
                   </div>
                ))}
             </div>
          </div>
          )}

        </div>
      </div>
      {isReviewModalOpen && (
        <ReviewModal
          movie={movie}
          onClose={() => setIsReviewModalOpen(false)}
          onSave={handleSaveReview}
          initialData={modalInitialData}
          onLikeChange={(newLikeState) => {
              setIsLiked(newLikeState);
          }}
        />
      )}

      {isActivityModalOpen && (
        <div className="modal-overlay" onClick={() => setIsActivityModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                <button className="modal-close" onClick={() => setIsActivityModalOpen(false)}>
                    <X size={24} color="#99aabb" />
                </button>
                <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.5rem', fontWeight: '600' }}>Your Activity</h2>
                
                {userReview ? (
                    <div className="activity-review-container">
                         {/* We can reuse ReviewCard if it's exported, or just render similar structure */}
                         {/* Assuming ReviewCard is not easily importable or we want specific style */}
                         <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                             <div style={{ flex: 1 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                     <span style={{ color: '#99aabb', fontSize: '0.9rem' }}>You reviewed this on</span>
                                     <span style={{ color: '#fff', fontWeight: '500' }}>
                                         {userReview.watchedDate ? new Date(userReview.watchedDate).toLocaleDateString() : 'Unknown date'}
                                     </span>
                                 </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                                     {[1,2,3,4,5].map(star => (
                                         <Star 
                                             key={star} 
                                             size={16} 
                                             fill={star <= userReview.rating ? "#00e054" : "none"} 
                                             color={star <= userReview.rating ? "#00e054" : "#445566"} 
                                             strokeWidth={0}
                                         />
                                     ))}
                                     {userReview.isLiked && <Heart size={16} fill="#ff5c5c" color="#ff5c5c" style={{ marginLeft: '8px' }} />}
                                 </div>
                                 {userReview.content && (
                                     <p style={{ color: '#ddeeff', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                                         {userReview.content}
                                     </p>
                                 )}
                                 {userReview.tags && userReview.tags.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                        {userReview.tags.map(tag => (
                                            <span key={tag} style={{ 
                                                backgroundColor: '#2c3440', 
                                                color: '#99aabb', 
                                                padding: '4px 8px', 
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                 )}
                             </div>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                             <button 
                                onClick={() => {
                                    setIsActivityModalOpen(false);
                                    setIsReviewModalOpen(true);
                                }}
                                style={{
                                    backgroundColor: '#40bcf4',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                             >
                                Edit Review
                             </button>
                         </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#99aabb' }}>
                        <p style={{ marginBottom: '20px' }}>You haven't reviewed this movie yet.</p>
                        <button 
                            onClick={() => {
                                setIsActivityModalOpen(false);
                                setIsReviewModalOpen(true);
                            }}
                            style={{
                                backgroundColor: '#00e054',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '1rem'
                            }}
                        >
                            Log this movie
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
