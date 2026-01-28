import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ProfileOverview = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="profile-meta-details">
        <div className="meta-item">
            <span className="meta-label">Email</span>
            <span className="meta-value">{user.email || 'No email provided'}</span>
        </div>
        {user.gender && (
            <div className="meta-item">
                <span className="meta-label">Gender</span>
                <span className="meta-value">{user.gender}</span>
            </div>
        )}
    </div>
  );
};

export const ProfileFilms = () => (
  <div className="tab-content">
    <h3>Films</h3>
    <p>Films you have watched or rated will appear here.</p>
  </div>
);

export const ProfileDiary = () => (
  <div className="tab-content">
    <h3>Diary</h3>
    <p>Your movie diary entries will appear here.</p>
  </div>
);

export const ProfileReviews = () => (
  <div className="tab-content">
    <h3>Reviews</h3>
    <p>Reviews you have written will appear here.</p>
  </div>
);

export const ProfileWatchlist = () => (
  <div className="tab-content">
    <h3>Watchlist</h3>
    <p>Movies you want to watch will appear here.</p>
  </div>
);

export const ProfileLists = () => (
  <div className="tab-content">
    <h3>Lists</h3>
    <p>Custom lists you have created will appear here.</p>
  </div>
);

export const ProfileLikes = () => (
  <div className="tab-content">
    <h3>Likes</h3>
    <p>Movies and reviews you have liked will appear here.</p>
  </div>
);
