import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReviewCard from './ReviewCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

const MovieGrid = ({ movies, emptyMessage }) => {
  const navigate = useNavigate();
  return (
    <div className="overview-section" style={{ marginBottom: '30px' }}>
      {movies.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {movies.map(item => (
            <div key={item.id} onClick={() => navigate(`/movie/${item.movieId}`)} style={{ cursor: 'pointer' }}>
              <img 
                src={item.posterPath ? `${IMAGE_BASE_URL}${item.posterPath}` : 'https://via.placeholder.com/150x225'} 
                alt={item.movieTitle}
                style={{ width: '100%', borderRadius: '8px', aspectRatio: '2/3', objectFit: 'cover' }}
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
  const { user } = useAuth();
  const [favMovies, setFavMovies] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock reviews data including a spoiler review
  const mockReviews = [
    {
      id: 1,
      movieTitle: "Dune: Part Two",
      movieYear: "2024",
      moviePosterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
      rating: 5,
      content: "This movie is an absolute masterpiece. The visuals, the sound design, the acting - everything is perfect. A true cinematic experience.",
      containsSpoiler: false,
      likesCount: 24,
      isLiked: true,
      createdAt: "2024-03-01T12:00:00"
    },
    {
      id: 2,
      movieTitle: "Fight Club",
      movieYear: "1999",
      moviePosterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      rating: 4.5,
      content: "The ending completely blew my mind! When it turned out that the narrator and Tyler Durden were the same person all along, I was in shock. This recontextualizes the entire movie.",
      containsSpoiler: true,
      likesCount: 156,
      isLiked: false,
      createdAt: "2024-02-28T10:30:00"
    }
  ];

  useEffect(() => {
    if (user) {
      Promise.all([
        fetch(`${API_BASE_URL}/api/likes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/api/watched`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.ok ? res.json() : [])
      ]).then(([likesData, watchedData]) => {
        setFavMovies(likesData.slice(0, 4));
        setRecentMovies(watchedData.slice(0, 4));
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user]);

  if (!user) return null;
  if (loading) return <div className="tab-content">Loading...</div>;

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '10px' }}>
        <div className="profile-content-title" style={{ marginBottom: '15px' }}>FAVORITE MOVIES</div>
        <MovieGrid movies={favMovies} emptyMessage="No favorite movies yet." />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div className="profile-content-title" style={{ marginBottom: '15px' }}>RECENT ACTIVITY</div>
        <MovieGrid movies={recentMovies} emptyMessage="No recent activity." />
      </div>

      <div>
        <div className="profile-content-title" style={{ marginBottom: '15px' }}>RECENT REVIEWS</div>
        <div className="reviews-list">
          {mockReviews.map(review => (
            <ReviewCard key={review.id} review={review} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProfileActivity = () => {
  const { user } = useAuth();
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
        const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
            <ReviewCard key={review.id} review={review} user={user} />
          ))}
        </div>
      ) : (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>No recent activity to show.</p>
      )}
    </div>
  );
};

export const ProfileFilms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      // Fetch watched films directly without setting loading true synchronously
      fetch(`${API_BASE_URL}/api/watched`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(async res => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`Failed to fetch watched films: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then(data => {
        setWatchedMovies(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Watched fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">Loading films...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">Error</div>
        <p>Error loading films: {error}</p>
      </div>
    );
  }

  if (!watchedMovies.length) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">You have watched 0 films</div>
        <p>Films you have watched will appear here.</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="profile-content-title">You have watched {watchedMovies.length} films</div>
      <div className="watchlist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {watchedMovies.map(item => (
          <div key={item.id} className="watchlist-item" onClick={() => navigate(`/movie/${item.movieId}`)} style={{ cursor: 'pointer' }}>
            <img 
              src={item.posterPath ? `${IMAGE_BASE_URL}${item.posterPath}` : 'https://via.placeholder.com/150x225'} 
              alt={item.movieTitle}
              style={{ width: '100%', borderRadius: '8px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProfileDiary = () => (
  <div className="tab-content">
    <div className="profile-content-title">Diary entries for this year</div>
    <p>Your movie diary entries will appear here.</p>
  </div>
);

export const ProfileReviews = () => (
  <div className="tab-content">
    <div className="profile-content-title">You have written 0 reviews</div>
    <p>Reviews you have written will appear here.</p>
  </div>
);

export const ProfileWatchlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      // Fetch watchlist directly without setting loading true synchronously
      fetch(`${API_BASE_URL}/api/watchlist`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(async res => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`Failed to fetch watchlist: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then(data => {
        setWatchlist(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Watchlist fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">Loading watchlist...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">Error</div>
        <p>Error loading watchlist: {error}</p>
      </div>
    );
  }

  if (!watchlist.length) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">You want to see 0 films</div>
        <p>Your watchlist is empty.</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="profile-content-title">You want to see {watchlist.length} films</div>
      <div className="watchlist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {watchlist.map(item => (
          <div key={item.id} className="watchlist-item" onClick={() => navigate(`/movie/${item.movieId}`)} style={{ cursor: 'pointer' }}>
            <img 
              src={item.posterPath ? `${IMAGE_BASE_URL}${item.posterPath}` : 'https://via.placeholder.com/150x225'} 
              alt={item.movieTitle} 
              style={{ width: '100%', borderRadius: '8px' }}
            />
            <div className="watchlist-item-info">
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

export const ProfileLists = () => (
  <div className="tab-content">
    <div className="profile-content-title">You have created 0 lists</div>
    <p>Custom lists you have created will appear here.</p>
  </div>
);

export const ProfileLikes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      // Fetch likes directly without setting loading true synchronously
      fetch(`${API_BASE_URL}/api/likes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(async res => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`Failed to fetch likes: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then(data => {
        setLikes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Likes fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">Loading likes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">Error</div>
        <p>Error loading likes: {error}</p>
      </div>
    );
  }

  if (!likes.length) {
    return (
      <div className="tab-content">
        <div className="profile-content-title">You have liked 0 films</div>
        <p>Films you have liked will appear here.</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="profile-content-title">You have liked {likes.length} films</div>
      <div className="watchlist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {likes.map(item => (
          <div key={item.id} className="watchlist-item" onClick={() => navigate(`/movie/${item.movieId}`)} style={{ cursor: 'pointer' }}>
            <img 
              src={item.posterPath ? `${IMAGE_BASE_URL}${item.posterPath}` : 'https://via.placeholder.com/150x225'} 
              alt={item.movieTitle}
              style={{ width: '100%', borderRadius: '8px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
