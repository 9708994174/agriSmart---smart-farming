import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';

export default function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => { loadHistory(); }, [filter]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const type = filter === 'all' ? undefined : filter;
            const res = await dashboardAPI.getSearchHistory(type, 50);
            setHistory(res.data?.history || []);
        } catch {
            setHistory([]);
        } finally { setLoading(false); }
    };

    const typeIcons = {
        chat: '💬', crop_prediction: '🌾', disease_detection: '🔬',
        weather: '🌤️', market: '📊', default: '📋'
    };

    const typeColors = {
        chat: '#2d7a3a', crop_prediction: '#4caf50', disease_detection: '#f5a623',
        weather: '#1e88e5', market: '#e53935', default: '#7a9a7a'
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>📋 History</h1>
                <p>View your past queries, predictions, and searches</p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'chat', label: '💬 Chat' },
                    { key: 'crop_prediction', label: '🌾 Crops' },
                    { key: 'disease_detection', label: '🔬 Disease' },
                    { key: 'weather', label: '🌤️ Weather' },
                    { key: 'market', label: '📊 Market' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: '40vh' }}><div className="spinner" /></div>
            ) : history.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <h3>No history found</h3>
                        <p>Start using the AI assistant, crop recommendations, or disease detection to see your history here.</p>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {history.map((item, i) => (
                        <div key={i} style={{
                            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                            borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
                            transition: 'background 0.2s',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: `${typeColors[item.type] || typeColors.default}12`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 20, flexShrink: 0
                            }}>
                                {typeIcons[item.type] || typeIcons.default}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.query}
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {new Date(item.timestamp).toLocaleString()}
                                </p>
                            </div>
                            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                                {(item.type || '').replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
