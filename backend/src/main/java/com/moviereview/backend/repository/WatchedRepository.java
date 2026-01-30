package com.moviereview.backend.repository;

import com.moviereview.backend.model.Watched;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WatchedRepository extends JpaRepository<Watched, Long> {
    List<Watched> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByUserIdAndMovieId(Long userId, String movieId);
    void deleteByUserIdAndMovieId(Long userId, String movieId);
}
