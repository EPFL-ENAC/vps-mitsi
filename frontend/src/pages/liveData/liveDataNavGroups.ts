import type { NavMenuItem } from 'src/navigation/navMenuItem';

export const liveDataPicker: NavMenuItem = {
    id: '01',
    shortLabel: 'homeLiveLabel',
    label: 'homeLiveTitle',
    title: 'homeLiveTitle',
    subtitle: 'homeLiveSubtitle',
    icon: 'waves',
    href: '/liveData',
    color: 'primary',
    textClass: 'text-primary',
};

export const liveDataNavGroups: NavMenuItem[] = [
    {
        id: '01',
        shortLabel: 'liveNavTempDepthShort',
        label: 'liveNavTempDepth',
        title: 'liveNavTempDepth',
        subtitle: '',
        icon: 'device_thermostat',
        href: '/liveData/temperatureOverDepth',
        color: 'primary',
        textClass: 'text-primary',
    },
    {
        id: '02',
        shortLabel: 'liveNavZooDepthShort',
        label: 'liveNavZooDepth',
        title: 'liveNavZooDepth',
        subtitle: '',
        icon: 'water',
        href: '/liveData/zooplanctonDepth',
        color: 'primary',
        textClass: 'text-primary',
    },
    {
        id: '03',
        shortLabel: 'liveNavAlgaeConc',
        label: 'liveNavAlgaeConc',
        title: 'liveNavAlgaeConc',
        subtitle: '',
        icon: 'grass',
        href: '/liveData/algaeConcentrationOverDepth',
        color: 'primary',
        textClass: 'text-primary',
    },
];
