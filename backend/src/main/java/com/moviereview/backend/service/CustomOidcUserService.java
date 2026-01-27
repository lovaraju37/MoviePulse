package com.moviereview.backend.service;

import java.util.Optional;

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import com.moviereview.backend.model.User;
import com.moviereview.backend.repository.UserRepository;

@Service
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepository;

    public CustomOidcUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        try {
            return processOidcPostLogin(oidcUser, userRequest.getClientRegistration().getRegistrationId());
        } catch (Exception e) {
            throw new OAuth2AuthenticationException(new OAuth2Error("login_processing_error"),
                    "Error processing OIDC post login: " + e.getMessage(), e);
        }
    }

    private OidcUser processOidcPostLogin(OidcUser oidcUser, String provider) {
        String email = oidcUser.getAttribute("email");
        String name = oidcUser.getAttribute("name");
        String picture = oidcUser.getAttribute("picture");
        // Google uses "sub" as the unique ID
        String providerId = oidcUser.getAttribute("sub");

        System.out.println("DEBUG: CustomOidcUserService processOidcPostLogin invoked for email: " + email);

        if (email == null) {
            System.out.println("DEBUG: Email is null!");
            return oidcUser;
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
        
        return oidcUser;
    }
}
