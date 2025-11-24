import './ValidatorStatus.css';

function ValidatorStatus({ stats }) {
    const isActive = stats.validationCount > 0 || stats.totalEarned > 0;

    return (
        <div className="validator-status glass">
            <div className="validator-header">
                <div className="flex items-center gap-md">
                    <div className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
                        <div className="pulse-ring"></div>
                        <div className="pulse-dot"></div>
                    </div>
                    <div>
                        <h3 className="font-semibold">Validator Status</h3>
                        <p className="text-xs text-muted">
                            {isActive ? 'Active - Earning rewards' : 'Ready to validate'}
                        </p>
                    </div>
                </div>

                <div className="validator-stats">
                    <div className="stat-item">
                        <p className="text-xs text-muted">Validations</p>
                        <p className="stat-value">{stats.validationCount || 0}</p>
                    </div>
                    <div className="stat-item">
                        <p className="text-xs text-muted">Earned</p>
                        <p className="stat-value text-success">
                            +{(stats.totalEarned || 0).toFixed(5)} LTC
                        </p>
                    </div>
                </div>
            </div>

            <div className="validator-info">
                <p className="text-xs text-muted">
                    💡 You earn 0.00001 LTC for each transaction you validate while active
                </p>
            </div>
        </div>
    );
}

export default ValidatorStatus;
