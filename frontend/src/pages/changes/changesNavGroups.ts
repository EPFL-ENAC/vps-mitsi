import type { NavMenuItem } from 'src/navigation/navMenuItem';

export const changesPicker: NavMenuItem = {
    id: '02',
    shortLabel: 'homeDiscoveryLabel',
    label: 'homeDiscoveryTitle',
    title: 'homeDiscoveryTitle',
    subtitle: 'homeDiscoverySubtitle',
    icon: 'show_chart',
    href: '/changes',
    color: 'warning',
    textClass: 'text-warning',
};

export const changesNavGroups: NavMenuItem[] = [
    {
        id: '01',
        shortLabel: 'changesNavWindShort',
        label: 'changesNavWindTitle',
        title: 'changesNavWindTitle',
        subtitle: 'changesNavWindSubtitle',
        icon: 'air',
        href: '/changes/windChange',
        color: 'warning',
        actionColor: 'warning',
        textClass: 'text-warning',
    },
    {
        id: '02',
        shortLabel: 'changesNavGrowthShort',
        label: 'changesNavGrowthTitle',
        title: 'changesNavGrowthTitle',
        subtitle: 'changesNavGrowthSubtitle',
        icon: 'eco',
        href: '/changes/chlorophyllChange',
        color: 'warning',
        actionColor: 'warning',
        textClass: 'text-warning',
    },
];
