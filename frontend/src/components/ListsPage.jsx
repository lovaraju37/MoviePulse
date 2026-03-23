import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import "./ListsPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── Drag-to-reorder hook ──────────────────────────────────────────────────────
function useDragSort(items, setItems) {
    const [draggingIdx, setDraggingIdx] = useState(null);
    const dragIdxRef = useRef(null);

    const handleMouseDown = (e, i) => {
        // ignore clicks on the remove button
        if (e.target.closest(".nl-remove-film")) return;
        e.preventDefault();
        dragIdxRef.current = i;
        setDraggingIdx(i);

        const onMouseMove = (me) => {
            const els = document.querySelectorAll(".nl-selected-film");
            let found = null;
            els.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                if (me.clientY >= rect.top && me.clientY <= rect.bottom) found = idx;
            });
            if (found !== null && found !== dragIdxRef.current) {
                setItems(prev => {
                    const next = [...prev];
                    const [moved] = next.splice(dragIdxRef.current, 1);
                    next.splice(found, 0, moved);
                    dragIdxRef.current = found;
                    return next;
                });
                setDraggingIdx(found);
            }
        };

        const onMouseUp = () => {
            dragIdxRef.current = null;
            setDraggingIdx(null);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };

    return { draggingIdx, handleMouseDown };
}

// ── New List Modal ────────────────────────────────────────────────────────────
export const NewListModal = ({ token, onClose, onCreated }) => {
    const [form, setForm] = useState({ name: "", description: "", visibility: "public", ranked: false });
    const [tagInput, setTagInput] = useState("");
    const [tagList, setTagList] = useState([]);
    const [filmSearch, setFilmSearch] = useState("");
    const [filmResults, setFilmResults] = useState([]);
    const [selectedFilms, setSelectedFilms] = useState([]);
    const [searchTimer, setSearchTimer] = useState(null);
    const { draggingIdx, handleMouseDown } = useDragSort(selectedFilms, setSelectedFilms);

    const handleTagKey = (e) => {
        if ((e.key === "Tab" || e.key === "Enter") && tagInput.trim()) {
            e.preventDefault();
            if (!tagList.includes(tagInput.trim())) setTagList(p => [...p, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleFilmSearch = (val) => {
        setFilmSearch(val);
        clearTimeout(searchTimer);
        if (!val.trim()) { setFilmResults([]); return; }
        setSearchTimer(setTimeout(async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(val)}`);
                const data = await r.json();
                setFilmResults((data.results || data).slice(0, 6));
            } catch {}
        }, 350));
    };

    const addFilm = (film) => {
        if (!selectedFilms.find(f => String(f.id) === String(film.id)))
            setSelectedFilms(p => [...p, film]);
        setFilmSearch(""); setFilmResults([]);
    };

    const removeFilm = (id) => setSelectedFilms(p => p.filter(f => String(f.id) !== String(id)));

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            const r = await fetch(`${API_BASE_URL}/api/lists`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    name: form.name, description: form.description,
                    tags: tagList.join(","), visibility: form.visibility,
                    ranked: form.ranked, movieIds: selectedFilms.map(f => String(f.id)),
                }),
            });
            if (r.ok) { onCreated(await r.json()); onClose(); }
        } catch {}
    };

    return (
        <div className="nl-overlay" onClick={onClose}>
            <div className="nl-modal" onClick={e => e.stopPropagation()}>
                <h2 className="nl-title">New List</h2>
                <div className="nl-body">
                    <div className="nl-left">
                        <div className="nl-field">
                            <label className="nl-label"><span className="nl-required">&#9679;</span> Name</label>
                            <input className="nl-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="nl-field">
                            <label className="nl-label">Tags <span className="nl-hint">Press Tab or Enter to add</span></label>
                            <div className="nl-tags-wrap">
                                {tagList.map(t => (
                                    <span key={t} className="nl-tag">{t} <button onClick={() => setTagList(p => p.filter(x => x !== t))}>x</button></span>
                                ))}
                                <input className="nl-tag-input" placeholder="eg. top 10" value={tagInput}
                                    onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} />
                            </div>
                        </div>
                        <div className="nl-field">
                            <label className="nl-label">Who can view</label>
                            <select className="nl-select" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                                <option value="public">Anyone - Public list</option>
                                <option value="private">Only me - Private list</option>
                            </select>
                        </div>
                        <div className="nl-field nl-ranked-row">
                            <input type="checkbox" id="nl-ranked" checked={form.ranked} onChange={e => setForm(f => ({ ...f, ranked: e.target.checked }))} />
                            <label htmlFor="nl-ranked" className="nl-ranked-label">Ranked list</label>
                            <span className="nl-hint">Show position for each film.</span>
                        </div>
                    </div>
                    <div className="nl-right">
                        <div className="nl-field">
                            <label className="nl-label">Description</label>
                            <textarea className="nl-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                    </div>
                </div>
                <div className="nl-film-bar">
                    <button className="nl-add-film-btn">ADD A FILM</button>
                    <div className="nl-film-search-wrap">
                        <input className="nl-film-input" placeholder="Enter name of film..."
                            value={filmSearch} onChange={e => handleFilmSearch(e.target.value)} />
                        {filmResults.length > 0 && (
                            <div className="nl-film-dropdown">
                                {filmResults.map(f => (
                                    <div key={f.id} className="nl-film-option" onClick={() => addFilm(f)}>
                                        {f.poster_path && <img src={`https://image.tmdb.org/t/p/w45${f.poster_path}`} alt="" />}
                                        <span>{f.title} {f.release_date ? `(${f.release_date.slice(0, 4)})` : ""}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="nl-actions">
                        <button className="nl-cancel-btn" onClick={onClose}>CANCEL</button>
                        <button className="nl-save-btn" onClick={handleSave}>SAVE</button>
                    </div>
                </div>
                {selectedFilms.length === 0 ? (
                    <div className="nl-empty-films">
                        <p><strong>Your list is empty.</strong></p>
                        <p>Add films using the field above, or from the links on a film poster or page.</p>
                    </div>
                ) : (
                    <div className="nl-selected-films">
                        {selectedFilms.map((f, i) => (
                            <div key={f.id}
                                className={`nl-selected-film${draggingIdx === i ? " nl-dragging" : ""}`}
                                onMouseDown={e => handleMouseDown(e, i)}
                            >
                                <span className="nl-drag-handle" aria-hidden="true">&#8942;&#8942;</span>
                                {form.ranked && <span className="nl-rank">{i + 1}</span>}
                                {f.poster_path && <img src={`https://image.tmdb.org/t/p/w45${f.poster_path}`} alt="" />}
                                <span className="nl-film-title">{f.title}</span>
                                <button className="nl-remove-film" onClick={() => removeFilm(f.id)}>x</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Edit List Modal ───────────────────────────────────────────────────────────
export const EditListModal = ({ token, list, posterCache, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: list.name || "",
        description: list.description || "",
        visibility: list.isPublic ? "public" : "private",
        ranked: list.ranked || false,
    });
    const [tagInput, setTagInput] = useState("");
    const [tagList, setTagList] = useState(
        (list.tags || "").split(",").map(t => t.trim()).filter(Boolean)
    );
    const [filmSearch, setFilmSearch] = useState("");
    const [filmResults, setFilmResults] = useState([]);
    const [selectedFilms, setSelectedFilms] = useState(
        (list.movieIds || []).map(id => ({
            id,
            title: "",
            poster_path: (posterCache && posterCache[id]) || null,
        }))
    );
    const [searchTimer, setSearchTimer] = useState(null);
    const { draggingIdx, handleMouseDown } = useDragSort(selectedFilms, setSelectedFilms);

    // Fetch titles/posters for existing films
    useState(() => {
        (list.movieIds || []).forEach(async id => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/movies/${id}`);
                if (r.ok) {
                    const m = await r.json();
                    setSelectedFilms(prev => prev.map(f =>
                        String(f.id) === String(id) ? { ...f, title: m.title, poster_path: m.poster_path } : f
                    ));
                }
            } catch {}
        });
    }, []);

    const handleTagKey = (e) => {
        if ((e.key === "Tab" || e.key === "Enter") && tagInput.trim()) {
            e.preventDefault();
            if (!tagList.includes(tagInput.trim())) setTagList(p => [...p, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleFilmSearch = (val) => {
        setFilmSearch(val);
        clearTimeout(searchTimer);
        if (!val.trim()) { setFilmResults([]); return; }
        setSearchTimer(setTimeout(async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(val)}`);
                const data = await r.json();
                setFilmResults((data.results || data).slice(0, 6));
            } catch {}
        }, 350));
    };

    const addFilm = (film) => {
        if (!selectedFilms.find(f => String(f.id) === String(film.id)))
            setSelectedFilms(p => [...p, film]);
        setFilmSearch(""); setFilmResults([]);
    };

    const removeFilm = (id) => setSelectedFilms(p => p.filter(f => String(f.id) !== String(id)));

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            const r = await fetch(`${API_BASE_URL}/api/lists/${list.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    name: form.name, description: form.description,
                    tags: tagList.join(","), visibility: form.visibility,
                    ranked: form.ranked, movieIds: selectedFilms.map(f => String(f.id)),
                }),
            });
            if (r.ok) { onSaved(await r.json()); onClose(); }
        } catch {}
    };

    return (
        <div className="nl-overlay" onClick={onClose}>
            <div className="nl-modal" onClick={e => e.stopPropagation()}>
                <h2 className="nl-title">Edit List</h2>
                <div className="nl-body">
                    <div className="nl-left">
                        <div className="nl-field">
                            <label className="nl-label"><span className="nl-required">&#9679;</span> Name</label>
                            <input className="nl-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="nl-field">
                            <label className="nl-label">Tags <span className="nl-hint">Press Tab or Enter to add</span></label>
                            <div className="nl-tags-wrap">
                                {tagList.map(t => (
                                    <span key={t} className="nl-tag">{t} <button onClick={() => setTagList(p => p.filter(x => x !== t))}>x</button></span>
                                ))}
                                <input className="nl-tag-input" placeholder="eg. top 10" value={tagInput}
                                    onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} />
                            </div>
                        </div>
                        <div className="nl-field">
                            <label className="nl-label">Who can view</label>
                            <select className="nl-select" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                                <option value="public">Anyone - Public list</option>
                                <option value="private">Only me - Private list</option>
                            </select>
                        </div>
                        <div className="nl-field nl-ranked-row">
                            <input type="checkbox" id="el-ranked" checked={form.ranked} onChange={e => setForm(f => ({ ...f, ranked: e.target.checked }))} />
                            <label htmlFor="el-ranked" className="nl-ranked-label">Ranked list</label>
                            <span className="nl-hint">Show position for each film.</span>
                        </div>
                    </div>
                    <div className="nl-right">
                        <div className="nl-field">
                            <label className="nl-label">Description</label>
                            <textarea className="nl-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                    </div>
                </div>
                <div className="nl-film-bar">
                    <button className="nl-add-film-btn">ADD A FILM</button>
                    <div className="nl-film-search-wrap">
                        <input className="nl-film-input" placeholder="Enter name of film..."
                            value={filmSearch} onChange={e => handleFilmSearch(e.target.value)} />
                        {filmResults.length > 0 && (
                            <div className="nl-film-dropdown">
                                {filmResults.map(f => (
                                    <div key={f.id} className="nl-film-option" onClick={() => addFilm(f)}>
                                        {f.poster_path && <img src={`https://image.tmdb.org/t/p/w45${f.poster_path}`} alt="" />}
                                        <span>{f.title} {f.release_date ? `(${f.release_date.slice(0, 4)})` : ""}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="nl-actions">
                        <button className="nl-cancel-btn" onClick={onClose}>CANCEL</button>
                        <button className="nl-save-btn" onClick={handleSave}>SAVE</button>
                    </div>
                </div>
                {selectedFilms.length === 0 ? (
                    <div className="nl-empty-films">
                        <p><strong>Your list is empty.</strong></p>
                        <p>Add films using the field above.</p>
                    </div>
                ) : (
                    <div className="nl-selected-films">
                        {selectedFilms.map((f, i) => (
                            <div key={f.id}
                                className={`nl-selected-film${draggingIdx === i ? " nl-dragging" : ""}`}
                                onMouseDown={e => handleMouseDown(e, i)}
                            >
                                <span className="nl-drag-handle" aria-hidden="true">&#8942;&#8942;</span>
                                {form.ranked && <span className="nl-rank">{i + 1}</span>}
                                {f.poster_path && <img src={`https://image.tmdb.org/t/p/w45${f.poster_path}`} alt="" />}
                                <span className="nl-film-title">{f.title || f.id}</span>
                                <button className="nl-remove-film" onClick={() => removeFilm(f.id)}>x</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Lists Page (header/discovery) ─────────────────────────────────────────────
const ListsPage = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useState(() => {
        fetch(`${API_BASE_URL}/api/lists/all`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => { setLists(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [token]);

    const filtered = lists.filter(l =>
        !search ||
        l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.authorName?.toLowerCase().includes(search.toLowerCase())
    );

    const openPicker = () => {
        if (!user) { navigate("/signin"); return; }
        setShowTypePicker(true);
    };

    return (
        <div className="lists-page">
            <Navbar />
            <div className="lists-page-content">
                <div className="lists-page-hero">
                    <p className="lists-page-tagline">Collect, curate, and share. Lists are the perfect way to group films.</p>
                    <button className="lists-page-start-btn" onClick={openPicker}>Start your own list</button>
                </div>

                <div className="lists-page-search-row">
                    <input className="lists-page-search" type="text" placeholder="Search lists..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {loading ? (
                    <div className="lists-page-loading">Loading lists...</div>
                ) : filtered.length === 0 ? (
                    <div className="lists-page-empty">
                        {search ? "No lists match your search." : "No lists yet. Be the first to create one."}
                    </div>
                ) : (
                    <>
                        <div className="lists-page-section-label">
                            {search ? "SEARCH RESULTS" : "ALL LISTS"}
                        </div>
                        <div className="lists-page-grid">
                            {filtered.map(list => (
                                <div key={list.id} className="lists-page-card"
                                    onClick={() => navigate(`/lists/${list.id}`)}
                                >
                                    <div className="lists-page-card-main">
                                        <div className="lists-page-card-title">{list.name}</div>
                                        {list.description && <div className="lists-page-card-desc">{list.description}</div>}
                                        <div className="lists-page-card-meta">
                                            <span>{list.filmCount} film{list.filmCount !== 1 ? "s" : ""}</span>
                                            {list.tags && list.tags.split(",").filter(Boolean).map(t => (
                                                <span key={t} className="lists-page-tag">{t.trim()}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="lists-page-card-author">
                                        <img
                                            src={list.authorPicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(list.authorName || "User")}&background=2c3440&color=9ab&size=64`}
                                            alt={list.authorName}
                                            className="lists-page-author-avatar"
                                            onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(list.authorName || "User")}&background=2c3440&color=9ab&size=64`; }}
                                        />
                                        <span className="lists-page-author-name">{list.authorName}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {showTypePicker && (
                <div className="nl-overlay" onClick={() => setShowTypePicker(false)}>
                    <div className="list-type-picker" onClick={e => e.stopPropagation()}>
                        <h2 className="list-type-title">What kind of list?</h2>
                        <div className="list-type-options">
                            <div className="list-type-card" onClick={() => { setShowTypePicker(false); setShowModal(true); }}>
                                <div className="list-type-icon">🎬</div>
                                <div className="list-type-name">Films</div>
                                <div className="list-type-desc">A list of movies</div>
                            </div>
                            <div className="list-type-card list-type-card--soon">
                                <div className="list-type-icon">🎭</div>
                                <div className="list-type-name">Cast / Characters</div>
                                <div className="list-type-desc">Coming soon</div>
                                <span className="list-type-badge">Soon</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <NewListModal token={token} onClose={() => setShowModal(false)}
                    onCreated={() => { setShowModal(false); navigate("/profile/lists"); }} />
            )}
        </div>
    );
};

export default ListsPage;
