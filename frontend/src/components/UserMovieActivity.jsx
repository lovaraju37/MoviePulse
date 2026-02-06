import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
import RatingStars from './RatingStars';
import { Star, Heart, Eye, Clock, Calendar, List, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MoviePoster from './MoviePoster';
import './UserMovieActivity.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const UserMovieActivity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryUserId = searchParams.get('userId');
  const { user: authUser } = useAuth();
  
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ACTIVITY');
  const [userReview, setUserReview] = useState(null);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [viewedUser, setViewedUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch movie details
        const movieRes = await fetch(`${API_BASE_URL}/api/movies/${id}`);
        if (!movieRes.ok) throw new Error('Movie not found');
        const movieData = await movieRes.json();
        setMovie(movieData);

        const targetUserId = queryUserId || (authUser ? authUser.id : null);
        const isOwnProfile = authUser && String(authUser.id) === String(targetUserId);

        if (targetUserId) {
             // If viewing another user, fetch their profile first
             if (!isOwnProfile) {
                 const userRes = await fetch(`${API_BASE_URL}/api/users/${targetUserId}`, {
                     headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                 });
                 if (userRes.ok) {
                     const userData = await userRes.json();
                     setViewedUser({
                         id: userData.id,
                         name: userData.name,
                         avatarUrl: userData.picture
                     });
                 }
             } else {
                 setViewedUser(authUser);
             }

            // Fetch user review/activity
            const endpoint = isOwnProfile 
                ? `${API_BASE_URL}/api/reviews/movie/${id}/check`
                : `${API_BASE_URL}/api/reviews/user/${targetUserId}/movie/${id}`;

            let reviewData;
            try {
                const reviewRes = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

                if (reviewRes.status === 404 && !isOwnProfile) {
                     // Fallback for outdated backend: fetch all reviews and filter
                     console.warn("New endpoint not found, falling back to legacy fetch");
                     const allReviewsRes = await fetch(`${API_BASE_URL}/api/reviews/user/${targetUserId}`, {
                         headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                     });
                     
                     if (allReviewsRes.ok) {
                         const allReviews = await allReviewsRes.json();
                         const targetReview = allReviews.find(r => String(r.movieId) === String(id));
                         
                         // Try to fetch likes too (if endpoint exists)
                         let isLiked = false;
                         let likeDate = null;
                         try {
                             const allLikesRes = await fetch(`${API_BASE_URL}/api/likes/user/${targetUserId}`, {
                                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                             });
                             if (allLikesRes.ok) {
                                 const allLikes = await allLikesRes.json();
                                 const targetLike = allLikes.find(l => String(l.movieId) === String(id));
                                 if (targetLike) {
                                     isLiked = true;
                                     likeDate = targetLike.createdAt;
                                 }
                             }
                         } catch (e) {
                             console.warn("Could not fetch likes", e);
                         }
                         
                         reviewData = {
                             hasReview: !!targetReview,
                             review: targetReview || null,
                             isLiked: isLiked,
                             likeDate: likeDate,
                             rating: targetReview ? targetReview.rating : null
                         };
                     } else {
                         throw new Error("Failed to fetch user reviews fallback");
                     }
                } else {
                    reviewData = await reviewRes.json();
                }
            } catch (error) {
                console.error("Error fetching review data:", error);
                // If fallback fails, just return empty data to avoid crash
                reviewData = { hasReview: false, isLiked: false };
            }

            console.log("Activity Check Response:", reviewData); 
            
            const newActivity = [];

            if (reviewData.hasReview && reviewData.review) {
                // Construct activity item from review
                const activityItem = {
                    type: 'REVIEW',
                    date: reviewData.review.watchedDate || reviewData.review.createdAt,
                    rating: reviewData.review.rating,
                    reviewId: reviewData.review.id,
                    isLiked: reviewData.isLiked,
                    isRewatch: reviewData.review.isRewatch || reviewData.review.rewatch
                };
                newActivity.push(activityItem);
                setUserReview({
                    ...reviewData.review,
                    isLiked: reviewData.isLiked || false,
                    isReviewLiked: reviewData.isReviewLiked || false,
                    reviewLikeCount: reviewData.reviewLikeCount || 0
                });
            } else if (reviewData.hasReview) {
                console.warn('Review data reported as existing but review object is missing:', reviewData);
                setUserReview(null);
            } else {
                setUserReview(null);
            }

            if (reviewData.isLiked) {
                const likeItem = {
                    type: 'LIKE',
                    date: reviewData.likeDate || (reviewData.review ? (reviewData.review.watchedDate || reviewData.review.createdAt) : new Date().toISOString()),
                    rating: null,
                    reviewId: null
                };
                newActivity.push(likeItem);
            }

            // Sort by date descending
            newActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setActivity(newActivity);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, authUser, queryUserId]);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!movie) return <div className="error-screen">Movie not found</div>;

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const isOwnProfile = !queryUserId || (authUser && String(authUser.id) === String(queryUserId));
  const displayName = isOwnProfile ? "You" : (viewedUser ? viewedUser.name : "User");
  const titleName = isOwnProfile ? "YOUR" : (viewedUser ? `${viewedUser.name.toUpperCase()}'S` : "USER'S");
  const avatarUrl = viewedUser ? viewedUser.avatarUrl : (authUser ? authUser.avatarUrl : null);
  const userNameForAvatar = viewedUser ? viewedUser.name : (authUser ? authUser.name : 'User');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRelativeTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const handleLikeReview = async (e) => {
      e.stopPropagation();
      if (!userReview) return;
      
      const isLiked = userReview.isReviewLiked;
      
      try {
          const method = isLiked ? 'DELETE' : 'POST';
          const res = await fetch(`${API_BASE_URL}/api/reviews/${userReview.id}/like`, {
              method: method,
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (res.ok) {
              setUserReview(prev => ({
                  ...prev,
                  isReviewLiked: !isLiked,
                  reviewLikeCount: isLiked ? Math.max(0, (prev.reviewLikeCount || 0) - 1) : (prev.reviewLikeCount || 0) + 1
              }));
          } else {
              console.error("Failed to toggle review like");
          }
      } catch (err) {
          console.error(err);
      }
  };

  return (
    <div className="activity-page-container">
      <Navbar />
      
      <div className="activity-content-wrapper">
        <div className="activity-main-section">
            <div className="activity-header-section">
                <h1 className="activity-page-title">
                    {titleName} ACTIVITY FOR <br />
                    <span className="movie-title-highlight" onClick={() => navigate(`/movie/${movie.id}`)} style={{cursor: 'pointer'}}>
                        {movie.title}
                    </span> <span className="movie-year-highlight">{releaseYear}</span>
                </h1>
            </div>

            <div className="activity-tabs">
                <div 
                    className={`activity-tab ${activeTab === 'ACTIVITY' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ACTIVITY')}
                >
                    ACTIVITY
                </div>
                <div 
                    className={`activity-tab ${activeTab === 'DIARY' ? 'active' : ''}`}
                    onClick={() => setActiveTab('DIARY')}
                >
                    DIARY
                </div>
                <div 
                    className={`activity-tab ${activeTab === 'REVIEWS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('REVIEWS')}
                >
                    REVIEWS
                </div>
                <div 
                    className={`activity-tab ${activeTab === 'LISTS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('LISTS')}
                >
                    LISTS
                </div>
                <div className="activity-tab-spacer"></div>
                <div className="activity-tab-filter">
                    {isOwnProfile ? "YOU" : (viewedUser ? viewedUser.name.toUpperCase() : "USER")} ⌄
                </div>
            </div>

            {activeTab === 'ACTIVITY' && (
                <div className="activity-list">
                    {activity.length > 0 ? (
                        activity.map((item, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-item-left">
                                    <div className="user-avatar-small" style={{
                                        backgroundImage: `url(${avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userNameForAvatar)}&background=random`})`
                                    }}></div>
                                    <div className="activity-text">
                                        {item.type === 'REVIEW' ? (
                                            <>
                                                {displayName} reviewed and rated <span className="movie-link">{movie.title}</span> 
                                                {item.rating > 0 && (
                                                <div className="activity-meta">
                                                    <div className="activity-stars">
                                                        <RatingStars rating={item.rating} size={12} color="#00e054" />
                                                    </div>
                                                </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {displayName} liked <span className="movie-link">{movie.title}</span>
                                                <div className="rating-stars-inline" style={{ marginLeft: '5px', display: 'inline-block' }}>
                                                    <Heart 
                                                        size={12} 
                                                        fill="#ff5c5c" 
                                                        color="#ff5c5c" 
                                                        strokeWidth={0} 
                                                    />
                                                </div>
                                            </>
                                        )}
                                        on {formatDate(item.date)}
                                    </div>
                                </div>
                                <div className="activity-time">
                                    {getRelativeTime(item.date)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-activity">No activity recorded for this movie yet.</div>
                    )}
                    
                    <div className="end-activity">End of recent activity</div>
                </div>
            )}

            {activeTab === 'REVIEWS' && (
                <div className="reviews-tab-content">
                    {userReview ? (
                        <div className="full-review-card">
                            <div className="review-header">
                                <div className="user-avatar-medium" style={{
                                    backgroundImage: `url(${avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userNameForAvatar)}&background=random`})`
                                }}></div>
                                <div className="review-meta">
                                    <div className="review-author">Review by <span className="author-name">{displayName}</span></div>
                                    <div className="review-rating">
                                        {userReview.rating > 0 && (
                                            <div style={{ display: 'inline-block', marginRight: '6px' }}>
                                                <RatingStars rating={userReview.rating} size={16} color="#00e054" />
                                            </div>
                                        )}

                                        {(userReview.isRewatch || userReview.rewatch) && (
                                            <div title="Rewatch" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', verticalAlign: 'middle' }}>
                                                <RefreshCw size={16} color="#00e054" strokeWidth={2} />
                                            </div>
                                        )}

                                        {userReview.isLiked && (
                                            <div title="Liked Movie" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', verticalAlign: 'middle' }}>
                                                <Heart size={16} color="#ff5c5c" fill="#ff5c5c" strokeWidth={0} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="review-body">
                                {userReview.containsSpoiler && !showSpoiler ? (
                                    <div className="spoiler-warning-container">
                                        <p className="spoiler-message">This review contains spoilers.</p>
                                        <button 
                                            onClick={() => setShowSpoiler(true)} 
                                            className="reveal-spoiler-btn"
                                        >
                                            I can handle the truth
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {userReview.containsSpoiler && (
                                            <div className="spoiler-badge-inline">SPOILER</div>
                                        )}
                                        {userReview.content}
                                    </>
                                )}
                            </div>

                            <div className="review-actions" style={{ marginTop: '16px', marginBottom: '8px' }}>
                                <div 
                                    onClick={handleLikeReview}
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        cursor: 'pointer',
                                        color: '#99aabb',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        userSelect: 'none'
                                    }}
                                >
                                    <Heart 
                                        size={18} 
                                        color={(userReview.isReviewLiked || isOwnProfile) ? "#FF8000" : "#667788"} 
                                        fill={(userReview.isReviewLiked || isOwnProfile) ? "#FF8000" : "none"}
                                    />
                                    <span>Like review</span>
                                    <span style={{ marginLeft: '2px' }}>{userReview.reviewLikeCount || 0}</span>
                                </div>
                            </div>
                            
                            {/* Tags section removed as per user request */}

                            <div className="review-date">
                                Reviewed on {formatDate(userReview.createdAt)}
                            </div>
                        </div>
                    ) : (
                        <div className="no-activity">No review recorded for this movie yet.</div>
                    )}
                </div>
            )}
        </div>

        <div className="activity-sidebar">
            <div className="poster-container">
                <MoviePoster 
                    movie={movie}
                    review={null} // Explicitly null to ensure we use the Viewer's like status (Movie Mode), not the Reviewer's status
                    showTitleTooltip={false}
                    className="sidebar-poster"
                    onClick={() => navigate(`/movie/${movie.id}`)}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserMovieActivity;
