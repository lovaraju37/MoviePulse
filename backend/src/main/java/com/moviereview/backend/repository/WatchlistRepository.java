package com.moviereview.backend.repository;

import com.moviereview.backend.model.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    List<Watchlist> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Watchlist> findByUserIdAndMovieId(Long userId, String movieId);

    boolean existsByUserIdAndMovieId(Long userId, String movieId);

    void deleteByUserIdAndMovieId(Long userId, String movieId);
}
