import React, { useState, useEffect, useRef, useCallback } from 'react';

import './CreateAccount.css';
import './Profile.css';
import './LandingPage.css';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Profile = ({ onNavigate }) => {
  const { user, updateUser, token } = useAuth();
  const location = useLocation();
  const isProfileOverview = location.pathname === '/profile' || location.pathname === '/profile/';
  const userId = user?.id;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    gender: '',
    picture: '',
    location: '',
    website: ''
  });
  const [userStats, setUserStats] = useState({
    followersCount: 0,
    followingCount: 0,
    filmsCount: 0,
    listsCount: 0,
    thisYearCount: 0
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [favPickerOpen, setFavPickerOpen] = useState(false);
  const [favPickerSlot, setFavPickerSlot] = useState(null);
  const [favSearch, setFavSearch] = useState('');
  const [favSearchResults, setFavSearchResults] = useState([]);
  const [favSearchLoading, setFavSearchLoading] = useState(false);
  const stompClientRef = useRef(null);

  const fetchUserStats = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
          const data = await response.json();
          setUserStats(prev => ({
              ...prev,
              followersCount: data.followersCount || 0,
              followingCount: data.followingCount || 0,
              filmsCount: data.filmsCount || 0,
              listsCount: data.listsCount || 0,
              thisYearCount: data.thisYearCount || 0
          }));
      }
    } catch (err) {
      console.error("Failed to fetch user stats", err);
    }
  }, [token, userId]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        gender: user.gender || '',
        picture: user.picture || '',
        location: user.location || '',
        website: user.website || ''
      });
      fetchUserStats();
      // Load existing favorites
      fetch(`${API_BASE_URL}/api/users/${user.id}/favorites`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(r => r.ok ? r.json() : [])
      .then(ids => {
        if (!ids.length) return;
        Promise.all(ids.map(mid =>
          fetch(`${API_BASE_URL}/api/movies/${mid}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(r => r.ok ? r.json() : null)
        )).then(movies => setFavoriteMovies(movies.filter(Boolean)));
      });
    }
  }, [user, fetchUserStats]);

  // Real-time updates for followers
  useEffect(() => {
    if (!user || !token) return;

    const socket = new SockJS('http://localhost:8080/ws');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({ Authorization: `Bearer ${token}` }, () => {
        stompClient.subscribe('/user/queue/notifications', (message) => {
            const notification = JSON.parse(message.body);
            if (notification.type === 'FOLLOW') {
                // If someone follows us, increment followers count
                setUserStats(prev => ({
                    ...prev,
                    followersCount: prev.followersCount + 1
                }));
            }
        });
    }, (error) => {
        console.error('STOMP error in Profile', error);
    });

    stompClientRef.current = stompClient;

    return () => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.disconnect();
        }
    };
  }, [user, token]);

  const handleNavigate = (target) => {
    if (onNavigate) onNavigate(target);
  };

  const handleBack = () => handleNavigate('home');

  // Fav picker search
  useEffect(() => {
    if (!favSearch.trim()) { setFavSearchResults([]); return; }
    const t = setTimeout(() => {
      setFavSearchLoading(true);
      fetch(`${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(favSearch)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFavSearchResults(data.slice(0, 8)); setFavSearchLoading(false); })
      .catch(() => setFavSearchLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [favSearch]);

  const openFavPicker = (slot) => {
    setFavPickerSlot(slot);
    setFavSearch('');
    setFavSearchResults([]);
    setFavPickerOpen(true);
  };

  const pickFavMovie = (movie) => {
    const updated = [...favoriteMovies];
    // Remove if already in list
    const existing = updated.findIndex(m => String(m.id) === String(movie.id));
    if (existing !== -1) updated.splice(existing, 1);
    if (favPickerSlot !== null && favPickerSlot < updated.length) {
      updated[favPickerSlot] = movie;
    } else {
      updated[favPickerSlot] = movie;
    }
    setFavoriteMovies(updated.slice(0, 4));
    setFavPickerOpen(false);
  };

  const removeFav = (idx) => {
    setFavoriteMovies(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      let imageUrl = formData.picture;

      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        const uploadResponse = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}` },
           body: uploadFormData
        });
        if (!uploadResponse.ok) throw new Error(await uploadResponse.text() || 'Failed to upload image');
        imageUrl = (await uploadResponse.json()).url;
      }

      // Save favorites
      await fetch(`${API_BASE_URL}/api/users/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ movieIds: favoriteMovies.map(m => String(m.id)) })
      });

      const response = await fetch(`${API_BASE_URL}/auth/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, picture: imageUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);
      setIsEditing(false);
      setSelectedFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="account-wrapper">
        <div className="account-card">
          <h1>Please Log In</h1>
          <button className="cta-btn" onClick={() => handleNavigate('sign-in')}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-container">
      {/* Navbar */}
      <Navbar />

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="profile-container">
        {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}

        {isEditing ? (
          <>
          <div className="edit-profile-page">
            <div className="edit-profile-left">
              <h2 className="edit-profile-heading">Profile</h2>

              <div className="edit-field">
                <label className="edit-label">Avatar</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={formData.picture || user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2c3440&color=9ab&size=128`}
                    alt="avatar"
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2d3748' }}
                    onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2c3440&color=9ab&size=128`; }}
                  />
                  <label className="edit-upload-btn">
                    Change
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) { setSelectedFile(file); setFormData({...formData, picture: URL.createObjectURL(file)}); }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="edit-field">
                <label className="edit-label">Name</label>
                <input className="edit-input" type="text" value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="edit-field">
                <label className="edit-label">Email address</label>
                <input className="edit-input" type="text" value={user.email || ''} disabled style={{ opacity: 0.5 }} />
              </div>

              <div className="edit-row">
                <div className="edit-field">
                  <label className="edit-label">Location</label>
                  <input className="edit-input" type="text" value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="City, Country" />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Website</label>
                  <input className="edit-input" type="text" value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://" />
                </div>
              </div>

              <div className="edit-field">
                <label className="edit-label">Bio</label>
                <textarea className="edit-input edit-textarea" rows={4} value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about yourself..." />
              </div>

              <div className="edit-field">
                <label className="edit-label">Pronoun</label>
                <select className="edit-input" value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                  <option value="">Select</option>
                  <option value="He / his">He / his</option>
                  <option value="She / her">She / her</option>
                  <option value="They / their">They / their</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {formData.gender && (
                  <span className="edit-pronoun-example">
                    Example use: <strong>{user.name}</strong> added <strong>Pride</strong> to <strong>{formData.gender.split('/')[1]?.trim() || 'their'}</strong> watchlist
                  </span>
                )}
              </div>

              {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}

              <div className="edit-actions">
                <button className="edit-cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="edit-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="edit-profile-right">
              <div className="edit-field">
                <label className="edit-label">FAVORITE FILMS</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                  {[...Array(4)].map((_, i) => {
                    const movie = favoriteMovies[i];
                    return (
                      <div key={i} className="fav-slot" onClick={() => openFavPicker(i)}>
                        {movie ? (
                          <>
                            <img
                              src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                              alt={movie.title}
                              className="fav-slot-poster"
                            />
                            <button className="fav-slot-remove" onClick={(e) => { e.stopPropagation(); removeFav(i); }}>×</button>
                          </>
                        ) : (
                          <span className="fav-slot-plus">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '8px' }}>Click a slot to pick a film.</p>
              </div>
            </div>
          </div>

          {/* Fav Picker Modal */}
          {favPickerOpen && (
            <div className="fav-picker-overlay" onClick={() => setFavPickerOpen(false)}>
              <div className="fav-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="fav-picker-header">
                  <span className="fav-picker-title">PICK A FAVORITE FILM</span>
                  <button className="fav-picker-close" onClick={() => setFavPickerOpen(false)}>×</button>
                </div>
                <label className="fav-picker-label">Name of Film</label>
                <input
                  className="fav-picker-input"
                  autoFocus
                  placeholder="Search..."
                  value={favSearch}
                  onChange={e => setFavSearch(e.target.value)}
                />
                {favSearchLoading && <p className="fav-picker-hint">Searching...</p>}
                {favSearchResults.length > 0 && (
                  <div className="fav-picker-results">
                    {favSearchResults.map(m => (
                      <div key={m.id} className="fav-picker-result-row" onClick={() => pickFavMovie(m)}>
                        {m.poster_path
                          ? <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} className="fav-picker-result-poster" />
                          : <div className="fav-picker-result-poster fav-picker-no-poster" />
                        }
                        <div>
                          <div className="fav-picker-result-title">{m.title}</div>
                          <div className="fav-picker-result-year">{m.release_date?.substring(0, 4)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </>
        ) : (
          <div>
          <div className={`profile-slim-header ${!isProfileOverview ? 'profile-slim-header--compact' : ''}`}>
                {isProfileOverview ? (
                  <>
                    <div className="profile-slim-header-top">
                      <div className="profile-slim-left">
                        <img 
                          src={formData.picture || user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2c3440&color=9ab&size=128`} 
                          alt={user.name} 
                          className="profile-slim-avatar"
                          onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2c3440&color=9ab&size=128`; }}
                        />
                        <div className="profile-slim-info">
                          <div className="profile-slim-name-row">
                            <NavLink to="/profile" end className="profile-slim-username">{user.name}</NavLink>
                            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                          </div>
                          {user.bio && <p className="profile-slim-bio">{user.bio}</p>}
                        </div>
                      </div>
                      <div className="profile-slim-stats">
                        <div className="profile-slim-stat">
                          <span className="profile-slim-stat-value">{userStats.filmsCount}</span>
                          <span className="profile-slim-stat-label">Films</span>
                        </div>
                        <div className="profile-slim-stat">
                          <span className="profile-slim-stat-value">{userStats.thisYearCount}</span>
                          <span className="profile-slim-stat-label">This Year</span>
                        </div>
                        <div className="profile-slim-stat">
                          <span className="profile-slim-stat-value">{userStats.listsCount}</span>
                          <span className="profile-slim-stat-label">Lists</span>
                        </div>
                        <div className="profile-slim-stat">
                          <span className="profile-slim-stat-value">{userStats.followingCount}</span>
                          <span className="profile-slim-stat-label">Following</span>
                        </div>
                        <div className="profile-slim-stat">
                          <span className="profile-slim-stat-value">{userStats.followersCount}</span>
                          <span className="profile-slim-stat-label">Followers</span>
                        </div>
                      </div>
                    </div>
                    <div className="profile-slim-nav">
                      <NavLink to="/profile" end className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Profile</NavLink>
                      <NavLink to="/profile/activity" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Activity</NavLink>
                      <NavLink to="/profile/films" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Films</NavLink>
                      <NavLink to="/profile/diary" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Diary</NavLink>
                      <NavLink to="/profile/reviews" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Reviews</NavLink>
                      <NavLink to="/profile/watchlist" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Watchlist</NavLink>
                      <NavLink to="/profile/lists" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Lists</NavLink>
                      <NavLink to="/profile/likes" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Likes</NavLink>
                    </div>
                  </>
                ) : (
                  <div className="profile-slim-compact-row">
                    <div className="profile-slim-compact-left">
                      <img 
                        src={formData.picture || user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2c3440&color=9ab&size=128`} 
                        alt={user.name} 
                        className="profile-slim-avatar profile-slim-avatar--sm"
                        onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2c3440&color=9ab&size=128`; }}
                      />
                      <NavLink to="/profile" end className="profile-slim-username">{user.name}</NavLink>
                    </div>
                    <div className="profile-slim-nav profile-slim-nav--inline">
                      <NavLink to="/profile" end className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Profile</NavLink>
                      <NavLink to="/profile/activity" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Activity</NavLink>
                      <NavLink to="/profile/films" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Films</NavLink>
                      <NavLink to="/profile/diary" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Diary</NavLink>
                      <NavLink to="/profile/reviews" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Reviews</NavLink>
                      <NavLink to="/profile/watchlist" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Watchlist</NavLink>
                      <NavLink to="/profile/lists" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Lists</NavLink>
                      <NavLink to="/profile/likes" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Likes</NavLink>
                    </div>
                  </div>
                )}
              </div>

            <div className="profile-content-area">
                <Outlet />
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
};

export default Profile;