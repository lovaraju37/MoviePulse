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
    picture: ''
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
        picture: user.picture || ''
      });
      fetchUserStats();
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
    if (onNavigate) {
      onNavigate(target)
    }
  }

  const handleBack = () => {
    handleNavigate('home');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      let imageUrl = formData.picture;

      // Upload file if selected
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);

        const uploadResponse = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`
           },
           body: uploadFormData
        });

        if (!uploadResponse.ok) {
           const errorText = await uploadResponse.text();
           throw new Error(errorText || 'Failed to upload image');
        }
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      const response = await fetch(`${API_BASE_URL}/auth/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        <div className="profile-nav-header">
          <button className="back-link" type="button" onClick={handleBack}>
            ← Back to Home
          </button>
        </div>

        {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}

        {isEditing ? (
          <div className="account-form">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Edit Profile</h2>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <img 
                    src={formData.picture || user.picture || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                    alt="Profile Preview" 
                    className="profile-avatar-large"
                    style={{ width: '100px', height: '100px' }}
                />
            </div>

            <label>
              Profile Picture
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        setSelectedFile(file);
                        setFormData({...formData, picture: URL.createObjectURL(file)});
                    }
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#e2e8f0',
                  marginTop: '8px'
                }}
              />
            </label>
            <label>
              Name
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </label>
            <label>
              Bio / About
              <textarea 
                className="profile-input"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
              />
            </label>
            <label>
              Gender
              <select 
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#e2e8f0',
                  marginTop: '8px'
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>

            <div className="edit-actions">
              <button className="cta-btn cancel-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="cta-btn" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div>
              <div className="profile-slim-header" style={!isProfileOverview ? { justifyContent: 'flex-start' } : {}}>
                <div className="profile-slim-header-left">
                  <img 
                    src={formData.picture || user.picture || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                    alt={user.name} 
                    className="profile-slim-avatar" 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span className="profile-slim-username" style={!isProfileOverview ? { marginBottom: 0 } : {}}>{user.name}</span>
                      {isProfileOverview && (
                        <button className="edit-profile-btn" onClick={() => setIsEditing(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                          Edit
                        </button>
                      )}
                    </div>
                    {isProfileOverview && (
                      <div className="profile-stats">
                        <span className="stat-item">{userStats.followersCount} followers</span>
                        <span className="stat-item">{userStats.followingCount} following</span>
                        <span className="stat-item">{userStats.filmsCount} films</span>
                        <span className="stat-item">{userStats.listsCount} lists</span>
                        <span className="stat-item">{userStats.thisYearCount} this year</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="profile-slim-nav" style={!isProfileOverview ? { marginLeft: '30px' } : {}}>
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