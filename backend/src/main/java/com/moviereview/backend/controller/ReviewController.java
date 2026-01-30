package com.moviereview.backend.controller;

import com.moviereview.backend.model.Like;
import com.moviereview.backend.model.Review;
import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.LikeRepository;
import com.moviereview.backend.repository.ReviewRepository;
import com.moviereview.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;

    public ReviewController(ReviewRepository reviewRepository, UserRepository userRepository,
            LikeRepository likeRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createReview(@RequestBody Map<String, Object> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String movieId = String.valueOf(payload.get("movieId"));
        List<Review> existingReviews = reviewRepository.findAllByUserIdAndMovieId(user.getId(), movieId);
        Review review;

        if (!existingReviews.isEmpty()) {
            review = existingReviews.get(0);
            // Optional: cleanup duplicates if any
            if (existingReviews.size() > 1) {
                for (int i = 1; i < existingReviews.size(); i++) {
                    reviewRepository.delete(existingReviews.get(i));
                }
            }
        } else {
            review = new Review();
            review.setUser(user);
            review.setMovieId(movieId);
        }

        review.setMovieTitle((String) payload.get("movieTitle"));
        review.setMovieYear((String) payload.get("movieYear"));
        review.setMoviePosterUrl((String) payload.get("moviePosterUrl"));
        review.setContent((String) payload.get("review"));

        Object ratingObj = payload.get("rating");
        if (ratingObj instanceof Number) {
            review.setRating(((Number) ratingObj).doubleValue());
        }

        review.setRewatch((Boolean) payload.getOrDefault("isRewatch", false));
        review.setContainsSpoiler((Boolean) payload.getOrDefault("containsSpoiler", false));

        String watchedDateStr = (String) payload.get("watchedDate");
        if (watchedDateStr != null) {
            review.setWatchedDate(LocalDate.parse(watchedDateStr));
        }

        @SuppressWarnings("unchecked")
        List<String> tags = (List<String>) payload.get("tags");
        review.setTags(tags);

        // Handle Like status
        Boolean isLiked = (Boolean) payload.get("isLiked");
        if (isLiked != null) {
            boolean currentlyLiked = likeRepository.existsByUserIdAndMovieId(user.getId(), movieId);

            if (isLiked && !currentlyLiked) {
                // Add like
                Double voteAverage = payload.get("voteAverage") != null
                        ? Double.valueOf(payload.get("voteAverage").toString())
                        : 0.0;
                String releaseDate = (String) payload.get("releaseDate");

                Like like = new Like(
                        user,
                        movieId,
                        review.getMovieTitle(),
                        review.getMoviePosterUrl(),
                        voteAverage,
                        releaseDate != null ? releaseDate : review.getMovieYear());

                likeRepository.save(like);
            } else if (!isLiked && currentlyLiked) {
                // Remove like
                likeRepository.deleteByUserIdAndMovieId(user.getId(), movieId);
            }
        }

        Review savedReview = reviewRepository.save(review);
        return ResponseEntity.ok(savedReview);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Review>> getUserReviews(@PathVariable Long userId) {
        return ResponseEntity.ok(reviewRepository.findByUserId(userId));
    }

    @GetMapping("/movie/{movieId}/check")
    public ResponseEntity<?> checkReviewStatus(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Review> reviews = reviewRepository.findAllByUserIdAndMovieId(user.getId(), movieId);

        if (!reviews.isEmpty()) {
            Review review = reviews.get(0);
            return ResponseEntity.ok(Map.of(
                    "hasReview", true,
                    "rating", review.getRating(),
                    "reviewId", review.getId()));
        } else {
            return ResponseEntity.ok(Map.of("hasReview", false));
        }
    }
}
