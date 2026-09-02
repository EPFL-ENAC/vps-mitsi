import type { NavMenuItem } from 'src/navigation/navMenuItem';

export const gamesPicker: NavMenuItem = {
    id: '03',
    shortLabel: 'homeGamesLabel',
    label: 'homeGamesTitle',
    title: 'homeGamesTitle',
    subtitle: 'homeGamesSubtitle',
    icon: 'explore',
    href: '/games',
    color: 'negative',
    textClass: 'text-negative',
};

export const gamesNavGroups: NavMenuItem[] = [
    {
        id: '01',
        shortLabel: 'gameNavPlanctonShort',
        label: 'gameNavPlanctonTitle',
        title: 'gameNavPlanctonTitle',
        subtitle: 'gameNavPlanctonSubtitle',
        icon: 'water',
        href: '/games/planctonGame',
        color: 'negative',
        actionColor: 'negative',
        textClass: 'text-negative',
        imageSrc: '/zooplankton.svg',
        imageFit: 'contain',
    },
    {
        id: '02',
        shortLabel: 'gameNavTempShort',
        label: 'gameNavTempTitle',
        title: 'gameNavTempTitle',
        subtitle: 'gameNavTempSubtitle',
        icon: 'device_thermostat',
        href: '/games/temperatureOverDepthGame',
        color: 'negative',
        actionColor: 'negative',
        textClass: 'text-negative',
    },
];
