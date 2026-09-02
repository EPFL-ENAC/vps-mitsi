import type { Band } from './backgroundBuilder';
import type { DaynightCyclePeriod } from './daynightCycle';

const displayByPeriodType = {
    night: {
        colors: [
            '#5b6fb8',
            '#243b6b',
            '#111832',
            '#111832',
            '#111832',
            '#111832',
            '#243b6b',
            '#4f73d9',
        ],
        icon: `url("/icons/moon.svg")`,
    },
    sunrise: {
        colors: ['#4f73d9', '#ffd166'],
        icon: `url("/icons/sunrise.svg")`,
    },
    day: {
        colors: ['#ffd166', '#ffd166', '#ff8c42'],
        icon: `url("/icons/sun.svg")`,
    },
    sunset: {
        colors: ['#ff8c42', '#5b6fb8'],
        icon: `url("/icons/sunrise.svg")`,
    },
};

export function daynightCyclePeriodsToBands(periods: DaynightCyclePeriod[]): Band[] {
    return periods
        .filter((period) => Number.isFinite(period.start) && Number.isFinite(period.end))
        .filter((period) => period.end > period.start)
        .map((period) => {
            const display = displayByPeriodType[period.name];

            return {
                start: period.start,
                end: period.end,
                colors: display.colors,
                icon: display.icon,
            };
        });
}
