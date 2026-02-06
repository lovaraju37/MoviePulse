package com.moviereview.backend.controller;

import com.moviereview.backend.model.Like;
import com.moviereview.backend.model.Review;
import com.moviereview.backend.model.ReviewLike;
import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.LikeRepository;
import com.moviereview.backend.repository.ReviewLikeRepository;
import com.moviereview.backend.repository.ReviewRepository;
import com.moviereview.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final ReviewLikeRepository reviewLikeRepository;

    public ReviewController(ReviewRepository reviewRepository, UserRepository userRepository,
            LikeRepository likeRepository, ReviewLikeRepository reviewLikeRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.reviewLikeRepository = reviewLikeRepository;
    }

    @PostMapping("/{reviewId}/like")
    @Transactional
    public ResponseEntity<?> likeReview(@PathVariable Long reviewId, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Review review = reviewRepository.findById(reviewId)
                    .orElseThrow(() -> new RuntimeException("Review not found"));

            // Prevent self-liking
            if (review.getUser().getId().equals(user.getId())) {
                return ResponseEntity.badRequest().body("Cannot like your own review");
            }

            if (reviewLikeRepository.existsByUserIdAndReviewId(user.getId(), reviewId)) {
                return ResponseEntity.badRequest().body("Review already liked");
            }

            ReviewLike reviewLike = new ReviewLike(user, review);
            reviewLikeRepository.save(reviewLike);

            return ResponseEntity.ok(Map.of("message", "Review liked"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // Support both DELETE method and POST .../unlike for compatibility
    @PostMapping("/{reviewId}/unlike")
    @Transactional
    public ResponseEntity<?> unlikeReviewPost(@PathVariable Long reviewId, Authentication authentication) {
        return unlikeReview(reviewId, authentication);
    }

    @DeleteMapping("/{reviewId}/like")
    @Transactional
    public ResponseEntity<?> unlikeReview(@PathVariable Long reviewId, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            reviewLikeRepository.deleteByUserIdAndReviewId(user.getId(), reviewId);

            return ResponseEntity.ok(Map.of("message", "Review unliked"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reviewId}/likes")
    public ResponseEntity<?> getReviewLikes(@PathVariable Long reviewId) {
        List<ReviewLike> likes = reviewLikeRepository.findByReviewId(reviewId);
        List<Map<String, Object>> users = likes.stream().map(like -> {
            User u = like.getUser();
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("avatarUrl", u.getAvatarUrl());
            return map;
        }).toList();
        return ResponseEntity.ok(users);
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

    @GetMapping("/friends")
    public ResponseEntity<List<Map<String, Object>>> getFriendReviews(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Long> followingIds = user.getFollowing().stream()
                .map(User::getId)
                .toList();

        if (followingIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Review> reviews = reviewRepository.findByUserIdInOrderByCreatedAtDesc(followingIds);

        List<Map<String, Object>> result = reviews.stream().map(review -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", review.getId());
            map.put("movieId", review.getMovieId());
            map.put("movieTitle", review.getMovieTitle());
            map.put("movieYear", review.getMovieYear());
            map.put("moviePosterUrl", review.getMoviePosterUrl());
            map.put("rating", review.getRating());
            map.put("content", review.getContent());
            map.put("rewatch", review.isRewatch());
            map.put("containsSpoiler", review.isContainsSpoiler());
            map.put("createdAt", review.getCreatedAt());
            map.put("user", review.getUser());
            map.put("tags", review.getTags());

            boolean isLiked = likeRepository.existsByUserIdAndMovieId(review.getUser().getId(), review.getMovieId());
            map.put("isLiked", isLiked);

            boolean isReviewLiked = reviewLikeRepository.existsByUserIdAndReviewId(user.getId(), review.getId());
            map.put("isReviewLiked", isReviewLiked);

            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getUserReviews(@PathVariable Long userId,
            Authentication authentication) {
        List<Review> reviews = reviewRepository.findByUserId(userId);
        User currentUser = null;
        if (authentication != null) {
            String email = authentication.getName();
            currentUser = userRepository.findByEmail(email).orElse(null);
        }

        User finalCurrentUser = currentUser;
        List<Map<String, Object>> result = reviews.stream().map(review -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", review.getId());
            map.put("movieId", review.getMovieId());
            map.put("movieTitle", review.getMovieTitle());
            map.put("movieYear", review.getMovieYear());
            map.put("moviePosterUrl", review.getMoviePosterUrl());
            map.put("rating", review.getRating());
            map.put("content", review.getContent());
            map.put("rewatch", review.isRewatch());
            map.put("containsSpoiler", review.isContainsSpoiler());
            map.put("watchedDate", review.getWatchedDate());
            map.put("createdAt", review.getCreatedAt());
            map.put("user", review.getUser());
            map.put("tags", review.getTags());

            // Check if MOVIE is liked (legacy field isLiked usually meant movie like in
            // some contexts,
            // but in ReviewCard it often means Review Like.
            // In getFriendReviews, isLiked = movie like, isReviewLiked = review like.
            // Let's keep consistency with getFriendReviews).
            boolean isLiked = likeRepository.existsByUserIdAndMovieId(review.getUser().getId(), review.getMovieId());
            map.put("isLiked", isLiked); // This is "did the reviewer like the movie?"

            boolean isReviewLiked = false;
            if (finalCurrentUser != null) {
                isReviewLiked = reviewLikeRepository.existsByUserIdAndReviewId(finalCurrentUser.getId(),
                        review.getId());
            }
            map.put("isReviewLiked", isReviewLiked);

            long likesCount = reviewLikeRepository.countByReviewId(review.getId());
            map.put("likesCount", likesCount);

            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/movie/{movieId}/check")
    @Transactional
    public ResponseEntity<?> checkReviewStatus(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Review> reviews = reviewRepository.findAllByUserIdAndMovieId(user.getId(), movieId.trim());
        Optional<Like> likeOpt = likeRepository.findByUserIdAndMovieId(user.getId(), movieId.trim());

        Map<String, Object> response = new HashMap<>();

        if (likeOpt.isPresent()) {
            System.out.println("Like found for movie " + movieId);
            response.put("isLiked", true);
            response.put("likeDate", likeOpt.get().getCreatedAt().toString());
        } else {
            System.out.println("No like found for movie " + movieId);
            response.put("isLiked", false);
        }

        if (!reviews.isEmpty()) {
            Review review = reviews.get(0);
            System.out.println("Review found for movie " + movieId + ": " + review.getId());

            response.put("hasReview", true);
            response.put("rating", review.getRating());
            response.put("reviewId", review.getId());
            response.put("review", review);

            boolean isReviewLiked = reviewLikeRepository.existsByUserIdAndReviewId(user.getId(), review.getId());
            response.put("isReviewLiked", isReviewLiked);

            long reviewLikeCount = reviewLikeRepository.countByReviewId(review.getId());
            response.put("reviewLikeCount", reviewLikeCount);

            return ResponseEntity.ok(response);
        } else {
            response.put("hasReview", false);
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/search/tags")
    public ResponseEntity<List<Review>> searchReviewsByTag(@RequestParam String tag) {
        return ResponseEntity.ok(reviewRepository.findByTagsContaining(tag));
    }

    @GetMapping("/user/{userId}/movie/{movieId}")
    public ResponseEntity<?> getUserReviewForMovie(@PathVariable Long userId, @PathVariable String movieId,
            Authentication authentication) {
        List<Review> reviews = reviewRepository.findAllByUserIdAndMovieId(userId, movieId.trim());
        Optional<Like> likeOpt = likeRepository.findByUserIdAndMovieId(userId, movieId.trim());

        Map<String, Object> response = new HashMap<>();

        if (likeOpt.isPresent()) {
            response.put("isLiked", true);
            response.put("likeDate", likeOpt.get().getCreatedAt().toString());
        } else {
            response.put("isLiked", false);
        }

        if (!reviews.isEmpty()) {
            Review review = reviews.get(0);
            response.put("hasReview", true);
            response.put("rating", review.getRating());
            response.put("reviewId", review.getId());
            response.put("review", review);

            // Check if requesting user liked this review
            if (authentication != null) {
                String email = authentication.getName();
                Optional<User> currentUserOpt = userRepository.findByEmail(email);
                if (currentUserOpt.isPresent()) {
                    boolean isReviewLiked = reviewLikeRepository.existsByUserIdAndReviewId(currentUserOpt.get().getId(),
                            review.getId());
                    response.put("isReviewLiked", isReviewLiked);
                } else {
                    response.put("isReviewLiked", false);
                }
            } else {
                response.put("isReviewLiked", false);
            }

            long reviewLikeCount = reviewLikeRepository.countByReviewId(review.getId());
            response.put("reviewLikeCount", reviewLikeCount);

            return ResponseEntity.ok(response);
        } else {
            response.put("hasReview", false);
            return ResponseEntity.ok(response);
        }
    }
}
