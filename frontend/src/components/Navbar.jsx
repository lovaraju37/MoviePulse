import React, { useState, useRef, useEffect, useMemo } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import "./LandingPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_FALLBACK = API_BASE_URL || 'http://localhost:8080';

const SearchBar = ({ navigate, token, initialQuery, initialIsOpen }) => {
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(initialIsOpen);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!isFocused) {
                setShowSearchResults(false);
                return;
            }
            if (searchQuery.length > 0) {
                try {
                    const response = await fetch(
                        `${API_BASE_FALLBACK}/api/movies/search?query=${encodeURIComponent(searchQuery)}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        const rawResults = Array.isArray(data) ? data : (data && data.results) ? data.results : [];
                        const filtered = rawResults
                            .filter(m => (m.poster_path || m.posterUrl) && (m.vote_count || 0) >= 20)
                            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                        const mapped = filtered.slice(0, 7).map(m => {
                            const year = m.release_date ? new Date(m.release_date).getFullYear() : '';
                            const rating5 = ((m.vote_average || 0) / 2).toFixed(1);
                            return {
                                id: m.id,
                                title: m.title || m.name || '',
                                posterUrl: m.posterUrl || (m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : null),
                                year,
                                rating5
                            };
                        });
                        setSearchResults(mapped);
                        setShowSearchResults(mapped.length > 0);
                    }
                } catch (err) {
                    console.error("Search failed", err);
                }
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSuggestions();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, token, isFocused]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const executeSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
            setShowSearchResults(false);
            setIsFocused(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    };

    const handleSuggestionClick = (movieId) => {
        navigate(`/movie/${movieId}`);
        setShowSearchResults(false);
        setIsFocused(false);
    };

    return (
        <div className="search-container" ref={searchRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {!isSearchOpen ? (
                <button
                    onClick={() => setIsSearchOpen(true)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                    </svg>
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            setShowSearchResults(false);
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ccc',
                            cursor: 'pointer',
                            padding: '8px',
                            marginRight: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '1.2rem'
                        }}
                        title="Close search"
                    >
                        ✕
                    </button>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '5px 15px',
                        width: '250px',
                        transition: 'width 0.3s ease'
                    }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            autoFocus
                            style={{
                                border: 'none',
                                outline: 'none',
                                backgroundColor: 'transparent',
                                color: '#333',
                                width: '100%',
                                fontSize: '14px'
                            }}
                        />
                        <button
                            onClick={executeSearch}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 0,
                                marginLeft: '5px'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {showSearchResults && searchResults.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '250px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    marginTop: '10px'
                }}>
                    {searchResults.map(result => (
                        <div
                            key={result.id}
                            onClick={() => handleSuggestionClick(result.id)}
                            style={{
                                padding: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                borderBottom: '1px solid #333'
                            }}
                        >
                            <img
                                src={result.posterUrl || "https://via.placeholder.com/30"}
                                alt={result.title}
                                style={{ width: '30px', height: '45px', objectFit: 'cover', marginRight: '10px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#fff' }}>{result.title}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                    {result.year ? result.year : ''}{result.year && ' • '}Rating {result.rating5}/5
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Navbar = () => {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const timeoutRef = useRef(null);

    const queryFromUrl = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('query') || '';
    }, [location.search]);

    const searchBarKey = useMemo(() => `search-${location.search || 'root'}`, [location.search]);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);
    const stompClientRef = useRef(null);

    useEffect(() => {
        if (!user || !token) return;

        let isMounted = true;

        const loadNotifications = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setNotifications(data);
                        setUnreadCount(data.filter(n => !n.isRead).length);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };

        loadNotifications();

        const socket = new SockJS('http://localhost:8080/ws');
        const stompClient = Stomp.over(socket);
        stompClient.debug = null; // Disable debug logs

        const connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        stompClient.connect(connectHeaders, () => {
            stompClient.subscribe('/user/queue/notifications', (message) => {
                const notification = JSON.parse(message.body);
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            });
        }, (error) => {
            console.error('STOMP error', error);
        });

        stompClientRef.current = stompClient;

        return () => {
            isMounted = false;
            if (stompClientRef.current) {
                try {
                    if (stompClientRef.current.connected) {
                        stompClientRef.current.disconnect(() => {
                            stompClientRef.current = null;
                        });
                    } else {
                        stompClientRef.current = null;
                    }
                } catch (err) {
                    console.warn('Error while disconnecting STOMP client', err);
                    stompClientRef.current = null;
                }
            }
        };
    }, [token, user]);

    // Close dropdown/notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const markAsRead = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const handleNotificationClick = (e, notif) => {
        e.stopPropagation();

        if (!notif.isRead) {
            markAsRead(notif.id);
        }

        if (notif.senderId) {
            if (user && String(user.id) === String(notif.senderId)) {
                navigate('/profile');
            } else {
                navigate(`/user/${notif.senderId}`);
            }
            setShowNotifications(false);
        }
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setShowDropdown(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setShowDropdown(false);
        }, 300);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="nav-left">
                <div className="logo" onClick={() => navigate(user ? '/home' : '/')} style={{ cursor: 'pointer' }}>MoviePulse</div>
                <div className="nav-links">
                    <button className="nav-link" type="button" onClick={() => navigate('/films')}>Films</button>
                    <button className="nav-link" type="button">Lists</button>
                </div>
            </div>

            <div className="nav-right">
                <div className="user-section">
                    {user ? (
                        <div
                            className="user-menu-container"
                            ref={dropdownRef}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <div className="user-trigger">
                                <img
                                    src={user?.picture || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                                    alt="User"
                                    className="user-avatar"
                                />
                                <span className="user-name">{user?.name || "User"}</span>
                                <span className="dropdown-caret">▼</span>
                            </div>

                            {showDropdown && (
                                <div className="dropdown-menu">
                                    <div className="dropdown-item" onClick={() => navigate('/home')}>Home</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile')}>Profile</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile/films')}>Films</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile/diary')}>Diary</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile/reviews')}>Reviews</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile/watchlist')}>Watchlist</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile/lists')}>Lists</div>
                                    <div className="dropdown-item" onClick={() => navigate('/profile/likes')}>Likes</div>
                                    <div className="dropdown-divider"></div>
                                    <div className="dropdown-item logout" onClick={handleLogout}>Logout</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <button 
                                className="nav-link" 
                                onClick={() => navigate('/signin')}
                                style={{ fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}
                            >
                                SIGN IN
                            </button>
                            <button 
                                className="cta-primary" 
                                onClick={() => navigate('/signup')}
                                style={{ 
                                    fontSize: '0.8rem', 
                                    padding: '8px 24px',
                                    boxShadow: 'none',
                                    marginTop: 0
                                }}
                            >
                                CREATE ACCOUNT
                            </button>
                        </div>
                    )}
                </div>

                {user && (
                    <div className="notification-bell" ref={notifRef} onClick={() => setShowNotifications(!showNotifications)} style={{cursor: 'pointer', position: 'relative'}}>
                        <span className="bell-icon">🔔</span>
                        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                        
                        {showNotifications && (
                            <div className="notifications-dropdown" style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                width: '300px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                zIndex: 1000,
                                maxHeight: '400px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{padding: '10px', borderBottom: '1px solid #333', fontWeight: 'bold'}}>Notifications</div>
                                {notifications.length === 0 ? (
                                    <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>No notifications</div>
                                ) : (
                                    notifications.map(notif => (
                                        <div 
                                            key={notif.id} 
                                            onClick={(e) => handleNotificationClick(e, notif)}
                                            style={{
                                                padding: '10px',
                                                borderBottom: '1px solid #333',
                                                backgroundColor: notif.isRead ? 'transparent' : '#2a2a2a',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{fontSize: '0.9em'}}>{notif.message}</div>
                                            <div style={{fontSize: '0.7em', color: '#888', marginTop: '4px'}}>
                                                {new Date(notif.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                <SearchBar
                    key={searchBarKey}
                    navigate={navigate}
                    token={token}
                    initialQuery={queryFromUrl}
                    initialIsOpen={Boolean(queryFromUrl)}
                />
            </div>
        </nav>
    );
};

export default Navbar;
