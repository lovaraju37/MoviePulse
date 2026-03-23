import React, { useState, useRef, useEffect } from 'react';
import { Eye, Heart, MoreHorizontal, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReviewModal from './ReviewModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Reusable MoviePoster component with hover effects
 */
const MoviePoster = ({ 
    movie, 
    review = null, 
    showTitleTooltip = true, 
    className = '', 
    style = {}, 
    onClick = null,
    isLiked: externalIsLiked,
    isWatched: externalIsWatched,
    onLikeToggle,
    onWatchToggle
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    
    // State for actions
    const [internalIsLiked, setInternalIsLiked] = useState(false); // Movie like
    const [internalIsWatched, setInternalIsWatched] = useState(false); // Movie watched
    
    const isLiked = externalIsLiked !== undefined ? externalIsLiked : internalIsLiked;
    const isWatched = externalIsWatched !== undefined ? externalIsWatched : internalIsWatched;
    
    // Track previous review to handle prop changes during render
    const [prevReview, setPrevReview] = useState(review);
    const [isReviewLiked, setIsReviewLiked] = useState(() => {
        if (review) {
            return review.isReviewLiked || review.isLiked || false;
        }
        return false;
    }); // Review like

    // Adjust state during render if review prop changes
    if (review !== prevReview) {
        setPrevReview(review);
        const newIsReviewLiked = review ? (review.isReviewLiked || review.isLiked || false) : false;
        if (newIsReviewLiked !== isReviewLiked) {
            setIsReviewLiked(newIsReviewLiked);
        }
    }
    
    const [statusChecked, setStatusChecked] = useState(false);

    const checkStatus = async () => {
        if (!user || statusChecked || review) return; 
        
        // If controlled by parent, don't fetch
        if (externalIsLiked !== undefined || externalIsWatched !== undefined) {
            setStatusChecked(true);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const headers = { 'Authorization': `Bearer ${token}` };

            const [likeRes, watchedRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/likes/${movie.id}/check`, { headers }),
                fetch(`${API_BASE_URL}/api/watched/${movie.id}/check`, { headers })
            ]);

            if (likeRes.ok) {
                const data = await likeRes.json();
                setInternalIsLiked(data.isLiked);
            }
            if (watchedRes.ok) {
                const data = await watchedRes.json();
                setInternalIsWatched(data.isWatched);
            }
            setStatusChecked(true);
        } catch (error) {
            console.error("Error checking movie status:", error);
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (user && !review && !statusChecked) {
            checkStatus();
        }
    };

    const handlePosterClick = (e) => {
        if (onClick) {
            onClick(e);
        } else {
            navigate(`/movie/${movie.id}`);
        }
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user) {
            navigate('/signin');
            return;
        }

        if (onLikeToggle) {
            onLikeToggle();
            return;
        }

        const token = localStorage.getItem('token');
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };

        try {
            // For review card, we like the REVIEW
            if (review) {
                if (isReviewLiked) {
                    await fetch(`${API_BASE_URL}/api/reviews/${review.id || review.reviewId}/like`, { method: 'DELETE', headers });
                    setIsReviewLiked(false);
                } else {
                    await fetch(`${API_BASE_URL}/api/reviews/${review.id || review.reviewId}/like`, { method: 'POST', headers });
                    setIsReviewLiked(true);
                }
            } 
            // For movie card, we like the MOVIE
            else {
                if (isLiked) {
                    await fetch(`${API_BASE_URL}/api/likes/${movie.id}`, { method: 'DELETE', headers });
                    setInternalIsLiked(false);
                    window.dispatchEvent(new CustomEvent('movieLikeChanged', { detail: { movieId: movie.id, isLiked: false } }));
                } else {
                    await fetch(`${API_BASE_URL}/api/likes`, { 
                        method: 'POST', 
                        headers,
                        body: JSON.stringify({
                            movieId: movie.id,
                            title: movie.title,
                            posterPath: movie.poster_path,
                            voteAverage: movie.vote_average,
                            releaseDate: movie.release_date
                        })
                    });
                    setInternalIsLiked(true);
                    window.dispatchEvent(new CustomEvent('movieLikeChanged', { detail: { movieId: movie.id, isLiked: true } }));
                }
            }
        } catch (err) {
            console.error("Error liking movie:", err);
        }
    };

    const handleWatch = async (e) => {
        e.stopPropagation();
        if (!user) {
            navigate('/signin');
            return;
        }

        if (onWatchToggle) {
            onWatchToggle();
            return;
        }

        if (review) {
            // If it's a review card, eye icon might mean "View Review" or "Mark Movie Watched"?
            // Let's assume it marks the movie watched, same as normal movie card.
        }

        const token = localStorage.getItem('token');
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };

        try {
            if (isWatched) {
                await fetch(`${API_BASE_URL}/api/watched/${movie.id}`, { method: 'DELETE', headers });
                setInternalIsWatched(false);
            } else {
                await fetch(`${API_BASE_URL}/api/watched`, { 
                    method: 'POST', 
                    headers,
                    body: JSON.stringify({
                        movieId: movie.id,
                        title: movie.title,
                        posterPath: movie.poster_path,
                        voteAverage: movie.vote_average,
                        releaseDate: movie.release_date
                    })
                });
                setInternalIsWatched(true);
            }
        } catch (err) {
            console.error("Error toggling watched:", err);
        }
    };

    const [showMenu, setShowMenu] = useState(false);
    const [menuRating, setMenuRating] = useState(0);
    const [menuHoverRating, setMenuHoverRating] = useState(0);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewModalInitialData, setReviewModalInitialData] = useState({});
    const [internalIsWatchlisted, setInternalIsWatchlisted] = useState(false);
    const [existingReview, setExistingReview] = useState(null); // fetched when menu opens
    const [showReviewSubmenu, setShowReviewSubmenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch existing rating + watchlist status when menu opens
    useEffect(() => {
        if (!showMenu || !user || review) return;
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        Promise.all([
            fetch(`${API_BASE_URL}/api/reviews/movie/${movie.id}/check`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${API_BASE_URL}/api/watchlist/${movie.id}/check`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([reviewData, watchlistData]) => {
            if (reviewData?.rating) setMenuRating(reviewData.rating);
            if (watchlistData?.inWatchlist !== undefined) setInternalIsWatchlisted(watchlistData.inWatchlist);
            setExistingReview(reviewData || null);
        });
    }, [showMenu]);

    const handleMore = (e) => {
        e.stopPropagation();
        setShowReviewSubmenu(false);
        setShowMenu(prev => !prev);
    };

    const handleMenuRate = async (rating) => {
        if (!user) return;
        setMenuRating(rating);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
            await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST', headers,
                body: JSON.stringify({ movieId: movie.id, movieTitle: movie.title, posterPath: movie.poster_path, rating, content: '' })
            });
        } catch (err) { console.error(err); }
    };

    const handleWatchlistToggle = async (e) => {
        e.stopPropagation();
        if (!user) return;
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        try {
            if (internalIsWatchlisted) {
                await fetch(`${API_BASE_URL}/api/watchlist/${movie.id}`, { method: 'DELETE', headers });
                setInternalIsWatchlisted(false);
                window.dispatchEvent(new CustomEvent('watchlistChanged', { detail: { movieId: movie.id, inWatchlist: false } }));
            } else {
                await fetch(`${API_BASE_URL}/api/watchlist`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ movieId: movie.id, title: movie.title, posterPath: movie.poster_path, voteAverage: movie.vote_average, releaseDate: movie.release_date })
                });
                setInternalIsWatchlisted(true);
                window.dispatchEvent(new CustomEvent('watchlistChanged', { detail: { movieId: movie.id, inWatchlist: true } }));
            }
        } catch (err) { console.error(err); }
        setShowMenu(false);
    };

    const posterUrl = (() => {
        if (movie.poster_path) {
            return movie.poster_path.startsWith('http') 
                ? movie.poster_path 
                : `${IMAGE_BASE_URL}${movie.poster_path}`;
        }
        if (movie.posterUrl) {
            return movie.posterUrl.startsWith('http') 
                ? movie.posterUrl 
                : `${IMAGE_BASE_URL}${movie.posterUrl}`;
        }
        return 'https://via.placeholder.com/150x225';
    })();

    const movieTitle = movie.title || movie.movieTitle || movie.name || '';
    
    // Determine heart color
    // If review: Orange (#FF8000) if liked, White if not
    // If movie: Pink (#ff5c5c) if liked, White if not
    const heartColor = review 
        ? (isReviewLiked ? "#FF8000" : "#fff") 
        : (isLiked ? "#ff5c5c" : "#fff");
        
    const heartFill = review 
        ? (isReviewLiked ? "#FF8000" : "none") 
        : (isLiked ? "#ff5c5c" : "none");

    const eyeColor = isWatched ? "#00e054" : "#fff";

    return (
        <div 
            className={`movie-poster-container ${className}`}
            style={{ 
                position: 'relative', 
                borderRadius: '4px', 
                overflow: 'visible',
                cursor: 'pointer',
                border: isHovered ? '3px solid #00e054' : '1px solid #2c3440',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                transition: 'border 0.2s ease',
                aspectRatio: '2/3',
                ...style
            }}
            onClick={handlePosterClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Title Tooltip */}
            {isHovered && showTitleTooltip && movieTitle && (
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#2c3440',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    border: '1px solid #445566'
                }}>
                    {movieTitle}
                    <div style={{
                        position: 'absolute',
                        bottom: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #2c3440'
                    }} />
                </div>
            )}

            <img 
                src={posterUrl} 
                alt={movieTitle}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px', display: 'block' }}
            />
            
            {/* Hover Overlay Options */}
            {isHovered && user && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 10px',
                    zIndex: 5
                }}>
                    <Eye 
                        size={20} 
                        color={eyeColor} 
                        style={{ cursor: 'pointer' }} 
                        onClick={handleWatch}
                    />
                    <Heart 
                        size={20} 
                        color={heartColor} 
                        fill={heartFill} 
                        style={{ cursor: 'pointer' }} 
                        onClick={handleLike}
                    />
                    <MoreHorizontal 
                        size={20} 
                        color="#fff" 
                        style={{ cursor: 'pointer' }} 
                        onClick={handleMore}
                    />
                </div>
            )}

            {/* Three-dot menu */}
            {showMenu && user && (
                <div
                    ref={menuRef}
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        bottom: '44px',
                        right: 0,
                        background: '#2d3748',
                        borderRadius: '8px',
                        minWidth: '200px',
                        zIndex: 200,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Quick rate stars */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', padding: '12px 16px 8px', borderBottom: '1px solid #374151' }}>
                        {[1,2,3,4,5].map(s => (
                            <Star
                                key={s}
                                size={22}
                                fill={(menuHoverRating || menuRating) >= s ? '#00e054' : 'none'}
                                color={(menuHoverRating || menuRating) >= s ? '#00e054' : '#64748b'}
                                style={{ cursor: 'pointer', transition: 'color 0.1s' }}
                                onMouseEnter={() => setMenuHoverRating(s)}
                                onMouseLeave={() => setMenuHoverRating(0)}
                                onClick={() => handleMenuRate(s)}
                            />
                        ))}
                    </div>
                    {!showReviewSubmenu ? (
                      <>
                        {[
                            { label: 'Show your activity', action: () => { navigate(`/movie/${movie.id}/activity`); setShowMenu(false); } },
                            { label: 'Review or log film...', action: () => setShowReviewSubmenu(true), hasSubmenu: true },
                            { label: internalIsWatchlisted ? '✓ In watchlist · Remove' : 'Add to watchlist', action: handleWatchlistToggle },
                            { label: 'Add to lists...', action: () => setShowMenu(false) },
                            { label: 'Show in lists', action: () => setShowMenu(false) },
                            { label: 'Where to watch', action: () => setShowMenu(false) },
                        ].map(item => (
                            <div
                                key={item.label}
                                onClick={item.action}
                                style={{
                                    padding: '10px 18px',
                                    fontSize: '0.88rem',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {item.label}
                                {item.hasSubmenu && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>›</span>}
                            </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Back header */}
                        <div
                            onClick={() => setShowReviewSubmenu(false)}
                            style={{
                                padding: '10px 18px',
                                fontSize: '0.8rem',
                                color: '#64748b',
                                cursor: 'pointer',
                                borderBottom: '1px solid #374151',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ‹ Back
                        </div>
                        {existingReview?.hasReview && (
                            <div
                                onClick={() => {
                                    setReviewModalInitialData({
                                        isWatched: true,
                                        rating: existingReview.rating || 0,
                                        isRewatch: existingReview.review?.rewatch || false,
                                        isLiked: existingReview.isLiked || false,
                                        review: existingReview.review?.content || '',
                                        containsSpoiler: existingReview.review?.containsSpoiler || false,
                                        watchedDate: existingReview.review?.watchedDate
                                            ? existingReview.review.watchedDate.substring(0, 10)
                                            : undefined,
                                    });
                                    setShowReviewModal(true);
                                    setShowMenu(false);
                                    setShowReviewSubmenu(false);
                                }}
                                style={{ padding: '12px 18px', fontSize: '0.88rem', color: '#cbd5e1', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Edit existing review
                            </div>
                        )}
                        <div
                            onClick={() => {
                                setReviewModalInitialData({ isWatched: true });
                                setShowReviewModal(true);
                                setShowMenu(false);
                                setShowReviewSubmenu(false);
                            }}
                            style={{ padding: '12px 18px', fontSize: '0.88rem', color: '#cbd5e1', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            Log another review
                        </div>
                      </>
                    )}
                </div>
            )}

            {showReviewModal && (
                <ReviewModal
                    movie={movie}
                    onClose={() => setShowReviewModal(false)}
                    onSave={() => setShowReviewModal(false)}
                    initialData={reviewModalInitialData}
                />
            )}
        </div>
    );
};

export default MoviePoster;
