import React, { useState } from 'react';
import "./CreateAccount.css";
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SignIn = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('landing');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      login(data.token);
      onNavigate('home');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="account-wrapper">
      <div className="account-card">
        <div className="account-header">
          <button className="back-link" type="button" onClick={handleBack}>
            ← Back to Home
          </button>
          <h1>Welcome Back</h1>
          <p>Sign in to continue your movie journey.</p>
        </div>

        {error && <p style={{color: 'red'}}>{error}</p>}

        <form className="account-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input 
              type="email" 
              placeholder="you@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input 
              type="password" 
              placeholder="Enter password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="cta-btn" type="submit">
            Sign In
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <button type="button" className="social google" aria-label="Continue with Google" onClick={handleGoogleLogin}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
          </button>
          <button type="button" className="social github" aria-label="Continue with GitHub">
            <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="GitHub" />
          </button>
        </div>

        <p className="auth-switch">
          Don't have an account? <button type="button" className="link-btn" onClick={() => onNavigate('create-account')}>Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export default SignIn;