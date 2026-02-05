import React from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import './App.css'
import LandingPage from './components/LandingPage'
import CreateAccount from './components/CreateAccount'
import SignIn from './components/SignIn'
import Profile from './components/Profile'
import HomePage from './components/HomePage'
import UserProfile from './components/UserProfile'
import SearchResults from './components/SearchResults'
import MovieDetails from './components/MovieDetails'
import UserMovieActivity from './components/UserMovieActivity'
import MovieCredits from './components/MovieCredits'
import PersonDetails from './components/PersonDetails'
import OAuthCallback from './components/OAuthCallback'
import { AuthProvider, useAuth } from './context/AuthContext'

import { ProfileOverview, ProfileActivity, ProfileFilms, ProfileDiary, ProfileReviews, ProfileWatchlist, ProfileLists, ProfileLikes } from './components/ProfileTabs'
import FilmsPage from './components/FilmsPage'
import FilmsCategoryPage from './components/FilmsCategoryPage'

function AppContent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigate = (target) => {
    switch (target) {
      case 'landing': navigate('/'); break;
      case 'create-account': navigate('/signup'); break;
      case 'sign-in': navigate('/signin'); break;
      case 'profile': navigate('/profile'); break;
      case 'home': navigate('/home'); break;
      default: navigate('/');
    }
  };

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <LandingPage onNavigate={handleNavigate} user={user} />} />
      <Route path="/signup" element={<CreateAccount onNavigate={handleNavigate} />} />
      <Route path="/signin" element={<SignIn onNavigate={handleNavigate} />} />
      <Route path="/profile" element={<Profile user={user} onNavigate={handleNavigate} />}>
        <Route index element={<ProfileOverview />} />
        <Route path="activity" element={<ProfileActivity />} />
        <Route path="films" element={<ProfileFilms />} />
        <Route path="diary" element={<ProfileDiary />} />
        <Route path="reviews" element={<ProfileReviews />} />
        <Route path="watchlist" element={<ProfileWatchlist />} />
        <Route path="lists" element={<ProfileLists />} />
        <Route path="likes" element={<ProfileLikes />} />
      </Route>
      <Route path="/home" element={<HomePage onNavigate={handleNavigate} user={user} />} />
      <Route path="/films" element={<FilmsPage />} />
      <Route path="/films/:category" element={<FilmsCategoryPage />} />
      <Route path="/user/:id" element={<UserProfile />}>
        <Route index element={<ProfileOverview />} />
        <Route path="activity" element={<ProfileActivity />} />
        <Route path="films" element={<ProfileFilms />} />
        <Route path="diary" element={<ProfileDiary />} />
        <Route path="reviews" element={<ProfileReviews />} />
        <Route path="watchlist" element={<ProfileWatchlist />} />
        <Route path="lists" element={<ProfileLists />} />
        <Route path="likes" element={<ProfileLikes />} />
      </Route>
      <Route path="/movie/:id" element={<MovieDetails />} />
      <Route path="/movie/:id/activity" element={<UserMovieActivity />} />
      <Route path="/movie/:id/credits" element={<MovieCredits />} />
      <Route path="/person/:id" element={<PersonDetails />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
