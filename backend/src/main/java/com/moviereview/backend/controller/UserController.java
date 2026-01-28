package com.moviereview.backend.controller;

import com.moviereview.backend.model.User;
import com.moviereview.backend.model.Notification;
import com.moviereview.backend.repository.UserRepository;
import com.moviereview.backend.repository.NotificationRepository;
import com.moviereview.backend.repository.ReviewRepository;
import com.moviereview.backend.repository.MovieListRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final ReviewRepository reviewRepository;
    private final MovieListRepository movieListRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public UserController(UserRepository userRepository,
            NotificationRepository notificationRepository,
            ReviewRepository reviewRepository,
            MovieListRepository movieListRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.reviewRepository = reviewRepository;
        this.movieListRepository = movieListRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchUsers(@RequestParam String query) {
        List<User> users = userRepository.findByNameContainingIgnoreCase(query);
        List<Map<String, Object>> result = users.stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "name", u.getName(),
                        "username", u.getEmail() != null ? u.getEmail().split("@")[0] : "",
                        "picture", u.getAvatarUrl() != null ? u.getAvatarUrl() : ""))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getUserProfile(@PathVariable Long id, Authentication authentication) {
        User targetUser = userRepository.findById(id).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.notFound().build();
        }

        User currentUser = null;
        boolean isFollowing = false;
        if (authentication != null) {
            String email = authentication.getName();
            currentUser = userRepository.findByEmail(email).orElse(null);
            if (currentUser != null) {
                isFollowing = targetUser.getFollowers().contains(currentUser);
            }
        }

        long filmsCount = reviewRepository.countByUserId(targetUser.getId());
        long listsCount = movieListRepository.countByUserId(targetUser.getId());
        LocalDateTime startOfYear = LocalDateTime.of(LocalDateTime.now().getYear(), 1, 1, 0, 0);
        long thisYearCount = reviewRepository.countByUserIdAndCreatedAtAfter(targetUser.getId(), startOfYear);

        return ResponseEntity.ok(Map.of(
                "id", targetUser.getId(),
                "name", targetUser.getName(),
                "bio", targetUser.getBio() != null ? targetUser.getBio() : "",
                "picture", targetUser.getAvatarUrl() != null ? targetUser.getAvatarUrl() : "",
                "followersCount", targetUser.getFollowers().size(),
                "followingCount", targetUser.getFollowing().size(),
                "filmsCount", filmsCount,
                "listsCount", listsCount,
                "thisYearCount", thisYearCount,
                "isFollowing", isFollowing));
    }

    @PostMapping("/{id}/follow")
    @Transactional
    public ResponseEntity<?> followUser(@PathVariable Long id, Authentication authentication) {
        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        if (currentUser.getId().equals(targetUser.getId())) {
            return ResponseEntity.badRequest().body("Cannot follow yourself");
        }

        if (!targetUser.getFollowers().contains(currentUser)) {
            targetUser.getFollowers().add(currentUser);
            userRepository.save(targetUser);

            // Create Notification
            Notification notification = new Notification(
                    currentUser.getName() + " started following you",
                    "FOLLOW",
                    targetUser,
                    currentUser);
            notificationRepository.save(notification);

            // Send Real-time Notification
            Map<String, Object> notifData = Map.of(
                    "id", notification.getId(),
                    "message", notification.getMessage(),
                    "type", notification.getType(),
                    "createdAt", notification.getCreatedAt().toString(),
                    "senderId", currentUser.getId(),
                    "senderName", currentUser.getName());
            messagingTemplate.convertAndSendToUser(
                    targetUser.getEmail(), // Using email as username for STOMP
                    "/queue/notifications",
                    notifData);
        }

        return ResponseEntity.ok(Map.of("message", "Followed successfully"));
    }

    @PostMapping("/{id}/unfollow")
    @Transactional
    public ResponseEntity<?> unfollowUser(@PathVariable Long id, Authentication authentication) {
        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        if (targetUser.getFollowers().contains(currentUser)) {
            targetUser.getFollowers().remove(currentUser);
            userRepository.save(targetUser);
        }

        return ResponseEntity.ok(Map.of("message", "Unfollowed successfully"));
    }
}
