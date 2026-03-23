import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import './MembersPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const MembersPage = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [followingIds, setFollowingIds] = useState(new Set());

    useEffect(() => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        Promise.all([
            fetch(`${API_BASE_URL}/api/users/all`, { headers }).then(r => r.ok ? r.json() : []),
            user ? fetch(`${API_BASE_URL}/api/users/${user.id}/following-ids`, { headers }).then(r => r.ok ? r.json() : []) : Promise.resolve([]),
        ]).then(([allUsers, followingIdsList]) => {
            setMembers(allUsers);
            if (Array.isArray(followingIdsList)) {
                setFollowingIds(new Set(followingIdsList.map(String)));
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [user, token]);

    const handleFollow = async (e, memberId) => {
        e.stopPropagation();
        if (!user) { navigate('/signin'); return; }
        const isFollowing = followingIds.has(String(memberId));
        const endpoint = isFollowing ? 'unfollow' : 'follow';
        try {
            await fetch(`${API_BASE_URL}/api/users/${memberId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setFollowingIds(prev => {
                const next = new Set(prev);
                isFollowing ? next.delete(String(memberId)) : next.add(String(memberId));
                return next;
            });
            setMembers(prev => prev.map(m =>
                String(m.id) === String(memberId)
                    ? { ...m, followersCount: m.followersCount + (isFollowing ? -1 : 1) }
                    : m
            ));
        } catch (err) { console.error(err); }
    };

    const filtered = members.filter(m =>
        (!user || String(m.id) !== String(user.id)) &&
        (!searchQuery || m.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort: most followers first
    const sorted = [...filtered].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));

    return (
        <div className="members-page">
            <Navbar />
            <div className="members-content">
                <div className="members-hero">
                    <p className="members-tagline">Film lovers, critics and friends — find popular members.</p>
                </div>

                <div className="members-search-row">
                    <input
                        className="members-search"
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="members-loading">Loading members...</div>
                ) : sorted.length === 0 ? (
                    <div className="members-empty">No members found.</div>
                ) : (
                    <>
                        <div className="members-section-label">
                            {searchQuery ? 'SEARCH RESULTS' : 'ALL MEMBERS'}
                        </div>
                        <div className="members-grid">
                            {sorted.map(member => {
                                const isFollowing = followingIds.has(String(member.id));
                                return (
                                    <div
                                        key={member.id}
                                        className="member-card"
                                        onClick={() => navigate(`/user/${member.id}`)}
                                    >
                                        <div className="member-avatar-wrap">
                                            <img
                                                src={member.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2c3440&color=9ab&size=128`}
                                                alt={member.name}
                                                className="member-avatar"
                                                onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2c3440&color=9ab&size=128`; }}
                                            />
                                            <button
                                                    className={`member-follow-btn ${isFollowing ? 'following' : ''}`}
                                                    onClick={e => handleFollow(e, member.id)}
                                                    title={isFollowing ? 'Unfollow' : 'Follow'}
                                                >
                                                    {isFollowing ? '✓' : '+'}
                                                </button>
                                        </div>
                                        <div className="member-name">{member.name}</div>
                                        <div className="member-stats">
                                            {member.filmsCount > 0 && (
                                                <span>{member.filmsCount >= 1000 ? `${(member.filmsCount / 1000).toFixed(1)}K` : member.filmsCount} films</span>
                                            )}
                                            {member.filmsCount > 0 && member.reviewsCount > 0 && <span className="member-dot">•</span>}
                                            {member.reviewsCount > 0 && (
                                                <span>{member.reviewsCount >= 1000 ? `${(member.reviewsCount / 1000).toFixed(1)}K` : member.reviewsCount} reviews</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MembersPage;
