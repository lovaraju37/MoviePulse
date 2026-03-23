import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import MoviePoster from "./MoviePoster";
import { useAuth } from "../context/AuthContext";
import { EditListModal } from "./ListsPage";
import "./ListDetailPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const ListDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [list, setList] = useState(null);
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [author, setAuthor] = useState(null);
    const [editing, setEditing] = useState(false);
    const [posterCache, setPosterCache] = useState({});
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        fetch(`${API_BASE_URL}/api/lists/${id}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(async data => {
                if (!data) { setLoading(false); return; }
                setList(data);
                // fetch author
                if (data.authorId) {
                    fetch(`${API_BASE_URL}/api/users/${data.authorId}`, { headers })
                        .then(r => r.ok ? r.json() : null)
                        .then(u => setAuthor(u));
                }
                // fetch movie details
                const movieDetails = await Promise.all(
                    (data.movieIds || []).map(mid =>
                        fetch(`${API_BASE_URL}/api/movies/${mid}`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    )
                );
                const valid = movieDetails.filter(Boolean);
                setMovies(valid);
                const cache = {};
                valid.forEach(m => { cache[String(m.id)] = m.poster_path; });
                setPosterCache(cache);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id, token]);

    const isOwn = user && list && String(list.authorId) === String(user.id);

    const handleTogglePrivate = async () => {
        if (!isOwn) return;
        const r = await fetch(`${API_BASE_URL}/api/lists/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...list, visibility: list.isPublic ? "private" : "public" }),
        });
        if (r.ok) setList(await r.json());
        setMenuOpen(false);
    };

    const handleDelete = async () => {
        if (!isOwn || !window.confirm("Delete this list?")) return;
        const r = await fetch(`${API_BASE_URL}/api/lists/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) navigate(isOwn ? "/profile/lists" : "/lists");
    };

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href);
        setMenuOpen(false);
    };

    if (loading) return <div className="ldp-page"><Navbar /><div className="ldp-loading">Loading...</div></div>;
    if (!list) return <div className="ldp-page"><Navbar /><div className="ldp-loading">List not found.</div></div>;

    const authorName = author?.name || list.authorName || "Unknown";
    const authorAvatar = author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=2c3440&color=9ab&size=64`;
    const updatedAt = list.createdAt ? new Date(list.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

    return (
        <div className="ldp-page">
            <Navbar />
            <div className="ldp-layout">
                {/* ── Main content ── */}
                <div className="ldp-main">
                    {/* Author row */}
                    <div className="ldp-author-row">
                        <img
                            src={authorAvatar}
                            alt={authorName}
                            className="ldp-author-avatar"
                            onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=2c3440&color=9ab&size=64`; }}
                        />
                        <span className="ldp-author-text">List by <strong>{authorName}</strong></span>
                    </div>

                    {/* Meta row */}
                    <div className="ldp-meta-row">
                        {updatedAt && <span className="ldp-updated">Updated {updatedAt}</span>}
                        {!list.isPublic && <span className="ldp-private-badge">Private</span>}
                    </div>

                    {/* Title */}
                    <h1 className="ldp-title">{list.name}</h1>
                    {list.description && <p className="ldp-desc">{list.description}</p>}
                    {list.tags && (
                        <div className="ldp-tags">
                            {list.tags.split(",").filter(Boolean).map(t => (
                                <span key={t} className="ldp-tag">{t.trim()}</span>
                            ))}
                        </div>
                    )}

                    {/* Film count */}
                    <div className="ldp-film-count">{movies.length} film{movies.length !== 1 ? "s" : ""}</div>

                    {/* Poster grid */}
                    <div className="ldp-grid">
                        {movies.map((movie, i) => (
                            <div key={movie.id} className="ldp-grid-item">
                                {list.ranked && <div className="ldp-rank">{i + 1}</div>}
                                <MoviePoster movie={movie} showTitleTooltip={true} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div className="ldp-sidebar">
                    <div className="ldp-sidebar-box">
                        {isOwn ? (
                            <>
                                <button className="ldp-sidebar-btn" onClick={() => { setEditing(true); setMenuOpen(false); }}>
                                    Edit or delete this list...
                                </button>
                                <button className="ldp-sidebar-btn" onClick={handleTogglePrivate}>
                                    {list.isPublic ? "Make this list private" : "Make this list public"}
                                </button>
                                <button className="ldp-sidebar-btn" onClick={handleShare}>
                                    Share
                                </button>
                                <button className="ldp-sidebar-btn ldp-sidebar-btn--danger" onClick={handleDelete}>
                                    Delete list
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="ldp-sidebar-btn" onClick={handleShare}>Share</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {editing && (
                <EditListModal
                    token={token}
                    list={list}
                    posterCache={posterCache}
                    onClose={() => setEditing(false)}
                    onSaved={updated => { setList(updated); setEditing(false); }}
                />
            )}
        </div>
    );
};

export default ListDetailPage;
