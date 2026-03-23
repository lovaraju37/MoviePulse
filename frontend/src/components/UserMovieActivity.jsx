import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
import RatingStars from './RatingStars';
import ReviewModal from './ReviewModal';
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
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [reviewModal, setReviewModal] = useState(null);
  const [friendActivity, setFriendActivity] = useState([]);
  const [viewMode, setViewMode] = useState('yours'); // 'yours' | 'friends'
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Sync like state when toggled from MoviePoster
  useEffect(() => {
    const handler = (e) => {
      const { movieId, isLiked } = e.detail;
      setDiaryEntries(prev => prev.map(entry =>
        String(entry.movieId) === String(movieId) ? { ...entry, isLiked } : entry
      ));
    };
    window.addEventListener('movieLikeChanged', handler);
    return () => window.removeEventListener('movieLikeChanged', handler);
  }, []);

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

            // Build diary entries for this movie
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
            try {
              const [watchedAll, reviewsAll, likesAll] = await Promise.all([
                fetch(isOwnProfile ? `${API_BASE_URL}/api/watched` : `${API_BASE_URL}/api/watched/user/${targetUserId}`, { headers }).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE_URL}/api/reviews/user/${targetUserId}`, { headers }).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE_URL}/api/likes/user/${targetUserId}`, { headers }).then(r => r.ok ? r.json() : []),
              ]);
              const movieWatched = watchedAll.filter(w => String(w.movieId) === String(id));
              const movieReview = reviewsAll.find(r => String(r.movieId) === String(id));
              const movieLike = likesAll.find(l => String(l.movieId) === String(id));
              const diary = movieWatched.map(w => ({
                id: w.id,
                movieId: w.movieId,
                movieTitle: w.movieTitle,
                posterPath: w.posterPath,
                releaseDate: w.releaseDate,
                watchedAt: w.createdAt,
                rating: movieReview?.rating || 0,
                isLiked: !!movieLike,
                isRewatch: movieReview?.rewatch || false,
                hasReview: !!(movieReview?.content && movieReview.content.trim()),
                reviewId: movieReview?.id,
                reviewContent: movieReview?.content || '',
                containsSpoiler: movieReview?.containsSpoiler || false,
                watchedDate: movieReview?.watchedDate || w.createdAt,
              }));
              diary.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
              setDiaryEntries(diary);
            } catch (e) { console.warn('Diary fetch failed', e); }

            // Fetch friends' activity for this movie
            if (isOwnProfile) {
              try {
                const friendRes = await fetch(`${API_BASE_URL}/api/movies/${id}/friend-activity`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (friendRes.ok) {
                  const friendData = await friendRes.json();
                  // Enrich with rating/review for each friend
                  const enriched = await Promise.all(friendData.map(async f => {
                    try {
                      const rRes = await fetch(`${API_BASE_URL}/api/reviews/user/${f.userId}/movie/${id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                      });
                      if (rRes.ok) {
                        const rData = await rRes.json();
                        return { ...f, rating: rData.rating || 0, hasReview: !!(rData.content && rData.content.trim()) };
                      }
                    } catch (_) {}
                    return { ...f, rating: 0, hasReview: false };
                  }));
                  setFriendActivity(enriched);
                }
              } catch (e) { console.warn('Friend activity fetch failed', e); }
            }
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
  const avatarUrl = viewedUser ? (viewedUser.avatarUrl || viewedUser.picture) : (authUser ? authUser.picture : null);
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

  const handleDiaryLikeToggle = async (entry) => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
    try {
      if (entry.isLiked) {
        await fetch(`${API_BASE_URL}/api/likes/${entry.movieId}`, { method: 'DELETE', headers });
      } else {
        await fetch(`${API_BASE_URL}/api/likes`, { method: 'POST', headers, body: JSON.stringify({ movieId: entry.movieId, movieTitle: entry.movieTitle, posterPath: entry.posterPath }) });
      }
      setDiaryEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isLiked: !entry.isLiked } : e));
    } catch (err) { console.error(err); }
  };

  const handleDiaryReviewSave = (saved) => {
    setDiaryEntries(prev => prev.map(e =>
      String(e.movieId) === String(saved.movieId)
        ? { ...e, rating: saved.rating || e.rating, hasReview: !!(saved.content && saved.content.trim()), reviewId: saved.id, isRewatch: saved.rewatch || e.isRewatch }
        : e
    ));
    setReviewModal(null);
  };

  const renderDiaryStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
        {[...Array(full)].map((_, i) => <Star key={i} size={13} fill="#00e054" color="#00e054" strokeWidth={0} />)}
        {half && <span style={{ color: '#00e054', fontSize: '12px', lineHeight: 1 }}>½</span>}
      </span>
    );
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
                <div className="activity-tab-filter" style={{ position: 'relative' }}>
                  <button
                    className="activity-view-btn"
                    onClick={() => setShowViewDropdown(v => !v)}
                  >
                    {viewMode === 'yours' ? (isOwnProfile ? 'YOU' : (viewedUser?.name?.toUpperCase() || 'USER')) : "FRIENDS"} ▾
                  </button>
                  {showViewDropdown && (
                    <div className="activity-view-dropdown">
                      <div
                        className={`activity-view-option ${viewMode === 'yours' ? 'active' : ''}`}
                        onClick={() => { setViewMode('yours'); setShowViewDropdown(false); }}
                      >Your activity</div>
                      {isOwnProfile && (
                        <div
                          className={`activity-view-option ${viewMode === 'friends' ? 'active' : ''}`}
                          onClick={() => { setViewMode('friends'); setShowViewDropdown(false); }}
                        >Your friends' activity</div>
                      )}
                    </div>
                  )}
                </div>
            </div>

            {activeTab === 'ACTIVITY' && viewMode === 'friends' && (
              <div className="friends-activity-section">
                <div className="friends-activity-header">
                  <span className="friends-activity-title">YOUR FRIENDS WHO HAVE WATCHED</span>
                </div>
                {/* Column headers */}
                <div className="friends-activity-cols">
                  <span className="fac-name">NAME</span>
                  <span className="fac-rating">RATING</span>
                  <span className="fac-like">LIKE</span>
                  <span className="fac-review">REVIEW</span>
                </div>
                {friendActivity.length === 0 ? (
                  <div className="no-activity">None of your friends have watched this yet.</div>
                ) : friendActivity.map(f => (
                  <div key={f.userId} className="friends-activity-row" onClick={() => navigate(`/movie/${id}/activity?userId=${f.userId}`)}>
                    <div className="fac-name">
                      <img
                        src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=random`}
                        alt={f.name}
                        className="fac-avatar"
                      />
                      <div>
                        <div className="fac-username">{f.name}</div>
                        <div className="fac-sub">Activity for film</div>
                      </div>
                    </div>
                    <div className="fac-rating">
                      {f.rating > 0 && <RatingStars rating={f.rating} size={13} color="#00e054" />}
                    </div>
                    <div className="fac-like">
                      {f.status === 'LIKED' && <Heart size={14} fill="#ff8000" color="#ff8000" strokeWidth={0} />}
                    </div>
                    <div className="fac-review">
                      {f.hasReview && <span style={{ color: '#94a3b8', fontSize: '1rem' }}>≡</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ACTIVITY' && viewMode === 'yours' && (
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

            {activeTab === 'DIARY' && viewMode === 'friends' && (
              <div className="friends-activity-section">
                <div className="friends-activity-header">
                  <span className="friends-activity-title">YOUR FRIENDS WHO HAVE WATCHED</span>
                </div>
                <div className="friends-activity-cols">
                  <span className="fac-name">NAME</span>
                  <span className="fac-rating">RATING</span>
                  <span className="fac-like">LIKE</span>
                  <span className="fac-review">REVIEW</span>
                </div>
                {friendActivity.length === 0 ? (
                  <div className="no-activity">None of your friends have watched this yet.</div>
                ) : friendActivity.map(f => (
                  <div key={f.userId} className="friends-activity-row" onClick={() => navigate(`/movie/${id}/activity?userId=${f.userId}`)}>
                    <div className="fac-name">
                      <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=random`} alt={f.name} className="fac-avatar" />
                      <div>
                        <div className="fac-username">{f.name}</div>
                        <div className="fac-sub">Diary for film</div>
                      </div>
                    </div>
                    <div className="fac-rating">{f.rating > 0 && <RatingStars rating={f.rating} size={13} color="#00e054" />}</div>
                    <div className="fac-like">{f.status === 'LIKED' && <Heart size={14} fill="#ff8000" color="#ff8000" strokeWidth={0} />}</div>
                    <div className="fac-review">{f.hasReview && <span style={{ color: '#94a3b8', fontSize: '1rem' }}>≡</span>}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'DIARY' && viewMode === 'yours' && (
              <div className="diary-tab">
                <div className="diary-header-row" style={{ gridTemplateColumns: '80px 50px 80px 120px 50px 60px 60px 50px' }}>
                  <span className="diary-col-month">Month</span>
                  <span className="diary-col-day">Day</span>
                  <span className="diary-col-released">Released</span>
                  <span className="diary-col-rating">Rating</span>
                  <span className="diary-col-like">Like</span>
                  <span className="diary-col-rewatch">Rewatch</span>
                  <span className="diary-col-review">Review</span>
                  <span className="diary-col-edit">Edit</span>
                </div>
                {diaryEntries.length === 0 ? (
                  <div className="no-activity">No diary entries for this movie yet.</div>
                ) : diaryEntries.map(entry => {
                  const d = new Date(entry.watchedAt);
                  return (
                    <div key={entry.id} className="diary-row" style={{ gridTemplateColumns: '80px 50px 80px 120px 50px 60px 60px 50px' }}>
                      <div className="diary-col-month">
                        <div className="diary-month-badge">
                          <span className="diary-month-name">{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                          <span className="diary-month-year">{d.getFullYear()}</span>
                        </div>
                      </div>
                      <div className="diary-col-day"><span className="diary-day-num">{d.getDate()}</span></div>
                      <div className="diary-col-released"><span className="diary-year">{entry.releaseDate?.substring(0, 4)}</span></div>
                      <div className="diary-col-rating">{renderDiaryStars(entry.rating)}</div>
                      <div className="diary-col-like">
                        <Heart
                          size={15}
                          fill={entry.isLiked ? '#ff5c5c' : 'none'}
                          color={entry.isLiked ? '#ff5c5c' : '#475569'}
                          strokeWidth={1.5}
                          style={{ cursor: isOwnProfile ? 'pointer' : 'default' }}
                          onClick={() => isOwnProfile && handleDiaryLikeToggle(entry)}
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
                            onClick={() => setActiveTab('REVIEWS')}
                          >≡</span>
                        )}
                      </div>
                      <div className="diary-col-edit">
                        {isOwnProfile && (
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {reviewModal && (
              <ReviewModal
                movie={reviewModal.movie}
                onClose={() => setReviewModal(null)}
                onSave={handleDiaryReviewSave}
                initialData={reviewModal.initialData}
              />
            )}

            {activeTab === 'REVIEWS' && viewMode === 'friends' && (
              <div className="friends-activity-section">
                <div className="friends-activity-header">
                  <span className="friends-activity-title">YOUR FRIENDS WHO HAVE WATCHED</span>
                </div>
                <div className="friends-activity-cols">
                  <span className="fac-name">NAME</span>
                  <span className="fac-rating">RATING</span>
                  <span className="fac-like">LIKE</span>
                  <span className="fac-review">REVIEW</span>
                </div>
                {friendActivity.length === 0 ? (
                  <div className="no-activity">None of your friends have watched this yet.</div>
                ) : friendActivity.map(f => (
                  <div key={f.userId} className="friends-activity-row" onClick={() => navigate(`/movie/${id}/activity?userId=${f.userId}`)}>
                    <div className="fac-name">
                      <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=random`} alt={f.name} className="fac-avatar" />
                      <div>
                        <div className="fac-username">{f.name}</div>
                        <div className="fac-sub">Review for film</div>
                      </div>
                    </div>
                    <div className="fac-rating">{f.rating > 0 && <RatingStars rating={f.rating} size={13} color="#00e054" />}</div>
                    <div className="fac-like">{f.status === 'LIKED' && <Heart size={14} fill="#ff8000" color="#ff8000" strokeWidth={0} />}</div>
                    <div className="fac-review">{f.hasReview && <span style={{ color: '#94a3b8', fontSize: '1rem' }}>≡</span>}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'REVIEWS' && viewMode === 'yours' && (
                <div className="reviews-tab-content">
                    {userReview ? (
                        <div className="full-review-card">
                            <div className="review-header">
                                <img
                                    src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userNameForAvatar)}&background=random`}
                                    alt={userNameForAvatar}
                                    className="user-avatar-medium"
                                    style={{ borderRadius: '50%', objectFit: 'cover', width: '36px', height: '36px', flexShrink: 0 }}
                                />
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
