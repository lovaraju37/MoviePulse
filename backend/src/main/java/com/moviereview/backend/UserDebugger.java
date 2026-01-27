package com.moviereview.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.moviereview.backend.repository.UserRepository;

@Component
public class UserDebugger implements CommandLineRunner {

    private final UserRepository userRepository;

    public UserDebugger(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("---- DEBUG: Users in Database ----");
        userRepository.findAll().forEach(user -> {
            System.out.println("ID: " + user.getId() + ", Email: " + user.getEmail() + ", Name: " + user.getName() + ", Provider: " + user.getProvider());
        });
        System.out.println("---- DEBUG: End Users ----");
    }
}
