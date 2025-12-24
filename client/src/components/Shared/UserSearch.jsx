import { useState, useEffect } from 'react';
import axios from 'axios';
import './UserSearch.css';

function UserSearch({ onSelect, token, placeholder = "Search users..." }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await axios.get(`/api/users/search?q=${query}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResults(response.data.users || []);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (query) searchUsers();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, token]);

    const handleSelect = (user) => {
        setQuery(user.username);
        setShowResults(false);
        if (onSelect) onSelect(user);
    };

    return (
        <div className="user-search-container relative">
            <input
                type="text"
                className="input w-full"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowResults(true);
                    if (!e.target.value) onSelect(null);
                }}
                onFocus={() => setShowResults(true)}
            />

            {showResults && (query.trim() !== '') && (
                <div className="search-results absolute w-full mt-1 glass-panel z-50 max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-sm text-center text-muted text-sm">Searching...</div>
                    ) : results.length > 0 ? (
                        results.map(user => (
                            <div
                                key={user.id}
                                className="search-result-item p-sm hover:bg-white/10 cursor-pointer flex items-center gap-sm transition-colors"
                                onClick={() => handleSelect(user)}
                            >
                                <div className="user-avatar w-8 h-8 text-xs">{user.username[0].toUpperCase()}</div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{user.username}</span>
                                    <span className="text-xs text-muted truncate max-w-[150px]">{user.publicKey.substring(0, 10)}...</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-sm text-center text-muted text-sm">No users found</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserSearch;
