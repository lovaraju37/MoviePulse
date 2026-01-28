package com.moviereview.backend.controller;

import com.moviereview.backend.service.TmdbService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

    private final TmdbService tmdbService;

    public MovieController(TmdbService tmdbService) {
        this.tmdbService = tmdbService;
    }

    @GetMapping("/trending")
    public ResponseEntity<List<Map<String, Object>>> getTrendingMovies() {
        return ResponseEntity.ok(tmdbService.getTrendingMovies());
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
}
