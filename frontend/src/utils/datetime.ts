export function isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export const toUnixSeconds = (timestamp?: number) => {
    if (timestamp == null) {
        return undefined;
    }

    return timestamp > 1e12 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
};

export function daySine(timestamp: number): number {
    const date = new Date(timestamp);

    const secondsSinceMidnight =
        date.getHours() * 3600 +
        date.getMinutes() * 60 +
        date.getSeconds() +
        date.getMilliseconds() / 1000;

    const dayProgress = secondsSinceMidnight / 86400; // 0 to 1 over the day

    return Math.sin(2 * Math.PI * dayProgress + Math.PI / 2);
}
