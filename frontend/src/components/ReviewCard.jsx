import React, { useState, useEffect } from 'react';
import { Star, Heart, RefreshCw, X } from 'lucide-react';
import RatingStars from './RatingStars';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ReviewCard.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const LikesModal = ({ isOpen, onClose, likes, title }) => {
    if (!isOpen) return null;

    return (
        <div className="likes-modal-overlay" onClick={onClose}>
            <div className="likes-modal-content" onClick={e => e.stopPropagation()}>
                <div className="likes-modal-header">
                    <div className="likes-modal-title">{title}</div>
                    <button className="likes-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="likes-list">
                    {likes.length > 0 ? (
                        likes.map(user => (
                            <div key={user.id} className="like-item">
                                <img 
                                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                                    alt={user.name} 
                                    className="like-user-avatar" 
                                />
                                <a href={`/user/${user.id}`} className="like-user-name">
                                    {user.name}
                                </a>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#678' }}>
                            No likes yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReviewCard = ({ review, reviewAuthor }) => {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLikedState, setIsLikedState] = useState(review?.isLiked || false);
  const [likesCountState, setLikesCountState] = useState(review?.likesCount || 0);
  
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesList, setLikesList] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  useEffect(() => {
    if (review) {
      setIsLikedState(!!review.isLiked);
      setLikesCountState(review.likesCount || 0);
    }
  }, [review?.isLiked, review?.likesCount, review]);

  if (!review) return null;

  const {
    movieId,
    movieTitle,
    moviePosterPath,
    moviePosterUrl,
    movieYear,
    rating,
    content,
    containsSpoiler,
    createdAt,
    watchedDate,
    rewatch,
    isRewatch
  } = review;

  const isAuthor = user && ((review.user && String(user.id) === String(review.user.id)) || (reviewAuthor && String(user.id) === String(reviewAuthor.id)));

  const fetchLikes = async () => {
    if (loadingLikes) return;
    setLoadingLikes(true);
    try {
        const res = await fetch(`${API_BASE_URL}/api/reviews/${review.id}/likes`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (res.ok) {
            const data = await res.json();
            setLikesList(data);
            setShowLikesModal(true);
        }
    } catch (err) {
        console.error("Failed to fetch likes", err);
    } finally {
        setLoadingLikes(false);
    }
  };

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    
    if (!user) {
        navigate('/signin');
        return;
    }

    if (isAuthor) {
        fetchLikes();
        return;
    }

    // Optimistic update
    const previousIsLiked = isLikedState;
    const previousLikesCount = likesCountState;

    setIsLikedState(!previousIsLiked);
    setLikesCountState(prev => previousIsLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
        const url = `${API_BASE_URL}/api/reviews/${review.id}/${previousIsLiked ? 'unlike' : 'like'}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!res.ok) {
            // Revert if failed
            const errorText = await res.text();
            console.error("Like failed:", errorText);
            setIsLikedState(previousIsLiked);
            setLikesCountState(previousLikesCount);
        }
    } catch (err) {
        console.error("Error toggling like:", err);
        setIsLikedState(previousIsLiked);
        setLikesCountState(previousLikesCount);
    }
  };

  const wasRewatched = rewatch || isRewatch;
  const displayDate = watchedDate || createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const poster = moviePosterPath || moviePosterUrl;

  const handleMovieClick = () => {
    if (movieId) {
      const targetUserId = review.user?.id || review.userId || reviewAuthor?.id;
      const userParam = targetUserId ? `&userId=${targetUserId}` : '';
      navigate(`/movie/${movieId}/activity?tab=REVIEWS${userParam}`);
    }
  };

  return (
    <>
    <div className="review-card">
      <div className="review-card-poster" onClick={handleMovieClick} style={{ cursor: 'pointer' }}>
        <img 
          src={poster ? `${IMAGE_BASE_URL}${poster}` : 'https://via.placeholder.com/70x105'} 
          alt={movieTitle} 
        />
      </div>
      
      <div className="review-card-content">
        <div className="review-card-header">
           <h3 className="review-movie-title" onClick={handleMovieClick} style={{ cursor: 'pointer', display: 'inline-block' }}>
             {movieTitle} <span className="review-movie-year">{movieYear}</span>
           </h3>
           <div className="review-card-meta">
             {wasRewatched && (
                <div title="Rewatch" style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                    <RefreshCw size={16} color="#00e054" strokeWidth={2} />
                </div>
             )}
             {rating > 0 && (
             <div className="review-rating">
               <RatingStars rating={rating} size={14} color="#00e054" />
             </div>
             )}
             <span className="review-date">Watched {formattedDate}</span>
           </div>
        </div>

        <div className="review-body">
          {containsSpoiler && !showSpoiler ? (
            <div className="spoiler-warning">
              <p>This review contains spoilers.</p>
              <button className="spoiler-reveal-btn" onClick={() => setShowSpoiler(true)}>
                I can handle the truth (View Spoiler)
              </button>
            </div>
          ) : (
            <div className={`review-text ${containsSpoiler ? 'revealed-spoiler' : ''}`}>
               {content}
            </div>
          )}
        </div>

        <div className="review-card-footer">
            <div 
                className="review-likes-container" 
                onClick={handleLikeClick}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginTop: 'auto', 
                    color: (isLikedState || isAuthor) ? '#FF8000' : '#99aabb', 
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
                title={isAuthor ? "See who liked this review" : (isLikedState ? "Unlike review" : "Like review")}
            >
                <Heart size={14} fill={(isLikedState || isAuthor) ? "#FF8000" : "none"} color={(isLikedState || isAuthor) ? "#FF8000" : "#99aabb"} style={{ marginRight: '5px' }} />
                <span>{likesCountState} likes</span>
            </div>
        </div>
      </div>
    </div>
    <LikesModal 
        isOpen={showLikesModal} 
        onClose={() => setShowLikesModal(false)} 
        likes={likesList} 
        title={`Likes for ${movieTitle} review`}
    />
    </>
  );
};

export default ReviewCard;
