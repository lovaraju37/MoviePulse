import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from './Navbar';
import './MovieDetails.css';
import { useAuth } from '../context/AuthContext';
import { Eye, Heart, Clock, Star, Share2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CAST');
  const [releaseSort, setReleaseSort] = useState('DATE');
  const [showSortMenu, setShowSortMenu] = useState(false);

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

  const releaseTypeMap = {
    1: 'PREMIERE',
    3: 'THEATRICAL',
    4: 'DIGITAL'
  };

  // Process releases: flatten, filter, and group
  const groupedReleases = React.useMemo(() => {
    if (!movie?.release_dates?.results) return releaseSort === 'DATE' ? {} : [];

    const allReleases = [];
    movie.release_dates.results.forEach(country => {
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
  }, [movie, releaseSort]);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!movie) return <div className="error-screen">Movie not found</div>;

  const backdropStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url(${BACKDROP_BASE_URL}${movie.backdrop_path})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  const director = movie.credits?.crew?.find(person => person.job === 'Director')?.name;
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

  const getFlagEmoji = (countryCode) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

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
                  {director && <span className="director-wrapper">Directed by <span className="director-link">{director}</span></span>}
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
                       <div className="icon-btn">
                          <Eye size={24} strokeWidth={1.5} />
                          <span className="icon-label">Watch</span>
                       </div>
                       <div className="icon-btn">
                          <Heart size={24} strokeWidth={1.5} />
                          <span className="icon-label">Like</span>
                       </div>
                       <div className="icon-btn">
                          <Clock size={24} strokeWidth={1.5} />
                          <span className="icon-label">Watchlist</span>
                       </div>
                    </div>
                    <div className="action-divider"></div>
                    <div className="rate-row">
                       <span className="rate-label">Rate</span>
                       <div className="stars">
                          {[1,2,3,4,5].map(i => <Star key={i} size={20} strokeWidth={1} className="star-icon" />)}
                       </div>
                    </div>
                    <div className="action-divider"></div>
                    <div className="menu-options">
                       <div className="menu-item">Show your activity</div>
                       <div className="menu-item">Review or log...</div>
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
                      <div key={person.id} className="cast-card">
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
                        <div key={`${person.id}-${index}`} className="cast-card">
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
                                          <span className="country-flag">{getFlagEmoji(release.countryCode)}</span>
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
                                   <span className="country-flag-large">{getFlagEmoji(country.countryCode)}</span>
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

          <div className="friend-activity-section">
             <div className="activity-header">
                <span className="activity-title">ACTIVITY FROM FRIENDS</span>
                <span className="activity-stats">2 WATCHED • 7 WANT TO WATCH</span>
             </div>
             <div className="activity-avatars">
                {[1, 2, 3, 4, 5].map((i) => (
                   <div key={i} className="friend-avatar" style={{backgroundColor: `hsl(${i * 60}, 70%, 50%)`}}>
                      {/* Placeholder for avatar */}
                   </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MovieDetails;
