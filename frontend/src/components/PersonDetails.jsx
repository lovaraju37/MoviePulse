import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import MoviePoster from './MoviePoster';
import './PersonDetails.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PersonDetails = () => {
    const { id } = useParams();
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [person, setPerson] = useState(null);
    const [credits, setCredits] = useState({ cast: [], crew: [] });
    const [loading, setLoading] = useState(true);
    const [activeDepartment, setActiveDepartment] = useState(location.state?.department || 'Acting');
    const [sortBy, setSortBy] = useState('popularity');
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
    const [watchedIds, setWatchedIds] = useState(new Set());
    const roleDropdownRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const [personRes, creditsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/movies/person/${id}`, { headers }),
                    fetch(`${API_BASE_URL}/api/movies/person/${id}/movie_credits`, { headers })
                ]);
                const personData = await personRes.json();
                const creditsData = await creditsRes.json();
                setPerson(personData);
                setCredits(creditsData);

                const hasActing = creditsData.cast && creditsData.cast.length > 0;
                const crewDepts = creditsData.crew ? [...new Set(creditsData.crew.map(c => c.department))] : [];
                const requested = location.state?.department;
                let validDept = null;
                if (requested === 'Acting' && hasActing) validDept = 'Acting';
                else if (requested && crewDepts.includes(requested)) validDept = requested;
                if (!validDept) validDept = hasActing ? 'Acting' : crewDepts[0] || null;
                if (validDept) setActiveDepartment(validDept);
            } catch (err) {
                console.error('Failed to fetch person details', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, token]);

    // Fetch user's watched movies
    useEffect(() => {
        if (!user || !token) return;
        fetch(`${API_BASE_URL}/api/watched/user/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
            const ids = new Set(data.map(w => String(w.movieId || w.tmdbId || w.id)));
            setWatchedIds(ids);
        })
        .catch(() => {});
    }, [user, token]);

    // Close role dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
                setRoleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const getCreditsForDept = (dept) => {
        const list = dept === 'Acting'
            ? (credits.cast || [])
            : (credits.crew || []).filter(c => c.department === dept);
        return Array.from(new Map(list.map(item => [item.id, item])).values());
    };

    const getFilteredAndSortedCredits = () => {
        const unique = getCreditsForDept(activeDepartment);
        return unique.sort((a, b) => {
            if (sortBy === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
            if (sortBy === 'newest') return new Date(b.release_date || 0) - new Date(a.release_date || 0);
            if (sortBy === 'oldest') return new Date(a.release_date || 0) - new Date(b.release_date || 0);
            return (b.popularity || 0) - (a.popularity || 0);
        });
    };

    if (loading) return <div className="landing-container"><Navbar /><div className="person-loading">Loading...</div></div>;
    if (!person) return <div className="landing-container"><Navbar /><div className="person-loading">Person not found</div></div>;

    const availableDepartments = new Set();
    if (credits.cast && credits.cast.length > 0) availableDepartments.add('Acting');
    if (credits.crew) credits.crew.forEach(c => availableDepartments.add(c.department));
    const departmentsList = Array.from(availableDepartments).sort((a, b) => {
        if (a === 'Acting') return -1;
        if (b === 'Acting') return 1;
        return a.localeCompare(b);
    });

    const filteredCredits = getFilteredAndSortedCredits();
    const totalMovies = filteredCredits.length;
    const watchedCount = filteredCredits.filter(m => watchedIds.has(String(m.id))).length;
    const watchedPct = totalMovies > 0 ? Math.round((watchedCount / totalMovies) * 100) : 0;

    // Label for the role dropdown button
    const roleLabel = activeDepartment === 'Acting' ? 'ACTOR' : activeDepartment.toUpperCase();

    return (
        <div className="landing-container">
            <Navbar />
            <div className="person-page">
                {/* Left: films grid */}
                <div className="person-main">
                    <div className="person-films-header">
                        <span className="person-films-label">FILMS STARRING</span>
                        <h1 className="person-films-name">{person.name}</h1>
                    </div>

                    <div className="person-filters">
                        {/* Role dropdown */}
                        <div className="person-role-dropdown" ref={roleDropdownRef}>
                            <button
                                className="person-role-btn"
                                onClick={() => setRoleDropdownOpen(o => !o)}
                            >
                                {roleLabel} <span className="person-role-chevron">▾</span>
                            </button>
                            {roleDropdownOpen && (
                                <div className="person-role-menu">
                                    {departmentsList.map(dept => {
                                        const count = getCreditsForDept(dept).length;
                                        return (
                                            <div
                                                key={dept}
                                                className={`person-role-item ${activeDepartment === dept ? 'active' : ''}`}
                                                onClick={() => { setActiveDepartment(dept); setRoleDropdownOpen(false); }}
                                            >
                                                <span>{dept === 'Acting' ? 'Actor' : dept}</span>
                                                <span className="person-role-count">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="person-sort">
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="popularity">Sort by POPULARITY</option>
                                <option value="rating">Sort by RATING</option>
                                <option value="newest">Sort by NEWEST</option>
                                <option value="oldest">Sort by OLDEST</option>
                            </select>
                        </div>
                    </div>

                    <div className="person-grid">
                        {filteredCredits.length > 0 ? filteredCredits.map(movie => (
                            <div
                                key={`${movie.id}-${movie.job || 'cast'}`}
                                className="person-movie-card"
                                onClick={() => navigate(`/movie/${movie.id}`)}
                            >
                                {/* Tooltip */}
                                <div className="person-card-tooltip">
                                    {movie.title}
                                    {movie.release_date ? ` (${movie.release_date.substring(0, 4)})` : ''}
                                    {activeDepartment === 'Acting' && movie.character ? ` as ${movie.character}` : ''}
                                    {activeDepartment !== 'Acting' && movie.job ? ` · ${movie.job}` : ''}
                                </div>
                                <MoviePoster
                                    movie={movie}
                                    showTitleTooltip={false}
                                    isWatched={watchedIds.has(String(movie.id))}
                                    onWatchToggle={() => {
                                        const mid = String(movie.id);
                                        const alreadyWatched = watchedIds.has(mid);
                                        const token = localStorage.getItem('token');
                                        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
                                        if (alreadyWatched) {
                                            fetch(`${API_BASE_URL}/api/watched/${mid}`, { method: 'DELETE', headers })
                                                .then(r => { if (r.ok) setWatchedIds(prev => { const n = new Set(prev); n.delete(mid); return n; }); });
                                        } else {
                                            fetch(`${API_BASE_URL}/api/watched`, {
                                                method: 'POST', headers,
                                                body: JSON.stringify({ movieId: mid, title: movie.title, posterPath: movie.poster_path, voteAverage: movie.vote_average, releaseDate: movie.release_date })
                                            }).then(r => { if (r.ok) setWatchedIds(prev => new Set([...prev, mid])); });
                                        }
                                    }}
                                />
                            </div>
                        )) : (
                            <div className="person-no-credits">No credits found.</div>
                        )}
                    </div>
                </div>

                {/* Right: sidebar */}
                <div className="person-sidebar">
                    <div className="person-sidebar-photo">
                        <img
                            src={person.profile_path
                                ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
                                : 'https://via.placeholder.com/240x320?text=No+Image'}
                            alt={person.name}
                        />
                    </div>

                    <a
                        href={`https://www.themoviedb.org/person/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="person-tmdb-link"
                    >
                        More details at <span>TMDB</span>
                    </a>

                    {/* Watched box */}
                    <div className="person-watched-box">
                        <div className="person-watched-top">
                            <div className="person-watched-text">
                                <div>You've watched</div>
                                <div className="person-watched-fraction">{watchedCount} of {totalMovies}</div>
                            </div>
                            <div className="person-watched-pct">{watchedPct}<span>%</span></div>
                        </div>
                        <div className="person-watched-bar">
                            <div className="person-watched-fill" style={{ width: `${watchedPct}%` }} />
                        </div>
                    </div>

                    {person.birthday && (
                        <div className="person-sidebar-meta">
                            <div><span>Born</span> {person.birthday}{person.place_of_birth ? ` · ${person.place_of_birth}` : ''}</div>
                            {person.deathday && <div><span>Died</span> {person.deathday}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PersonDetails;
