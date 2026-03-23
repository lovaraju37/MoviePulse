import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import './Profile.css'; // Reusing Profile styles

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, [id, token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('User not found');
      const data = await response.json();
      setProfileUser(data);
      setIsFollowing(data.isFollowing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(`${API_BASE_URL}/api/users/${id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setIsFollowing(!isFollowing);
        // Refresh profile to update counts
        fetchUserProfile();
      }
    } catch (err) {
      console.error("Failed to toggle follow", err);
    }
  };

  const handleBack = () => {
      navigate(-1);
  };

  if (loading) return <div className="profile-container">Loading...</div>;
  if (error) return <div className="profile-container">Error: {error}</div>;
  if (!profileUser) return null;

  // Debug logic: if names match, assume it's the same user if ID check fails (fallback)
  const isOwnProfile = (currentUser && profileUser) && (
    String(currentUser.id) === String(profileUser.id) || 
    (currentUser.name === profileUser.name && currentUser.picture === profileUser.picture)
  );

  return (
    <div className="landing-container">
      <Navbar />
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="profile-container">
        <div className="profile-nav-header">
          <button className="back-link" onClick={handleBack}>← Back</button>
        </div>

        <div className="profile-header-section">
            <div className="profile-left-col">
                <div className="profile-avatar-section">
                  <img 
                    src={profileUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name || 'User')}&background=2c3440&color=9ab&size=128`} 
                    alt="Profile" 
                    className="profile-avatar-large"
                    onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name || 'User')}&background=2c3440&color=9ab&size=128`; }}
                  />
                </div>
                
                <div className="profile-info-section">
                    <div className="profile-name-row">
                        <h1 className="profile-name">{profileUser.name}</h1>
                        {isOwnProfile ? (
                            <button className="edit-profile-btn" onClick={() => navigate('/profile')}>
                                EDIT PROFILE
                            </button>
                        ) : !currentUser ? (
                            <button 
                                className="edit-profile-btn" 
                                onClick={() => navigate('/signin')}
                                style={{
                                    backgroundColor: '#3b82f6', 
                                    color: '#fff'
                                }}
                            >
                                Sign in to follow
                            </button>
                        ) : (
                            <button 
                                className="edit-profile-btn" 
                                onClick={handleFollow}
                                style={{
                                    backgroundColor: isFollowing ? '#475569' : '#3b82f6', 
                                    color: '#fff'
                                }}
                            >
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                        <button className="more-options-btn" title="More options">•••</button>
                    </div>
                    {/* Bio removed from here to match the image layout roughly, or kept? 
                        The image shows name and buttons side-by-side. 
                        I'll keep bio below the name row as in Profile.jsx */}
                    <p className="profile-bio" style={{margin: '0.5rem 0 0 0', fontSize: '1rem'}}>{profileUser.bio || "No bio yet."}</p>
                </div>
            </div>

            <div className="profile-stats-section">
                <div className="stat-item">
                    <span className="stat-value">{profileUser.filmsCount || 0}</span>
                    <span className="stat-label">Films</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{profileUser.thisYearCount || 0}</span>
                    <span className="stat-label">This Year</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{profileUser.listsCount || 0}</span>
                    <span className="stat-label">Lists</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{profileUser.followingCount}</span>
                    <span className="stat-label">Following</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{profileUser.followersCount}</span>
                    <span className="stat-label">Followers</span>
                </div>
            </div>
        </div>

        <div className="profile-slim-nav" style={{ marginTop: '20px', borderBottom: '1px solid #333' }}>
           <NavLink to="" end className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Profile</NavLink>
           <NavLink to="activity" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Activity</NavLink>
           <NavLink to="films" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Films</NavLink>
           <NavLink to="diary" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Diary</NavLink>
           <NavLink to="reviews" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Reviews</NavLink>
           <NavLink to="watchlist" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Watchlist</NavLink>
           <NavLink to="lists" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Lists</NavLink>
           <NavLink to="likes" className={({ isActive }) => `profile-slim-nav-item ${isActive ? 'active' : ''}`}>Likes</NavLink>
        </div>

        <div className="profile-content-area" style={{ marginTop: '20px' }}>
            <Outlet context={{ user: profileUser }} />
        </div>
      </div>
      </main>
    </div>
  );
};

export default UserProfile;
