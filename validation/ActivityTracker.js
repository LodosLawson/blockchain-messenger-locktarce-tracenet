class ActivityTracker {
    constructor(validatorPool) {
        this.validatorPool = validatorPool;
        this.userActivities = new Map(); // userId -> { type, timestamp }
        this.activityTimeout = 30000; // 30 seconds
    }

    trackActivity(userId, activityType) {
        this.userActivities.set(userId, {
            type: activityType,
            timestamp: Date.now()
        });

        // Update validator pool
        this.validatorPool.updateActivity(userId);
    }

    getUserActivity(userId) {
        return this.userActivities.get(userId);
    }

    isUserActive(userId) {
        const activity = this.userActivities.get(userId);
        if (!activity) return false;

        return Date.now() - activity.timestamp < this.activityTimeout;
    }

    getActiveUsers() {
        const active = [];
        const now = Date.now();

        for (const [userId, activity] of this.userActivities.entries()) {
            if (now - activity.timestamp < this.activityTimeout) {
                active.push({
                    userId,
                    activityType: activity.type,
                    lastActive: activity.timestamp
                });
            }
        }

        return active;
    }

    cleanupInactiveUsers() {
        const now = Date.now();
        const inactiveTimeout = 120000; // 2 minutes

        for (const [userId, activity] of this.userActivities.entries()) {
            if (now - activity.timestamp > inactiveTimeout) {
                this.userActivities.delete(userId);
                this.validatorPool.removeValidator(userId);
            }
        }
    }

    startCleanupInterval() {
        setInterval(() => {
            this.cleanupInactiveUsers();
        }, 60000); // Run cleanup every minute
    }
}

export default ActivityTracker;
