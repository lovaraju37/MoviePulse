import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import MoviePoster from './MoviePoster';
import { useNavigate } from 'react-router-dom';
import './FilmsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const FilmsPage = () => {
    const navigate = useNavigate();
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [topRatedMovies, setTopRatedMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trendingRes, topRatedRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/movies/trending`),
                    fetch(`${API_BASE_URL}/api/movies/top-rated`)
                ]);

                if (trendingRes.ok) {
                    const data = await trendingRes.json();
                    setTrendingMovies(data);
                }
                
                if (topRatedRes.ok) {
                    const data = await topRatedRes.json();
                    setTopRatedMovies(data);
                }
            } catch (error) {
                console.error("Error fetching films data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const MovieSection = ({ title, movies, category }) => {
        // We only show 4 movies initially as per requirement
        const displayMovies = movies.slice(0, 4);

        const handleSeeMore = () => {
            navigate(`/films/${category}`);
        };

        return (
            <div className="films-section">
                <div className="section-header">
                    <h2 className="section-title">{title}</h2>
                    <button className="see-more-btn" onClick={handleSeeMore}>
                        See more
                    </button>
                </div>
                <div className="movies-grid">
                    {displayMovies.map(movie => (
                        <div key={movie.id} className="movie-card-container">
                            <MoviePoster 
                                movie={movie}
                                showTitleTooltip={true}
                                onClick={() => navigate(`/movie/${movie.id}`)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="films-page-container">
            <Navbar />
            <div className="films-content">
                {loading ? (
                    <div>Loading films...</div>
                ) : (
                    <>
                        <MovieSection title="Trending Movies" movies={trendingMovies} category="trending" />
                        <MovieSection title="High Rated Movies" movies={topRatedMovies} category="top-rated" />
                    </>
                )}
            </div>
        </div>
    );
};

export default FilmsPage;
