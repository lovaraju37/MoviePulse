package com.moviereview.backend.repository;

import com.moviereview.backend.model.ReviewLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReviewLikeRepository extends JpaRepository<ReviewLike, Long> {
    boolean existsByUserIdAndReviewId(Long userId, Long reviewId);
    Optional<ReviewLike> findByUserIdAndReviewId(Long userId, Long reviewId);
    void deleteByUserIdAndReviewId(Long userId, Long reviewId);
    long countByReviewId(Long reviewId);
    List<ReviewLike> findByReviewId(Long reviewId);
}
