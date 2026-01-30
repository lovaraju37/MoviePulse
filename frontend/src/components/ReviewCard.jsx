import React, { useState } from 'react';
import { Star, Heart, Repeat } from 'lucide-react';
import './ReviewCard.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

const ReviewCard = ({ review }) => {
  const [showSpoiler, setShowSpoiler] = useState(false);

  if (!review) return null;

  const {
    movieTitle,
    moviePosterPath,
    moviePosterUrl,
    movieYear,
    rating,
    content,
    containsSpoiler,
    likesCount,
    isLiked,
    createdAt,
    watchedDate,
    rewatch,
    isRewatch
  } = review;

  const wasRewatched = rewatch || isRewatch;
  const displayDate = watchedDate || createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const poster = moviePosterPath || moviePosterUrl;

  return (
    <div className="review-card">
      <div className="review-card-poster">
        <img 
          src={poster ? `${IMAGE_BASE_URL}${poster}` : 'https://via.placeholder.com/70x105'} 
          alt={movieTitle} 
        />
      </div>
      
      <div className="review-card-content">
        <div className="review-card-header">
           <h3 className="review-movie-title">
             {movieTitle} <span className="review-movie-year">{movieYear}</span>
           </h3>
           <div className="review-meta">
             <div className="review-rating">
               {[...Array(5)].map((_, i) => (
                 <Star 
                   key={i} 
                   size={14} 
                   fill={i < rating ? "#40bcf4" : "none"} 
                   color={i < rating ? "#40bcf4" : "#678"} 
                   strokeWidth={1.5}
                 />
               ))}
             </div>
             {wasRewatched && (
                <div title="Rewatch" style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                    <Repeat size={14} color="#00e054" strokeWidth={2} />
                </div>
             )}
             {isLiked && <Heart size={14} fill="#ff5c5c" color="#ff5c5c" style={{ marginLeft: '8px' }} />}
             <span className="review-date">Watched on {formattedDate}</span>
           </div>
        </div>

        <div className="review-body">
          {containsSpoiler && !showSpoiler ? (
            <div className="spoiler-warning">
              <p>This review contains spoilers.</p>
              <button className="spoiler-reveal-btn" onClick={() => setShowSpoiler(true)}>
                I can handle the truth (View Spoiler)
              </button>
            </div>
          ) : (
            <div className={`review-text ${containsSpoiler ? 'revealed-spoiler' : ''}`}>
               {content}
            </div>
          )}
        </div>

        <div className="review-card-footer">
           <div className="review-actions">
              <span className="review-likes">{likesCount} likes</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
