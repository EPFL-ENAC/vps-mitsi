export type CardMenuItem = {
    id: string;
    kicker: string;
    title: string;
    subtitle: string;
    href: string;
    target?: '_self' | '_blank' | '_parent' | '_top';

    color: 'primary' | 'warning' | 'negative';
    textClass: string;

    icon?: string;
    iconSize?: string;

    actionColor?: 'primary' | 'warning' | 'negative';
    actionIcon?: string;

    imageSrc?: string;
    imageAlt?: string;
    imageFit?: 'cover' | 'contain';
    mediaBackground?: string;
};
