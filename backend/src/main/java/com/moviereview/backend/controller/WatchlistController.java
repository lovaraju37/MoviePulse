package com.moviereview.backend.controller;

import com.moviereview.backend.model.User;
import com.moviereview.backend.model.Watchlist;
import com.moviereview.backend.repository.UserRepository;
import com.moviereview.backend.repository.WatchlistRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;

    public WatchlistController(WatchlistRepository watchlistRepository, UserRepository userRepository) {
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Watchlist>> getWatchlist(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(watchlistRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/{movieId}/check")
    public ResponseEntity<Map<String, Boolean>> checkWatchlistStatus(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean exists = watchlistRepository.existsByUserIdAndMovieId(user.getId(), movieId);
        return ResponseEntity.ok(Map.of("inWatchlist", exists));
    }

    @PostMapping
    public ResponseEntity<?> addToWatchlist(@RequestBody Map<String, Object> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String movieId = String.valueOf(payload.get("movieId"));
        if (watchlistRepository.existsByUserIdAndMovieId(user.getId(), movieId)) {
            return ResponseEntity.badRequest().body("Movie already in watchlist");
        }

        String title = (String) payload.get("title");
        String posterPath = (String) payload.get("posterPath");
        Double voteAverage = payload.get("voteAverage") != null ? Double.valueOf(payload.get("voteAverage").toString()) : 0.0;
        String releaseDate = (String) payload.get("releaseDate");

        Watchlist watchlist = new Watchlist(user, movieId, title, posterPath, voteAverage, releaseDate);
        watchlistRepository.save(watchlist);

        return ResponseEntity.ok(Map.of("message", "Added to watchlist"));
    }

    @DeleteMapping("/{movieId}")
    @Transactional
    public ResponseEntity<?> removeFromWatchlist(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        watchlistRepository.deleteByUserIdAndMovieId(user.getId(), movieId);
        return ResponseEntity.ok(Map.of("message", "Removed from watchlist"));
    }
}
