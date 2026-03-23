import React, { useEffect, useState, useCallback } from 'react';
import Navbar from './Navbar';
import MoviePoster from './MoviePoster';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './FilmsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const FilmsCategoryPage = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Discover filter params from URL
    const year = searchParams.get('year');
    const genre = searchParams.get('genre');
    const genreName = searchParams.get('genreName');
    const language = searchParams.get('language');
    const languageName = searchParams.get('languageName');
    const country = searchParams.get('country');
    const countryName = searchParams.get('countryName');

    const isDiscover = !!(year || genre || language || country);

    const getTitle = () => {
        if (year) return `Films from ${year}`;
        if (genre) return `${genreName || 'Genre'} Films`;
        if (language) return `${languageName || language} Language Films`;
        if (country) return `Films from ${countryName || country}`;
        switch (category) {
            case 'trending': return 'Trending Movies';
            case 'top-rated': return 'High Rated Movies';
            default: return 'Movies';
        }
    };

    const fetchMovies = useCallback(async (pageNum) => {
        setLoading(true);
        try {
            let url = '';
            if (isDiscover) {
                const params = new URLSearchParams({ page: pageNum });
                if (year) params.set('year', year);
                if (genre) params.set('genre', genre);
                if (language) params.set('language', language);
                if (country) params.set('country', country);
                url = `${API_BASE_URL}/api/movies/filter/discover?${params}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setMovies(data.results || []);
                    setTotalPages(Math.min(data.total_pages || 1, 500));
                }
            } else {
                if (category === 'trending') url = `${API_BASE_URL}/api/movies/trending`;
                else if (category === 'top-rated') url = `${API_BASE_URL}/api/movies/top-rated`;
                if (url) {
                    const res = await fetch(url);
                    if (res.ok) setMovies(await res.json());
                }
            }
        } catch (err) {
            console.error('Error fetching movies:', err);
        } finally {
            setLoading(false);
        }
    }, [category, isDiscover, year, genre, language, country]);

    useEffect(() => {
        setPage(1);
        fetchMovies(1);
    }, [category, year, genre, language, country]);

    useEffect(() => {
        if (page > 1) fetchMovies(page);
    }, [page]);

    return (
        <div className="films-page-container">
            <Navbar />
            <div className="films-content">
                <div className="section-header">
                    <h2 className="section-title">{getTitle()}</h2>
                    <button className="see-more-btn" onClick={() => navigate(-1)}>← Back</button>
                </div>

                {loading ? (
                    <div style={{ color: '#9ab', padding: '20px' }}>Loading...</div>
                ) : movies.length === 0 ? (
                    <div style={{ color: '#9ab', padding: '20px' }}>No movies found.</div>
                ) : (
                    <>
                        <div className="movies-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                            {movies.map(movie => (
                                <div key={movie.id} className="movie-card-container">
                                    <MoviePoster
                                        movie={movie}
                                        showTitleTooltip={true}
                                        onClick={() => navigate(`/movie/${movie.id}`)}
                                    />
                                </div>
                            ))}
                        </div>

                        {isDiscover && totalPages > 1 && (
                            <div className="discover-pagination">
                                <button
                                    className="page-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >← Prev</button>
                                <span className="page-info">Page {page} of {totalPages}</span>
                                <button
                                    className="page-btn"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >Next →</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FilmsCategoryPage;
