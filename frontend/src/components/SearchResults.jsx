import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Navbar from './Navbar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_FALLBACK = API_BASE_URL || 'http://localhost:8080';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('query');
    const [movieResults, setMovieResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [castResults, setCastResults] = useState([]);
    const [castTotalPages, setCastTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { token, user: currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        setPage(1);
        setActiveFilter('All');
    }, [query]);

    useEffect(() => {
        // Reset results when query changes
        setMovieResults([]);
        setUserResults([]);
        setCastResults([]);
        // setActiveFilter('All'); // Don't reset filter on page change, but maybe on query change?
        // Actually, if query changes, page resets to 1, and this effect runs.
        
        const fetchResults = async () => {
            if (!query) return;
            setLoading(true);
            try {
                const [movieRes, initialUserRes] = await Promise.all([
                    fetch(`${API_BASE_FALLBACK}/api/movies/search/paginated?query=${encodeURIComponent(query)}&page=${page}`),
                    fetch(`${API_BASE_FALLBACK}/api/users/search?query=${encodeURIComponent(query)}`),
                ]);

                if (movieRes.ok) {
                    const data = await movieRes.json();
                    const results = (data.results || []).map(m => ({
                                id: m.id,
                                title: m.title || '',
                                posterUrl: m.posterUrl || (m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null),
                                releaseDate: m.release_date || null,
                                rating5: ((m.vote_average || 0) / 2).toFixed(1)
                            }));
                    const sorted = results.sort((a, b) => {
                        const aPoster = a.posterUrl ? 1 : 0;
                        const bPoster = b.posterUrl ? 1 : 0;
                        if (aPoster !== bPoster) return bPoster - aPoster;
                        const aRating = parseFloat(a.rating5) || 0;
                        const bRating = parseFloat(b.rating5) || 0;
                        return bRating - aRating;
                    });
                    setMovieResults(sorted);
                    // Enrich with director names (from movie details with credits)
                    try {
                        const enriched = await Promise.all(results.map(async (mv) => {
                            try {
                                const detailRes = await fetch(`${API_BASE_FALLBACK}/api/movies/${mv.id}`, {
                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                                });
                                if (detailRes.ok) {
                                    const detail = await detailRes.json();
                                    const crew = (detail.credits && detail.credits.crew) ? detail.credits.crew : [];
                                    const director = crew.find(c => c.job === 'Director');
                                    return { ...mv, directorName: director ? director.name : null };
                                }
                            } catch {
                                console.warn('Failed to fetch credits for movie', mv.id);
                            }
                            return { ...mv, directorName: null };
                        }));
                        setMovieResults(enriched);
                    } catch (e) {
                        console.warn('Failed to enrich movie results', e);
                    }
                    setTotalPages(data.total_pages || 1);
                }
                // Users: handle 401 by retrying with Authorization if token exists
                try {
                    let userRes = initialUserRes;
                    if (userRes.status === 401 && token) {
                        userRes = await fetch(`${API_BASE_FALLBACK}/api/users/search?query=${encodeURIComponent(query)}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    }
                    if (userRes.ok) {
                        const data = await userRes.json();
                        setUserResults(data);
                    } else {
                        setUserResults([]);
                    }
                } catch {
                    setUserResults([]);
                }
                // Cast & Crew: try multiple endpoint patterns to handle backend variations
                try {
                    let castRes = await fetch(`${API_BASE_FALLBACK}/api/movies/people/search/paginated?query=${encodeURIComponent(query)}&page=${page}`);
                    if (castRes.status === 404) {
                        castRes = await fetch(`${API_BASE_FALLBACK}/api/movies/search/people/paginated?query=${encodeURIComponent(query)}&page=${page}`);
                    }
                    if (castRes.status === 404) {
                        castRes = await fetch(`${API_BASE_FALLBACK}/api/movies/search/people?query=${encodeURIComponent(query)}&page=${page}`);
                    }
                    if (castRes.ok) {
                        const data = await castRes.json();
                        const people = (data.results || data || []).map(p => ({
                            id: p.id,
                            name: p.name || '',
                            profileUrl: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
                            knownFor: Array.isArray(p.known_for) ? p.known_for.map(k => k.title || k.name).filter(Boolean).slice(0, 2) : []
                        }));
                        setCastResults(people);
                        setCastTotalPages(data.total_pages || 1);
                    } else {
                        setCastResults([]);
                        setCastTotalPages(1);
                    }
                } catch {
                    setCastResults([]);
                    setCastTotalPages(1);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, token, page]);

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
        const showCast = activeFilter === 'All' || activeFilter === 'Cast';
        
        // Placeholder for other filters
        if (!['All', 'Films', 'Users', 'Cast'].includes(activeFilter)) {
            return <div style={{ color: '#888', fontStyle: 'italic' }}>No results found for {activeFilter} yet.</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* Overall header for All tab */}
                {activeFilter === 'All' && (
                    <h3 style={{
                        borderBottom: '1px solid #333',
                        paddingBottom: '10px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#999'
                    }}>
                        Showing results matching with "{query}"
                    </h3>
                )}
                {/* Movies Section */}
                {showMovies && (
                    <div>
                        {activeFilter !== 'All' && (
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
                        )}
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
                                        {movie.posterUrl ? (
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
                                        ) : (
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '270px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #333',
                                                    background: 'linear-gradient(135deg, #1f2937, #0f172a)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#94a3b8',
                                                    fontSize: '0.95rem',
                                                    textAlign: 'center',
                                                    padding: '8px'
                                                }}
                                                title={movie.title}
                                            >
                                                🎬 {movie.title}
                                            </div>
                                        )}
                                        <div style={{ padding: '10px 0' }}>
                                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#fff' }}>{movie.title}</h3>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                                <span>{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ''}</span>
                                                <span>•</span>
                                                <span>Rating {movie.rating5}/5</span>
                                            </div>
                                            {movie.directorName && (
                                                <div style={{ marginTop: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/movie/${movie.id}/credits`); }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: 0,
                                                            color: '#60a5fa',
                                                            cursor: 'pointer',
                                                            fontSize: '0.9rem',
                                                            textDecoration: 'underline'
                                                        }}
                                                    >
                                                        {movie.directorName}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#666', fontSize: '0.9rem' }}>No films found.</div>
                            )}
                        </div>
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: '8px 16px',
                                        background: page === 1 ? '#333' : '#475569',
                                        color: page === 1 ? '#666' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ color: '#94a3b8' }}>Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{
                                        padding: '8px 16px',
                                        background: page === totalPages ? '#333' : '#475569',
                                        color: page === totalPages ? '#666' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
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

                {/* Cast & Crew Section */}
                {showCast && (
                    <div>
                        {activeFilter !== 'All' && (
                            <h3 style={{ 
                                borderBottom: '1px solid #333', 
                                paddingBottom: '10px', 
                                marginBottom: '20px',
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: '#999'
                            }}>
                                Matches for "{query}" in Cast & Crew
                            </h3>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                            {castResults.length > 0 ? (
                                castResults.map(person => (
                                    <div 
                                        key={person.id}
                                        style={{ 
                                            backgroundColor: 'transparent', 
                                            borderRadius: '4px', 
                                            overflow: 'hidden',
                                            cursor: 'default'
                                        }}
                                    >
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center',
                                            padding: '10px'
                                        }}>
                                            {person.profileUrl ? (
                                                <img 
                                                    src={person.profileUrl} 
                                                    alt={person.name}  
                                                    style={{ 
                                                        width: '120px', 
                                                        height: '120px', 
                                                        objectFit: 'cover',
                                                        borderRadius: '50%',
                                                        border: '1px solid #333'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '120px',
                                                        height: '120px',
                                                        borderRadius: '50%',
                                                        border: '1px solid #333',
                                                        background: 'linear-gradient(135deg, #1f2937, #0f172a)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#94a3b8',
                                                        fontSize: '2.2rem',
                                                        fontWeight: 700
                                                    }}
                                                    title={person.name}
                                                >
                                                    {(person.name || 'U').slice(0,1)}
                                                </div>
                                            )}
                                            <div style={{ paddingTop: '10px', textAlign: 'center' }}>
                                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{person.name}</h3>
                                                {person.knownFor && person.knownFor.length > 0 && (
                                                    <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        Known for: {person.knownFor.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#666', fontSize: '0.9rem' }}>No cast & crew found.</div>
                            )}
                        </div>
                        {castTotalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: '8px 16px',
                                        background: page === 1 ? '#333' : '#475569',
                                        color: page === 1 ? '#666' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ color: '#94a3b8' }}>Page {page} of {castTotalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(castTotalPages, p + 1))}
                                    disabled={page === castTotalPages}
                                    style={{
                                        padding: '8px 16px',
                                        background: page === castTotalPages ? '#333' : '#475569',
                                        color: page === castTotalPages ? '#666' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: page === castTotalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
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
