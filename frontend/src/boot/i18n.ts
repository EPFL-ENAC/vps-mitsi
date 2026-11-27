import { defineBoot } from '#q-app';
import { i18n } from 'src/i18n/index';

export default defineBoot(({ app }) => {
    app.use(i18n);

    if (typeof window !== 'undefined') {
        (window as { i18nGlobal?: unknown }).i18nGlobal = i18n.global;
    }
});
