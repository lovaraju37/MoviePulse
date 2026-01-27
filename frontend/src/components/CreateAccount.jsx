import React, { useState } from 'react';
import "./CreateAccount.css";
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CreateAccount = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

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

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Registration failed');
      }

      const data = await response.json();
      if (data.token) {
        login(data.token);
        onNavigate('home');
      } else {
        // Fallback if no token is returned (shouldn't happen with updated backend)
        onNavigate('sign-in');
      }
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
          <h1>Create your MoviePulse account</h1>
          <p>Start sharing your thoughts on every film you watch.</p>
        </div>

        {error && <p style={{color: 'red'}}>{error}</p>}

        <form className="account-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input 
              type="text" 
              placeholder="Your Name" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
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
          <label>
            Repeat Password
            <input 
              type="password" 
              placeholder="Repeat password" 
              required 
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </label>

          <label className="terms-check">
            <input type="checkbox" required />
            <span>I agree to the terms and confirm I am over 13 years old.</span>
          </label>

          <button className="cta-btn" type="submit">
            Create Account
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
          Already have an account? <button type="button" className="link-btn" onClick={() => onNavigate('sign-in')}>Sign In</button>
        </p>
      </div>
    </div>
  );
};

export default CreateAccount;