export type NavMenuItem = {
    id: string;
    shortLabel: string;
    label: string;
    title: string;
    subtitle: string;
    icon: string;
    href: string;
    target?: '_self' | '_blank' | '_parent' | '_top';
    color: 'primary' | 'warning' | 'negative';
    textClass: string;
    actionColor?: 'primary' | 'warning' | 'negative';
    imageSrc?: string;
    imageAlt?: string;
    imageFit?: 'cover' | 'contain';
    mediaBackground?: string;
};
