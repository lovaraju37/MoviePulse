import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { Star, Heart, MessageSquare, RefreshCw, AlignLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MoviePoster from './MoviePoster';
import RatingStars from './RatingStars';
import './LandingPage.css';

const API_BASE_URL = 'http://localhost:8080';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const HomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAllActivity, setShowAllActivity] = useState(false);

    useEffect(() => {
        if (user) {
            fetch(`${API_BASE_URL}/api/reviews/friends`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                setReviews(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [user]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="landing-container" style={{ minHeight: '100vh', backgroundColor: '#14181c' }}>
            <Navbar />
            
            <main className="main-layout" style={{ paddingTop: '80px', maxWidth: '950px', margin: '0 auto' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ marginBottom: '20px', color: '#99aabb', fontSize: '1.2rem' }}>
                        Welcome back, <span style={{ color: '#fff', fontWeight: 'bold' }}>{user?.name}</span>. Here’s what your friends have been watching...
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #445566', paddingBottom: '10px' }}>
                        <h2 style={{ fontSize: '0.9rem', color: '#99aabb', letterSpacing: '0.075em', fontWeight: 'normal', margin: 0 }}>NEW FROM FRIENDS</h2>
                        <span 
                            style={{ fontSize: '0.8rem', color: '#667788', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => setShowAllActivity(!showAllActivity)}
                        >
                            ⚡ {showAllActivity ? 'SHOW LESS' : 'ALL ACTIVITY'}
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ color: '#99aabb' }}>Loading activity...</div>
                    ) : reviews.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            {(showAllActivity ? reviews : reviews.slice(0, 4)).map(review => (
                                <div key={review.id} style={{ width: '100%' }}>
                                    {/* Poster Card */}
                                    <div style={{ marginBottom: '8px' }}>
                                        <MoviePoster 
                                            movie={{
                                                id: review.movieId,
                                                title: review.movieTitle,
                                                poster_path: review.moviePosterUrl,
                                                posterUrl: review.moviePosterUrl
                                            }}
                                            review={null} // Explicitly null so the poster reflects the VIEWER'S relationship with the movie, not the reviewer's
                                            showTitleTooltip={true}
                                            onClick={() => navigate(`/movie/${review.movieId}/activity?userId=${review.user.id}&tab=REVIEWS`)}
                                            style={{ height: '230px', width: '100%' }}
                                        />
                                        
                                        {/* User Info Bar (Always visible below poster in this view) */}
                                        <div style={{
                                            padding: '8px 4px',
                                            background: 'rgba(20, 24, 28, 0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            borderTop: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <img 
                                                src={review.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || 'User')}&background=random`} 
                                                alt={review.user?.name}
                                                style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                                            />
                                            <span style={{ 
                                                color: '#fff', 
                                                fontSize: '0.75rem', 
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {review.user?.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Meta Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            {/* Stars */}
                                            {review.rating > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
                                                <RatingStars rating={review.rating} size={12} color="#00e054" />
                                            </div>
                                            )}
                                            
                                            {/* Rewatch Icon */}
                                            {review.rewatch && (
                                                <RefreshCw size={10} color="#00e054" />
                                            )}
                                            
                                            {/* Like Icon */}
                                            {review.isLiked && (
                                                <Heart size={12} fill="#ff5c5c" color="#ff5c5c" />
                                            )}
                                            
                                            {/* Review Text Icon */}
                                            {review.content && (
                                                <AlignLeft size={12} color="#89a" />
                                            )}
                                        </div>
                                        
                                        <span style={{ fontSize: '0.75rem', color: '#667788', whiteSpace: 'nowrap' }}>
                                            {formatDate(review.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#667788', backgroundColor: '#1c222b', borderRadius: '8px' }}>
                            <p>No activity from friends yet.</p>
                            <button 
                                onClick={() => navigate('/search')}
                                style={{
                                    marginTop: '10px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Find friends to follow
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default HomePage;