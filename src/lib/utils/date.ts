/**
 * Format relative time
 */
export function getRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    // Convert to seconds, minutes, hours, days
    const seconds = Math.floor(diff);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
        return `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'month' : 'months'} ago`;
    } else if (days > 0) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
        return 'just now';
    }
}