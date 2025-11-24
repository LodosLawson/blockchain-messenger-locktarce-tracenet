import './OnlineValidators.css';

function OnlineValidators({ validators }) {
    const getTierBadge = (tier) => {
        const badges = {
            HELPER: { icon: '🌱', color: '#10b981', label: 'Helper' },
            ACTIVE: { icon: '⭐', color: '#3b82f6', label: 'Active' },
            ELITE: { icon: '👑', color: '#f59e0b', label: 'Elite' }
        };
        return badges[tier] || badges.HELPER;
    };

    return (
        <div className="online-validators">
            {validators.length === 0 ? (
                <div className="validators-empty">
                    <p className="text-muted">No validators online</p>
                </div>
            ) : (
                <div className="validators-grid">
                    {validators.map((validator, index) => {
                        const tierInfo = getTierBadge(validator.tier);
                        return (
                            <div key={index} className="validator-card glass">
                                <div className="validator-header">
                                    <div className="validator-avatar">
                                        {validator.userId?.toString().substring(0, 2).toUpperCase() || 'V'}
                                    </div>
                                    <div className="validator-info">
                                        <div className="validator-id">
                                            Validator #{validator.userId}
                                        </div>
                                        <div
                                            className="validator-tier"
                                            style={{ background: tierInfo.color }}
                                        >
                                            {tierInfo.icon} {tierInfo.label}
                                        </div>
                                    </div>
                                    <div className="validator-status">
                                        <div className="status-dot active"></div>
                                    </div>
                                </div>

                                <div className="validator-stats">
                                    <div className="validator-stat">
                                        <span className="stat-label">Validations</span>
                                        <span className="stat-value">{validator.validationCount || 0}</span>
                                    </div>
                                    <div className="validator-stat">
                                        <span className="stat-label">Earned</span>
                                        <span className="stat-value text-success">
                                            {(validator.totalEarned || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default OnlineValidators;
