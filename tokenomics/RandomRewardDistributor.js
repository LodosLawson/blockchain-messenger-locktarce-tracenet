class RandomRewardDistributor {
    constructor() {
        this.selectionWindows = new Map(); // userId -> { windowStart, count }
        this.WINDOW_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
        this.MIN_SELECTIONS = 3;
        this.MAX_SELECTIONS = 9;
    }

    selectRandomUser(excludeUserId) {
        const eligibleUsers = this.getEligibleUsers(excludeUserId);

        if (eligibleUsers.length === 0) {
            return null; // No eligible users, fee goes to system
        }

        // Random selection
        const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
        const selectedUser = eligibleUsers[randomIndex];

        // Update selection count
        this.recordSelection(selectedUser);

        return selectedUser;
    }

    selectMultipleRandomUsers(excludeUserId, count) {
        const selected = [];
        const eligibleUsers = this.getEligibleUsers(excludeUserId);

        if (eligibleUsers.length === 0) {
            return []; // Will fallback to system
        }

        // Select up to 'count' random users
        const selectCount = Math.min(count, eligibleUsers.length);
        const shuffled = [...eligibleUsers].sort(() => 0.5 - Math.random());

        for (let i = 0; i < selectCount; i++) {
            selected.push(shuffled[i]);
            this.recordSelection(shuffled[i]);
        }

        return selected;
    }

    getEligibleUsers(excludeUserId) {
        const now = Date.now();
        const eligible = [];

        // Get all active users from the system
        // This will be populated by the activity tracker
        const allUsers = Array.from(this.selectionWindows.keys());

        for (const userId of allUsers) {
            if (userId === excludeUserId) continue;

            const window = this.selectionWindows.get(userId);

            // Check if window has expired
            if (now - window.windowStart > this.WINDOW_DURATION) {
                // Reset window
                this.selectionWindows.set(userId, {
                    windowStart: now,
                    count: 0,
                    maxSelections: this.getRandomMaxSelections()
                });
                eligible.push(userId);
            } else if (window.count < window.maxSelections) {
                // User still has selections left in current window
                eligible.push(userId);
            }
        }

        return eligible;
    }

    recordSelection(userId) {
        const now = Date.now();
        const window = this.selectionWindows.get(userId);

        if (!window || now - window.windowStart > this.WINDOW_DURATION) {
            // Create new window
            this.selectionWindows.set(userId, {
                windowStart: now,
                count: 1,
                maxSelections: this.getRandomMaxSelections()
            });
        } else {
            // Increment count in current window
            window.count++;
        }
    }

    getRandomMaxSelections() {
        // Random number between MIN_SELECTIONS (3) and MAX_SELECTIONS (9)
        return Math.floor(Math.random() * (this.MAX_SELECTIONS - this.MIN_SELECTIONS + 1)) + this.MIN_SELECTIONS;
    }

    registerUser(userId) {
        if (!this.selectionWindows.has(userId)) {
            this.selectionWindows.set(userId, {
                windowStart: Date.now(),
                count: 0,
                maxSelections: this.getRandomMaxSelections()
            });
        }
    }

    removeUser(userId) {
        this.selectionWindows.delete(userId);
    }

    getUserSelectionInfo(userId) {
        const window = this.selectionWindows.get(userId);
        if (!window) return null;

        const now = Date.now();
        const timeRemaining = this.WINDOW_DURATION - (now - window.windowStart);

        return {
            currentCount: window.count,
            maxSelections: window.maxSelections,
            timeRemainingMs: Math.max(0, timeRemaining),
            isEligible: window.count < window.maxSelections && timeRemaining > 0
        };
    }

    cleanupExpiredWindows() {
        const now = Date.now();
        for (const [userId, window] of this.selectionWindows.entries()) {
            if (now - window.windowStart > this.WINDOW_DURATION * 2) {
                // Remove very old windows
                this.selectionWindows.delete(userId);
            }
        }
    }
}

export default RandomRewardDistributor;
