import React, { useState, useRef } from 'react';
import { X, Star, Heart } from 'lucide-react';
import MoviePoster from './MoviePoster';
import './ReviewModal.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const ReviewModal = (props) => {
  if (!props.movie) return null;
  return <ReviewForm {...props} />;
};

const ReviewForm = ({ onClose, movie, onSave, initialData, onLikeChange }) => {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [watchedDate, setWatchedDate] = useState(
    initialData?.watchedDate || getTodayString()
  );
  const [isWatched, setIsWatched] = useState(
    initialData?.isWatched !== undefined ? initialData.isWatched : true
  );
  const [isRewatch, setIsRewatch] = useState(initialData?.isRewatch || false);
  const [containsSpoiler, setContainsSpoiler] = useState(
    initialData?.containsSpoiler || false
  );
  const [review, setReview] = useState(initialData?.review || '');
  const [tags, setTags] = useState(
    initialData?.tags
      ? Array.isArray(initialData.tags)
        ? initialData.tags
        : initialData.tags.split(',')
      : []
  );
  const [tagInput, setTagInput] = useState('');
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isLiked, setIsLiked] = useState(initialData?.isLiked || false);
  const dateInputRef = useRef(null);

  const handleSave = () => {
    const reviewData = {
      movieId: movie.id,
      watchedDate,
      isWatched,
      isRewatch,
      containsSpoiler,
      review,
      tags,
      rating: parseFloat(rating),
      isLiked
    };
    if (onSave) {
        onSave(reviewData);
    }
    onClose();
  };

  const formattedDate = (() => {
    if (!watchedDate) return '';
    const [y, m, d] = watchedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  })();

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

  const handleTagKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleStarMouseMove = (e, starIndex) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const isLeftHalf = x < width / 2;
    setHoverRating(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  const renderStar = (starIndex) => {
    const currentRating = hoverRating || parseFloat(rating);
    const isFull = currentRating >= starIndex;
    const isHalf = currentRating >= starIndex - 0.5 && currentRating < starIndex;
    
    return (
        <div 
            key={starIndex}
            className="review-star"
            onMouseMove={(e) => handleStarMouseMove(e, starIndex)}
            onClick={() => {
                setRating(hoverRating);
                if (hoverRating > 0) setIsWatched(true);
            }}
            style={{ padding: '2px' }}
        >
            <div style={{ position: 'relative', pointerEvents: 'none' }}>
                {/* Background Star (Empty) */}
                <Star 
                    size={24} 
                    color="#678"
                    strokeWidth={1.5}
                />
                
                {/* Filled Star Overlay */}
                {(isFull || isHalf) && (
                    <div style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: isFull ? '100%' : '50%', 
                        overflow: 'hidden' 
                    }}>
                        <Star 
                            size={24} 
                            fill="#00e054" 
                            color="#00e054"
                            strokeWidth={1.5}
                        />
                    </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal-content" onClick={e => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2 className="review-modal-title">I watched...</h2>
          <button className="review-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="review-modal-body">
          <div className="review-modal-poster">
            <MoviePoster 
                movie={movie}
                isLiked={isLiked}
                isWatched={isWatched}
                onLikeToggle={() => setIsLiked(!isLiked)}
                onWatchToggle={() => setIsWatched(!isWatched)}
                showTitleTooltip={false}
                style={{ width: '100%', height: '100%' }}
            />
          </div>

          <div className="review-modal-form">
            <div>
              <span className="review-movie-title">{movie.title}</span>
              <span className="review-movie-year">{releaseYear}</span>
            </div>

            <div className="review-controls-row">
              <div className="review-control-group">
                <input 
                  type="checkbox" 
                  checked={isWatched} 
                  onChange={(e) => setIsWatched(e.target.checked)}
                  id="watched-check"
                />
                <label htmlFor="watched-check">Watched on</label>
                <span 
                  className="review-date-display"
                  onClick={() => dateInputRef.current?.showPicker()}
                  style={{ cursor: 'pointer' }}
                >
                  {formattedDate}
                </span>
                <input 
                  type="date"
                  ref={dateInputRef}
                  value={watchedDate}
                  max={getTodayString()}
                  onChange={(e) => setWatchedDate(e.target.value)}
                  style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0 }}
                />
              </div>

              <div className="review-control-group">
                <input 
                  type="checkbox" 
                  checked={isRewatch} 
                  onChange={(e) => setIsRewatch(e.target.checked)}
                  id="rewatch-check"
                />
                <label htmlFor="rewatch-check">I've watched this before</label>
              </div>

              <div className="review-control-group">
                <input 
                  type="checkbox" 
                  checked={containsSpoiler} 
                  onChange={(e) => setContainsSpoiler(e.target.checked)}
                  id="spoiler-check"
                />
                <label htmlFor="spoiler-check">Contains spoilers</label>
              </div>
            </div>

            <textarea 
              className="review-textarea" 
              placeholder="Add a review..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />

            <div className="review-bottom-row">
              <div className="review-tags-group">
                <label className="review-tags-label">
                  Tags <span className="review-tags-hint">Press Tab to complete, Enter to create</span>
                </label>
                <div className="review-tags-container">
                  {tags.map((tag, index) => (
                    <div key={index} className="review-tag-chip">
                      {tag}
                      <X 
                        size={14} 
                        className="review-tag-remove"
                        onClick={() => removeTag(tag)}
                      />
                    </div>
                  ))}
                  <input 
                    type="text" 
                    className="review-tags-input" 
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                </div>
              </div>

              <div className="review-rating-group">
                <div className="review-rating-label">
                    <span>Rating</span>
                </div>
                <div className="review-rating-input-container">
                    <input 
                        type="number" 
                        min="0" 
                        max="5" 
                        step="0.1"
                        inputMode="decimal"
                        value={rating}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 5)) {
                                setRating(val);
                                if (parseFloat(val) > 0) {
                                    setIsWatched(true);
                                }
                            }
                        }}
                        onBlur={() => {
                            if (rating === '') setRating(0);
                            else setRating(parseFloat(rating));
                        }}
                        className="review-rating-number"
                    />
                    <span className="review-rating-max">/ 5</span>
                </div>
                <div className="review-stars" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((star) => renderStar(star))}
                </div>
              </div>

              <div className="review-like-group">
                <label className="review-like-label">Like</label>
                <button 
                    className="review-like-btn"
                    onClick={() => {
                        const newState = !isLiked;
                        setIsLiked(newState);
                        if (onLikeChange) onLikeChange(newState);
                    }}
                >
                    <Heart 
                        size={28} 
                        fill={isLiked ? "#ff5c5c" : "none"} 
                        color={isLiked ? "#ff5c5c" : "#678"} 
                        strokeWidth={1.5}
                    />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="review-modal-footer">
          <button className="review-save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
