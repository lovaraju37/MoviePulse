package com.moviereview.backend.controller;

import com.moviereview.backend.model.User;
import com.moviereview.backend.model.Watched;
import com.moviereview.backend.repository.UserRepository;
import com.moviereview.backend.repository.WatchedRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/watched")
public class WatchedController {

    private final WatchedRepository watchedRepository;
    private final UserRepository userRepository;
    private final com.moviereview.backend.repository.WatchlistRepository watchlistRepository;

    public WatchedController(WatchedRepository watchedRepository, UserRepository userRepository,
            com.moviereview.backend.repository.WatchlistRepository watchlistRepository) {
        this.watchedRepository = watchedRepository;
        this.userRepository = userRepository;
        this.watchlistRepository = watchlistRepository;
    }

    @GetMapping
    public ResponseEntity<List<Watched>> getWatched(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(watchedRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/{movieId}/check")
    public ResponseEntity<Map<String, Boolean>> checkWatchedStatus(@PathVariable String movieId,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean exists = watchedRepository.existsByUserIdAndMovieId(user.getId(), movieId);
        return ResponseEntity.ok(Map.of("isWatched", exists));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> addToWatched(@RequestBody Map<String, Object> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String movieId = String.valueOf(payload.get("movieId"));
        if (watchedRepository.existsByUserIdAndMovieId(user.getId(), movieId)) {
            return ResponseEntity.badRequest().body("Movie already in watched list");
        }

        String title = (String) payload.get("title");
        String posterPath = (String) payload.get("posterPath");
        Double voteAverage = payload.get("voteAverage") != null ? Double.valueOf(payload.get("voteAverage").toString())
                : 0.0;
        String releaseDate = (String) payload.get("releaseDate");

        Watched watched = new Watched(user, movieId, title, posterPath, voteAverage, releaseDate);
        watchedRepository.save(watched);

        // Automatically remove from watchlist if present
        watchlistRepository.findByUserIdAndMovieId(user.getId(), movieId)
                .ifPresent(watchlist -> watchlistRepository.delete(watchlist));

        return ResponseEntity.ok(Map.of("message", "Added to watched list"));
    }

    @DeleteMapping("/{movieId}")
    @Transactional
    public ResponseEntity<?> removeFromWatched(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        watchedRepository.deleteByUserIdAndMovieId(user.getId(), movieId);
        return ResponseEntity.ok(Map.of("message", "Removed from watched list"));
    }
}
