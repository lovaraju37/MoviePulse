package com.moviereview.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String movieId;
    private String movieTitle;
    private String movieYear;
    private String moviePosterUrl;

    @Column(length = 5000)
    private String content;

    private double rating;

    private boolean isRewatch;
    private boolean containsSpoiler;
    private java.time.LocalDate watchedDate;

    @ElementCollection
    private java.util.List<String> tags;

    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    public Review() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMovieId() {
        return movieId;
    }

    public void setMovieId(String movieId) {
        this.movieId = movieId;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getMovieYear() {
        return movieYear;
    }

    public void setMovieYear(String movieYear) {
        this.movieYear = movieYear;
    }

    public String getMoviePosterUrl() {
        return moviePosterUrl;
    }

    public void setMoviePosterUrl(String moviePosterUrl) {
        this.moviePosterUrl = moviePosterUrl;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public boolean isRewatch() {
        return isRewatch;
    }

    public void setRewatch(boolean rewatch) {
        isRewatch = rewatch;
    }

    public boolean isContainsSpoiler() {
        return containsSpoiler;
    }

    public void setContainsSpoiler(boolean containsSpoiler) {
        this.containsSpoiler = containsSpoiler;
    }

    public java.time.LocalDate getWatchedDate() {
        return watchedDate;
    }

    public void setWatchedDate(java.time.LocalDate watchedDate) {
        this.watchedDate = watchedDate;
    }

    public java.util.List<String> getTags() {
        return tags;
    }

    public void setTags(java.util.List<String> tags) {
        this.tags = tags;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
