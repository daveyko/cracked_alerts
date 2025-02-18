function formatCompactNumber(value) {
    if (value >= 1e9) {
        return (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
        return (value / 1e6).toFixed(2) + 'M';
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(2) + 'K';
    }
    return value.toFixed(2);
}

function formatTimeFromSeconds(seconds) {
    const minutes = seconds / 60;
    const hours = seconds / 3600;
    const days = hours / 24;
    if (seconds < 3600) {
        // Less than 1 hour, show in minutes
        return minutes < 1 ? `${minutes.toFixed(2)}m` : `${Math.round(minutes)}m`;
    } else if (seconds < 86400) {
        // Less than 24 hours, show in hours
        return hours < 1 ? `${hours.toFixed(2)}h` : `${Math.round(hours)}h`;
    } else {
        // More than 24 hours, show in days
        return days < 1 ? `${days.toFixed(2)}d` : `${Math.round(days)}d`;
    }
}

module.exports = {
    formatCompactNumber,
    formatTimeFromSeconds,
};
