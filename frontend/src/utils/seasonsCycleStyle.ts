import type { Band } from './backgroundBuilder';
import type { SeasonPeriod } from './seasonsCycle';

const displayBySeasonType = {
    spring: {
        colors: ['#7bc96f'],
        icon: `url("/icons/flower.svg")`,
    },
    summer: {
        colors: ['#ffd166'],
        icon: `url("/icons/sun.svg")`,
    },
    autumn: {
        colors: ['#d98b3a'],
        icon: `url("/icons/autumn_leaf.svg")`,
    },
    winter: {
        colors: ['#8ecae6'],
        icon: `url("/icons/snowflake.svg")`,
    },
};

export function seasonPeriodsToBands(periods: SeasonPeriod[]): Band[] {
    return periods
        .filter((period) => Number.isFinite(period.start) && Number.isFinite(period.end))
        .filter((period) => period.end > period.start)
        .map((period) => {
            const display = displayBySeasonType[period.name];

            return {
                start: period.start,
                end: period.end,
                colors: display.colors,
                icon: display.icon,
            };
        });
}
