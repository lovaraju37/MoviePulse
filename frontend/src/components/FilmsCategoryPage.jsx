import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import MoviePoster from './MoviePoster';
import { useParams, useNavigate } from 'react-router-dom';
import './FilmsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const FilmsCategoryPage = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    const getTitle = () => {
        switch(category) {
            case 'trending': return 'Trending Movies';
            case 'top-rated': return 'High Rated Movies';
            default: return 'Movies';
        }
    };

    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            try {
                let url = '';
                if (category === 'trending') {
                    url = `${API_BASE_URL}/api/movies/trending`;
                } else if (category === 'top-rated') {
                    url = `${API_BASE_URL}/api/movies/top-rated`;
                }

                if (url) {
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        setMovies(data);
                    }
                }
            } catch (error) {
                console.error("Error fetching category movies:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [category]);

    return (
        <div className="films-page-container">
            <Navbar />
            <div className="films-content">
                <div className="section-header">
                    <h2 className="section-title">{getTitle()}</h2>
                    <button className="see-more-btn" onClick={() => navigate('/films')}>
                        Back to Films
                    </button>
                </div>
                
                {loading ? (
                    <div>Loading...</div>
                ) : (
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
                )}
            </div>
        </div>
    );
};

export default FilmsCategoryPage;
