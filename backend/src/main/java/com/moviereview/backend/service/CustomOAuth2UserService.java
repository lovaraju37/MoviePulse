package com.moviereview.backend.service;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.UserRepository;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final Logger logger = LoggerFactory.getLogger(CustomOAuth2UserService.class);
    private final UserRepository userRepository;

    public CustomOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        logger.info("CustomOAuth2UserService.loadUser called for provider: {}",
                userRequest.getClientRegistration().getRegistrationId());
        OAuth2User oauth2User = super.loadUser(userRequest);
        try {
            processOAuthPostLogin(oauth2User, userRequest.getClientRegistration().getRegistrationId());
        } catch (Exception e) {
            logger.error("Error processing OAuth2 post login", e);
            throw new OAuth2AuthenticationException(new OAuth2Error("login_processing_error"),
                    "Error processing OAuth2 post login: " + e.getMessage(), e);
        }
        return oauth2User;
    }

    private void processOAuthPostLogin(OAuth2User oauth2User, String provider) {
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");
        // Google uses "sub" as the unique ID
        String providerId = oauth2User.getAttribute("sub");

        System.out.println("DEBUG: processOAuthPostLogin invoked for email: " + email);

        if (email == null) {
            System.out.println("DEBUG: Email is null!");
            logger.warn("Email is null for OAuth2 user from provider: {}", provider);
            return;
        }

        Optional<User> existUser = userRepository.findByEmail(email);

        if (existUser.isEmpty()) {
            System.out.println("DEBUG: Creating new user for " + email);
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setProvider(provider);
            newUser.setProviderId(providerId);
            newUser.setAvatarUrl(picture);
            try {
                User savedUser = userRepository.save(newUser);
                System.out.println("DEBUG: User saved successfully. ID: " + savedUser.getId());
            } catch (Exception e) {
                System.out.println("DEBUG: Failed to save user: " + e.getMessage());
                e.printStackTrace();
                throw e;
            }
        } else {
            System.out.println("DEBUG: Updating existing user " + email);
            User user = existUser.get();
            user.setName(name);
            user.setAvatarUrl(picture);
            user.setProvider(provider);
            user.setProviderId(providerId);
            userRepository.save(user);
        }
    }
}
