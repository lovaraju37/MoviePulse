package com.moviereview.backend.controller;

import com.moviereview.backend.service.TmdbService;
import com.moviereview.backend.repository.*;
import com.moviereview.backend.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

    private final TmdbService tmdbService;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final WatchedRepository watchedRepository;
    private final WatchlistRepository watchlistRepository;

    public MovieController(TmdbService tmdbService, UserRepository userRepository, LikeRepository likeRepository,
            WatchedRepository watchedRepository, WatchlistRepository watchlistRepository) {
        this.tmdbService = tmdbService;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.watchedRepository = watchedRepository;
        this.watchlistRepository = watchlistRepository;
    }

    @GetMapping("/{id}/friend-activity")
    public ResponseEntity<List<Map<String, Object>>> getFriendActivity(@PathVariable String id,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok(List.of());
        }

        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.ok(List.of());
        }

        Set<User> following = currentUser.getFollowing();
        List<Map<String, Object>> activity = new ArrayList<>();

        for (User friend : following) {
            String status = null;
            // Precedence: Like > Watched > Watchlist
            if (likeRepository.existsByUserIdAndMovieId(friend.getId(), id)) {
                status = "LIKED";
            } else if (watchedRepository.existsByUserIdAndMovieId(friend.getId(), id)) {
                status = "WATCHED";
            } else if (watchlistRepository.existsByUserIdAndMovieId(friend.getId(), id)) {
                status = "WATCHLIST";
            }

            if (status != null) {
                activity.add(Map.of(
                        "userId", friend.getId(),
                        "name", friend.getName(),
                        "avatarUrl", friend.getAvatarUrl() != null ? friend.getAvatarUrl() : "",
                        "status", status));
            }
        }

        return ResponseEntity.ok(activity);
    }

    @GetMapping("/trending")
    public ResponseEntity<List<Map<String, Object>>> getTrendingMovies() {
        return ResponseEntity.ok(tmdbService.getTrendingMovies());
    }

    @GetMapping("/top-rated")
    public ResponseEntity<List<Map<String, Object>>> getTopRatedMovies() {
        return ResponseEntity.ok(tmdbService.getTopRatedMovies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getMovie(@PathVariable String id) {
        Map<String, Object> movie = tmdbService.getMovie(id);
        if (movie != null) {
            return ResponseEntity.ok(movie);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchMovies(@RequestParam String query) {
        Map<String, Object> result = tmdbService.searchMovies(query, 1);
        if (result != null && result.containsKey("results")) {
            return ResponseEntity.ok((List<Map<String, Object>>) result.get("results"));
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/search/paginated")
    public ResponseEntity<Map<String, Object>> searchMoviesPaginated(@RequestParam String query,
            @RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.searchMovies(query, page));
    }

    @GetMapping("/people/search")
    public ResponseEntity<List<Map<String, Object>>> searchPeople(@RequestParam String query) {
        Map<String, Object> result = tmdbService.searchPeople(query, 1);
        if (result != null && result.containsKey("results")) {
            return ResponseEntity.ok((List<Map<String, Object>>) result.get("results"));
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/people/search/paginated")
    public ResponseEntity<Map<String, Object>> searchPeoplePaginated(@RequestParam String query,
            @RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.searchPeople(query, page));
    }

    @GetMapping("/person/{id}")
    public ResponseEntity<Map<String, Object>> getPerson(@PathVariable String id) {
        Map<String, Object> person = tmdbService.getPerson(id);
        if (person != null) {
            return ResponseEntity.ok(person);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/person/{id}/movie_credits")
    public ResponseEntity<Map<String, Object>> getPersonMovieCredits(@PathVariable String id) {
        Map<String, Object> credits = tmdbService.getPersonMovieCredits(id);
        if (credits != null) {
            return ResponseEntity.ok(credits);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
