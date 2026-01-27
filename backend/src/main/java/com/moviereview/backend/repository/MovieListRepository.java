package com.moviereview.backend.repository;

import com.moviereview.backend.model.MovieList;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovieListRepository extends JpaRepository<MovieList, Long> {
    List<MovieList> findByUserId(Long userId);
    long countByUserId(Long userId);
}
