package com.moviereview.backend.repository;

import com.moviereview.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.LocalDateTime;

import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByUserId(Long userId);

    Optional<Review> findByUserIdAndMovieId(Long userId, String movieId);

    List<Review> findAllByUserIdAndMovieId(Long userId, String movieId);

    long countByUserId(Long userId);

    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime date);
}
