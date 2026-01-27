import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Navbar from './Navbar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('query');
    const [movieResults, setMovieResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const { token, user: currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Reset results when query changes
        setMovieResults([]);
        setUserResults([]);
        setActiveFilter('All');
        
        const fetchResults = async () => {
            if (!query) return;
            setLoading(true);
            try {
                const [movieRes, userRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/movies/search?query=${query}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${API_BASE_URL}/api/users/search?query=${query}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (movieRes.ok) {
                    const data = await movieRes.json();
                    setMovieResults(data);
                }
                if (userRes.ok) {
                    const data = await userRes.json();
                    setUserResults(data);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, token]);

    const handleUserClick = (userId) => {
        if (currentUser && String(currentUser.id) === String(userId)) {
            navigate('/profile');
        } else {
            navigate(`/user/${userId}`);
        }
    };

    const filters = [
        { id: 'All', label: 'All' },
        { id: 'Films', label: 'Films' },
        { id: 'Users', label: 'Users/Members' },
        { id: 'Cast', label: 'Cast & Crew' },
        { id: 'Lists', label: 'Lists' },
        { id: 'Reviews', label: 'Reviews' }
    ];

    const renderContent = () => {
        if (loading) return <div>Loading...</div>;

        const showMovies = activeFilter === 'All' || activeFilter === 'Films';
        const showUsers = activeFilter === 'All' || activeFilter === 'Users';
        
        // Placeholder for other filters
        if (!['All', 'Films', 'Users'].includes(activeFilter)) {
            return <div style={{ color: '#888', fontStyle: 'italic' }}>No results found for {activeFilter} yet.</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* Movies Section */}
                {showMovies && (
                    <div>
                        <h3 style={{ 
                            borderBottom: '1px solid #333', 
                            paddingBottom: '10px', 
                            marginBottom: '20px',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#999'
                        }}>
                            Matches for "{query}" in Films
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                            {movieResults.length > 0 ? (
                                movieResults.map(movie => (
                                    <div 
                                        key={movie.id} 
                                        onClick={() => navigate(`/movie/${movie.id}`)}
                                        style={{ 
                                            backgroundColor: 'transparent', 
                                            borderRadius: '4px', 
                                            overflow: 'hidden',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <img 
                                            src={movie.posterUrl} 
                                            alt={movie.title}  
                                            style={{ 
                                                width: '100%', 
                                                height: '270px', 
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                border: '1px solid #333'
                                            }}
                                        />
                                        <div style={{ padding: '10px 0' }}>
                                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#fff' }}>{movie.title}</h3>
                                            <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                                                {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#666', fontSize: '0.9rem' }}>No films found.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Users Section */}
                {showUsers && (
                    <div>
                         <h3 style={{ 
                            borderBottom: '1px solid #333', 
                            paddingBottom: '10px', 
                            marginBottom: '20px',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#999'
                        }}>
                            Matches for "{query}" in Members
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {userResults.length > 0 ? (
                                userResults.map(user => (
                                    <div 
                                        key={user.id} 
                                        onClick={() => handleUserClick(user.id)}
                                        style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px 0',
                                            borderBottom: '1px solid #333',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <img 
                                            src={user.picture || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                                            alt={user.name} 
                                            style={{ 
                                                width: '36px', 
                                                height: '36px', 
                                                borderRadius: '50%', 
                                                objectFit: 'cover', 
                                                marginRight: '12px' 
                                            }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ 
                                                fontWeight: 'bold', 
                                                fontSize: '0.95rem', 
                                                color: '#fff',
                                                marginBottom: '2px'
                                            }}>
                                                {user.name}
                                            </span>
                                            <span style={{ 
                                                color: '#888', 
                                                fontSize: '0.8rem' 
                                            }}>
                                                {user.username}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#666', fontSize: '0.9rem' }}>No members found.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="landing-container">
            <Navbar />
            <div style={{ 
                width: '100%',
                maxWidth: '1600px', 
                margin: '0 auto', 
                padding: '40px 60px', 
                color: 'white', 
                minHeight: 'calc(100vh - 80px)',
                display: 'flex',
                gap: '60px'
            }}>
                {/* Main Content Area */}
                <div style={{ flex: 1, paddingLeft: '40px' }}>
                    {renderContent()}
                </div>

                {/* Sidebar Filters */}
                <div style={{ width: '250px', flexShrink: 0 }}>
                    <h4 style={{ 
                        margin: '0 0 15px 0', 
                        fontSize: '0.8rem', 
                        color: '#999', 
                        textTransform: 'uppercase', 
                        letterSpacing: '1px',
                        borderBottom: '1px solid #333',
                        paddingBottom: '10px'
                    }}>
                        Show results for
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {filters.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                style={{
                                    background: activeFilter === filter.id ? '#333' : 'transparent',
                                    border: 'none',
                                    color: activeFilter === filter.id ? 'white' : '#888',
                                    padding: '8px 12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    marginBottom: '5px',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeFilter !== filter.id) {
                                        e.target.style.color = '#ccc';
                                        e.target.style.background = '#222';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeFilter !== filter.id) {
                                        e.target.style.color = '#888';
                                        e.target.style.background = 'transparent';
                                    }
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResults;
