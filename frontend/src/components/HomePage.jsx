import React from 'react';
import Navbar from './Navbar';
import "./LandingPage.css"; // Reusing LandingPage styles for consistency

const HomePage = ({ user }) => {
  return (
    <div className="landing-container">
      <Navbar />

      {/* Main Content */}
      <main className="main-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', color: '#fff', marginBottom: '1rem' }}>
            Welcome, {user?.name || "Movie Lover"}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>
            Your personal movie journey starts here.
          </p>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
