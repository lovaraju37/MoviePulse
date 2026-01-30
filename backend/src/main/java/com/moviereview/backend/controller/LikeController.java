package com.moviereview.backend.controller;

import com.moviereview.backend.model.User;
import com.moviereview.backend.model.Like;
import com.moviereview.backend.repository.UserRepository;
import com.moviereview.backend.repository.LikeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/likes")
public class LikeController {

    private final LikeRepository likeRepository;
    private final UserRepository userRepository;

    public LikeController(LikeRepository likeRepository, UserRepository userRepository) {
        this.likeRepository = likeRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Like>> getLikes(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(likeRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/{movieId}/check")
    public ResponseEntity<Map<String, Boolean>> checkLikeStatus(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean exists = likeRepository.existsByUserIdAndMovieId(user.getId(), movieId);
        return ResponseEntity.ok(Map.of("isLiked", exists));
    }

    @PostMapping
    public ResponseEntity<?> addToLikes(@RequestBody Map<String, Object> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String movieId = String.valueOf(payload.get("movieId"));
        if (likeRepository.existsByUserIdAndMovieId(user.getId(), movieId)) {
            return ResponseEntity.badRequest().body("Movie already liked");
        }

        String title = (String) payload.get("title");
        String posterPath = (String) payload.get("posterPath");
        Double voteAverage = payload.get("voteAverage") != null ? Double.valueOf(payload.get("voteAverage").toString()) : 0.0;
        String releaseDate = (String) payload.get("releaseDate");

        Like like = new Like(user, movieId, title, posterPath, voteAverage, releaseDate);
        likeRepository.save(like);

        return ResponseEntity.ok(Map.of("message", "Added to likes"));
    }

    @DeleteMapping("/{movieId}")
    @Transactional
    public ResponseEntity<?> removeFromLikes(@PathVariable String movieId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        likeRepository.deleteByUserIdAndMovieId(user.getId(), movieId);
        return ResponseEntity.ok(Map.of("message", "Removed from likes"));
    }
}
