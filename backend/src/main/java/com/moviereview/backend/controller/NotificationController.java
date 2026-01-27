package com.moviereview.backend.controller;

import com.moviereview.backend.model.Notification;
import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.NotificationRepository;
import com.moviereview.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getNotifications(Authentication authentication) {
        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> notifications = notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(currentUser.getId());

        List<Map<String, Object>> result = notifications.stream()
                .map(n -> Map.<String, Object>of(
                        "id", n.getId(),
                        "message", n.getMessage(),
                        "type", n.getType(),
                        "isRead", n.isRead(),
                        "createdAt", n.getCreatedAt().toString(),
                        "senderId", n.getSender().getId(),
                        "senderName", n.getSender().getName(),
                        "senderPicture", n.getSender().getAvatarUrl() != null ? n.getSender().getAvatarUrl() : ""))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication authentication) {
        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getRecipient().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        notification.setRead(true);
        notificationRepository.save(notification);

        return ResponseEntity.ok().build();
    }
}
