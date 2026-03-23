package com.moviereview.backend.controller;

import com.moviereview.backend.model.MovieList;
import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.MovieListRepository;
import com.moviereview.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/lists")
public class ListController {

    private final MovieListRepository movieListRepository;
    private final UserRepository userRepository;

    public ListController(MovieListRepository movieListRepository, UserRepository userRepository) {
        this.movieListRepository = movieListRepository;
        this.userRepository = userRepository;
    }

    private Map<String, Object> toMap(MovieList l) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", l.getId());
        m.put("name", l.getName());
        m.put("description", l.getDescription() != null ? l.getDescription() : "");
        m.put("tags", l.getTags() != null ? l.getTags() : "");
        m.put("isPublic", l.isPublic());
        m.put("ranked", l.isRanked());
        m.put("movieIds", l.getMovieIds());
        m.put("createdAt", l.getCreatedAt().toString());
        m.put("filmCount", l.getMovieIds().size());
        return m;
    }

    @GetMapping("/user/{userId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getUserLists(@PathVariable Long userId) {
        List<MovieList> lists = movieListRepository.findByUserId(userId);
        return ResponseEntity.ok(lists.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/my")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getMyLists(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<MovieList> lists = movieListRepository.findByUserId(user.getId());
        return ResponseEntity.ok(lists.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> createList(@RequestBody Map<String, Object> payload,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieList list = new MovieList();
        list.setUser(user);
        list.setName((String) payload.getOrDefault("name", "Untitled List"));
        list.setDescription((String) payload.getOrDefault("description", ""));
        list.setTags((String) payload.getOrDefault("tags", ""));
        list.setPublic(!"private".equals(payload.get("visibility")));
        list.setRanked(Boolean.TRUE.equals(payload.get("ranked")));
        @SuppressWarnings("unchecked")
        List<String> movieIds = (List<String>) payload.get("movieIds");
        if (movieIds != null) list.setMovieIds(movieIds);
        movieListRepository.save(list);
        return ResponseEntity.ok(toMap(list));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateList(@PathVariable Long id,
            @RequestBody Map<String, Object> payload, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieList list = movieListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("List not found"));
        if (!list.getUser().getId().equals(user.getId()))
            return ResponseEntity.status(403).build();
        if (payload.containsKey("name")) list.setName((String) payload.get("name"));
        if (payload.containsKey("description")) list.setDescription((String) payload.get("description"));
        if (payload.containsKey("tags")) list.setTags((String) payload.get("tags"));
        if (payload.containsKey("visibility")) list.setPublic(!"private".equals(payload.get("visibility")));
        if (payload.containsKey("ranked")) list.setRanked(Boolean.TRUE.equals(payload.get("ranked")));
        @SuppressWarnings("unchecked")
        List<String> movieIds = (List<String>) payload.get("movieIds");
        if (movieIds != null) list.setMovieIds(movieIds);
        movieListRepository.save(list);
        return ResponseEntity.ok(toMap(list));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteList(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieList list = movieListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("List not found"));
        if (!list.getUser().getId().equals(user.getId()))
            return ResponseEntity.status(403).build();
        movieListRepository.delete(list);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
