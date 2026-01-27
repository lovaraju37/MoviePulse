import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './MovieCredits.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const MovieCredits = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'CAST');

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
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&append_to_response=credits`);
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

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!movie) return <div className="error-screen">Movie not found</div>;

  const backdropStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url(${BACKDROP_BASE_URL}${movie.backdrop_path})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  const getCrewPriority = (job) => {
    const jobLower = job.toLowerCase();
    if (jobLower === 'director') return 1;
    if (jobLower.includes('producer')) return 2;
    if (jobLower === 'writer' || jobLower === 'screenplay' || jobLower === 'story') return 3;
    if (jobLower.includes('casting')) return 4;
    if (jobLower.includes('music') || jobLower.includes('composer')) return 5;
    if (jobLower.includes('sound')) return 6;
    if (jobLower.includes('costume')) return 7;
    if (jobLower.includes('choreograph')) return 8;
    return 99;
  };

  const sortedCrew = movie.credits?.crew ? [...movie.credits.crew].sort((a, b) => {
    return getCrewPriority(a.job) - getCrewPriority(b.job);
  }) : [];

  return (
    <div className="credits-page-container" style={backdropStyle}>
      <Navbar />
      
      <div className="credits-content-wrapper">
        <div className="credits-header">
          <button className="back-btn" onClick={() => navigate(`/movie/${id}`)}>
            ← Back to Movie
          </button>
          <h1>{movie.title} <span className="subtitle">Full Credits</span></h1>
        </div>

        <div className="credits-tabs">
          {['CAST', 'CREW'].map((tab) => (
            <button
              key={tab}
              className={`credits-tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="credits-grid-container">
          {activeTab === 'CAST' && (
            <div className="credits-grid">
              {movie.credits?.cast?.map(person => (
                <div key={person.id} className="credit-card">
                   <div className="credit-image-container">
                      {person.profile_path ? (
                        <img src={`${IMAGE_BASE_URL}${person.profile_path}`} alt={person.name} />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                   </div>
                   <div className="credit-info">
                      <span className="credit-name">{person.name}</span>
                      <span className="credit-role">{person.character}</span>
                   </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'CREW' && (
             <div className="credits-grid">
                {sortedCrew?.map((person, index) => (
                  <div key={`${person.id}-${index}`} className="credit-card">
                    <div className="credit-image-container">
                      {person.profile_path ? (
                        <img src={`${IMAGE_BASE_URL}${person.profile_path}`} alt={person.name} />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <div className="credit-info">
                      <span className="credit-name">{person.name}</span>
                      <span className="credit-role">{person.job}</span>
                    </div>
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCredits;
