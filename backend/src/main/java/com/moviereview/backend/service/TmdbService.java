package com.moviereview.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import java.util.List;

@Service
public class TmdbService {

    private static final Logger logger = LoggerFactory.getLogger(TmdbService.class);

    @Value("${tmdb.api.key}")
    private String apiKey;

    @Value("${tmdb.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public TmdbService() {
        this.restTemplate = new RestTemplate();
    }

    private <T> T fetchTmdbData(@NonNull String url, @NonNull ParameterizedTypeReference<T> responseType,
            String errorPrefix) {
        try {
            HttpMethod method = HttpMethod.GET;
            HttpEntity<?> requestEntity = HttpEntity.EMPTY;
            return restTemplate.exchange(
                    url,
                    method,
                    requestEntity,
                    responseType).getBody();
        } catch (Exception e) {
            logger.error("{}{}", errorPrefix, e.getMessage());
            return null;
        }
    }

    private Map<String, Object> fetchTmdbMap(String url, String errorPrefix) {
        return fetchTmdbData(url, new ParameterizedTypeReference<Map<String, Object>>() {
        }, errorPrefix);
    }

    public List<Map<String, Object>> getTrendingMovies() {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/trending/movie/week")
                .queryParam("api_key", apiKey)
                .toUriString();

        TmdbResultsResponse response = fetchTmdbData(
                url,
                new ParameterizedTypeReference<TmdbResultsResponse>() {
                },
                "Error fetching trending movies from TMDB: ");

        if (response == null || response.getResults() == null) {
            return List.of();
        }

        return response.getResults();
    }

    public List<Map<String, Object>> getTopRatedMovies() {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/movie/top_rated")
                .queryParam("api_key", apiKey)
                .toUriString();

        logger.info("Fetching top rated movies from URL: {}", url);

        TmdbResultsResponse response = fetchTmdbData(
                url,
                new ParameterizedTypeReference<TmdbResultsResponse>() {
                },
                "Error fetching top rated movies from TMDB: ");

        if (response == null || response.getResults() == null) {
            return List.of();
        }

        return response.getResults();
    }

    public Map<String, Object> getMovie(String id) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/movie/" + id)
                .queryParam("api_key", apiKey)
                .queryParam("append_to_response", "credits,release_dates")
                .toUriString();

        return fetchTmdbMap(url, "Error fetching movie details from TMDB: ");
    }

    public Map<String, Object> searchMovies(String query, int page) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/search/movie")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("page", page)
                .toUriString();

        return fetchTmdbMap(url, "Error searching movies from TMDB: ");
    }

    public Map<String, Object> searchPeople(String query, int page) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/search/person")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("page", page)
                .toUriString();

        return fetchTmdbMap(url, "Error searching people from TMDB: ");
    }

    public Map<String, Object> getPerson(String id) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/person/" + id)
                .queryParam("api_key", apiKey)
                .toUriString();

        return fetchTmdbMap(url, "Error fetching person details from TMDB: ");
    }

    public Map<String, Object> getPersonMovieCredits(String id) {
        String url = UriComponentsBuilder.fromUriString(apiUrl + "/person/" + id + "/movie_credits")
                .queryParam("api_key", apiKey)
                .toUriString();

        return fetchTmdbMap(url, "Error fetching person credits from TMDB: ");
    }

    public static class TmdbResultsResponse {
        private List<Map<String, Object>> results;

        public List<Map<String, Object>> getResults() {
            return results;
        }

        @SuppressWarnings("unused")
        public void setResults(List<Map<String, Object>> results) {
            this.results = results;
        }
    }
}
