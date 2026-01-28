package com.moviereview.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    private String password;
    private String provider;
    private String providerId;

    @jakarta.persistence.Column(length = 2048)
    private String avatarUrl;

    @jakarta.persistence.Column(length = 1000)
    private String bio;

    private String gender;

    @jakarta.persistence.ManyToMany
    @jakarta.persistence.JoinTable(name = "user_followers", joinColumns = @jakarta.persistence.JoinColumn(name = "user_id"), inverseJoinColumns = @jakarta.persistence.JoinColumn(name = "follower_id"))
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.Set<User> followers = new java.util.HashSet<>();

    @jakarta.persistence.ManyToMany(mappedBy = "followers")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.Set<User> following = new java.util.HashSet<>();

    public User() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

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

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
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

    public java.util.Set<User> getFollowers() {
        return followers;
    }

    public void setFollowers(java.util.Set<User> followers) {
        this.followers = followers;
    }

    public java.util.Set<User> getFollowing() {
        return following;
    }

    public void setFollowing(java.util.Set<User> following) {
        this.following = following;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

}
