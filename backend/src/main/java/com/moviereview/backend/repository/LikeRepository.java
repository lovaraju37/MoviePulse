package com.moviereview.backend.repository;

import com.moviereview.backend.model.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LikeRepository extends JpaRepository<Like, Long> {
    List<Like> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByUserIdAndMovieId(Long userId, String movieId);
    void deleteByUserIdAndMovieId(Long userId, String movieId);
}
