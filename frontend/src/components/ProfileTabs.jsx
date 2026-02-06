import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ReviewCard from './ReviewCard';
import MoviePoster from './MoviePoster';
import { Heart, Clock, Star, Film, Grid, List as ListIcon, User, UserPlus, UserMinus, BarChart2 } from 'lucide-react';
import './ProfileTabs.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const MovieGrid = ({ movies, emptyMessage }) => {
  return (
    <div className="overview-section" style={{ marginBottom: '30px' }}>
      {movies.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      const fetchProfileLikes = isOwnProfile 
          ? fetch(`${API_BASE_URL}/api/likes`, { headers }) 
          : fetch(`${API_BASE_URL}/api/likes/user/${user.id}`, { headers });
          
      const fetchProfileWatched = isOwnProfile
          ? fetch(`${API_BASE_URL}/api/watched`, { headers })
          : fetch(`${API_BASE_URL}/api/watched/user/${user.id}`, { headers });
          
      const fetchReviews = fetch(`${API_BASE_URL}/api/reviews/user/${user.id}`, { headers });
      
      const fetchMyLikes = (!isOwnProfile && authUser)
          ? fetch(`${API_BASE_URL}/api/likes`, { headers })
          : Promise.resolve(null);

      Promise.all([
        fetchProfileLikes.then(res => res.ok ? res.json() : []),
        fetchProfileWatched.then(res => res.ok ? res.json() : []),
        fetchReviews.then(res => res.ok ? res.json() : []),
        fetchMyLikes.then(res => res ? (res.ok ? res.json() : []) : null)
      ]).then(([likesData, watchedData, reviewsData]) => {
        setFavMovies(likesData.slice(0, 4));
        setRecentMovies(watchedData.slice(0, 4));
        
        // Sort reviews by date descending and add isLiked status
        const sortedReviews = reviewsData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(review => ({
            ...review,
            // Map backend 'isReviewLiked' to 'isLiked' for ReviewCard (which expects 'isLiked' to be review like status)
            // Backend 'isLiked' (movie like) is preserved as 'movieLiked' if needed, or we can just ignore it for ReviewCard
            isLiked: review.isReviewLiked || false, 
            likesCount: review.likesCount || 0 // Ensure we use the count from backend
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

  return (
    <div className="tab-content">
      <div style={{ marginBottom: '10px' }}>
        <div className="profile-content-title">FAVORITE MOVIES</div>
        <MovieGrid movies={favMovies} emptyMessage="No favorite movies yet." />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div className="profile-content-title">RECENT ACTIVITY</div>
        <MovieGrid movies={recentMovies} emptyMessage="No recent activity." />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div className="profile-content-title" style={{ marginBottom: 0 }}>RECENT REVIEWS</div>
            <button 
                onClick={() => navigate(isOwnProfile ? '/profile/reviews' : `/user/${user.id}/reviews`)} // Assuming updated routes
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00e054',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}
            >
                More
            </button>
        </div>
        
        {reviews.length > 0 ? (
          <>
             {/* Recent Reviews Subsection */}
             <div style={{ marginBottom: '20px' }}>
                 <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Recent</div>
                 <div className="reviews-list">
                    {reviews.slice(0, 2).map(review => (
                      <ReviewCard key={review.id} review={review} reviewAuthor={user} />
                    ))}
                 </div>
             </div>

             {/* Popular Reviews Subsection */}
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
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(review => ({
                ...review,
                isLiked: review.isReviewLiked || false, // Map for ReviewCard
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
  
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
      const endpoint = isOwnProfile ? `${API_BASE_URL}/api/watched` : `${API_BASE_URL}/api/watched/user/${user.id}`;
      
      fetch(endpoint, {
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
  }, [user, authUser, profileUser]);

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
          <div key={item.id} className="watchlist-item">
            <MoviePoster 
                movie={{
                    id: item.movieId,
                    title: item.movieTitle,
                    poster_path: item.posterPath
                }}
                showTitleTooltip={true}
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
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(review => ({
            ...review,
            // Map backend 'isReviewLiked' to 'isLiked' for ReviewCard
            isLiked: review.isReviewLiked || false,
            likesCount: review.likesCount || 0 // Use backend provided count
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

  useEffect(() => {
    if (user) {
      const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
      const endpoint = isOwnProfile ? `${API_BASE_URL}/api/watchlist` : `${API_BASE_URL}/api/watchlist/user/${user.id}`;

      // Fetch watchlist directly without setting loading true synchronously
      fetch(endpoint, {
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
  }, [user, authUser, profileUser]);

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
          <div key={item.id} className="watchlist-item">
            <MoviePoster 
                movie={{
                    id: item.movieId,
                    title: item.movieTitle,
                    poster_path: item.posterPath,
                    vote_average: item.voteAverage,
                    release_date: item.releaseDate
                }}
                showTitleTooltip={true}
            />
            <div 
                className="watchlist-item-info" 
                onClick={() => navigate(`/movie/${item.movieId}`)}
                style={{ cursor: 'pointer' }}
            >
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
  const { user: authUser } = useAuth();
  const { user: profileUser } = useOutletContext() || {};
  const user = profileUser || authUser;
  
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      const isOwnProfile = !profileUser || (authUser && String(profileUser.id) === String(authUser.id));
      const endpoint = isOwnProfile ? `${API_BASE_URL}/api/likes` : `${API_BASE_URL}/api/likes/user/${user.id}`;

      // Fetch likes directly without setting loading true synchronously
      fetch(endpoint, {
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
  }, [user, authUser, profileUser]);

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
          <div key={item.id} className="watchlist-item">
            <MoviePoster 
                movie={{
                    id: item.movieId,
                    title: item.movieTitle,
                    poster_path: item.posterPath
                }}
                showTitleTooltip={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
