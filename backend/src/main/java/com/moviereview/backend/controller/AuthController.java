package com.moviereview.backend.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.UserRepository;
import com.moviereview.backend.security.JwtUtils;
import com.moviereview.backend.service.CloudinaryService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final CloudinaryService cloudinaryService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager, JwtUtils jwtUtils, CloudinaryService cloudinaryService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.cloudinaryService = cloudinaryService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setProvider("local");
        userRepository.save(user);

        String token = jwtUtils.generateToken(user.getEmail());
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        if (authentication.isAuthenticated()) {
            String token = jwtUtils.generateToken(request.getEmail());
            return ResponseEntity.ok(Map.of("token", token));
        } else {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }

    @org.springframework.web.bind.annotation.GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        // If authenticated via JWT, principal is UserDetails (from
        // CustomUserDetailsService)
        // If via OAuth, it might be OAuth2User, but we issue JWT after OAuth login, so
        // subsequent requests use JWT.
        // So principal should be UserDetails (User object from Spring Security).
        // But we want our User entity details (like name, avatarUrl).

        String email;
        if (authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal())
                    .getUsername();
        } else if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            email = ((org.springframework.security.oauth2.core.user.OAuth2User) authentication.getPrincipal())
                    .getAttribute("email");
        } else {
            email = authentication.getName();
        }

        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "name", user.getName() != null ? user.getName() : "",
                        "email", user.getEmail(),
                        "picture", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                        "bio", user.getBio() != null ? user.getBio() : "",
                        "gender", user.getGender() != null ? user.getGender() : "")))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        String email;
        if (authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal())
                    .getUsername();
        } else {
            email = authentication.getName();
        }

        return userRepository.findByEmail(email)
                .map(user -> {
                    if (request.getName() != null)
                        user.setName(request.getName());
                    if (request.getBio() != null)
                        user.setBio(request.getBio());
                    if (request.getGender() != null)
                        user.setGender(request.getGender());
                    if (request.getPicture() != null)
                        user.setAvatarUrl(request.getPicture());

                    userRepository.save(user);

                    return ResponseEntity.ok(Map.of(
                            "id", user.getId(),
                            "name", user.getName() != null ? user.getName() : "",
                            "email", user.getEmail(),
                            "picture", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                            "bio", user.getBio() != null ? user.getBio() : "",
                            "gender", user.getGender() != null ? user.getGender() : ""));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/upload-avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        try {
            String imageUrl = cloudinaryService.uploadImage(file);

            String email;
            if (authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
                email = ((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal())
                        .getUsername();
            } else {
                email = authentication.getName();
            }

            userRepository.findByEmail(email).ifPresent(user -> {
                user.setAvatarUrl(imageUrl);
                userRepository.save(user);
            });

            return ResponseEntity.ok(Map.of("url", imageUrl));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Image upload failed: " + e.getMessage());
        }
    }

    public static class RegisterRequest {
        private String email;
        private String password;
        private String name;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class LoginRequest {
        private String email;
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class UpdateRequest {
        private String name;
        private String bio;
        private String gender;
        private String picture;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getBio() {
            return bio;
        }

        public void setBio(String bio) {
            this.bio = bio;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getPicture() {
            return picture;
        }

        public void setPicture(String picture) {
            this.picture = picture;
        }
    }
}
