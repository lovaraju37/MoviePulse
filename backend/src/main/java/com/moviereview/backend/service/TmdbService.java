package com.moviereview.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.Map;
import java.util.List;

@Service
public class TmdbService {

    @Value("${tmdb.api.key}")
    private String apiKey;

    @Value("${tmdb.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public TmdbService() {
        this.restTemplate = new RestTemplate();
    }

    public List<Map<String, Object>> getTrendingMovies() {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/trending/movie/week")
                .queryParam("api_key", apiKey)
                .toUriString();

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("results")) {
                return (List<Map<String, Object>>) response.get("results");
            }
        } catch (Exception e) {
            System.err.println("Error fetching trending movies from TMDB: " + e.getMessage());
        }
        return List.of();
    }

    public Map<String, Object> getMovie(String id) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/movie/" + id)
                .queryParam("api_key", apiKey)
                .queryParam("append_to_response", "credits,release_dates")
                .toUriString();

        try {
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            System.err.println("Error fetching movie details from TMDB: " + e.getMessage());
            return null;
        }
    }

    public Map<String, Object> searchMovies(String query, int page) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/search/movie")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("page", page)
                .toUriString();

        try {
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            System.err.println("Error searching movies from TMDB: " + e.getMessage());
            return null;
        }
    }

    public Map<String, Object> searchPeople(String query, int page) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/search/person")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("page", page)
                .toUriString();

        try {
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            System.err.println("Error searching people from TMDB: " + e.getMessage());
            return null;
        }
    }
}
