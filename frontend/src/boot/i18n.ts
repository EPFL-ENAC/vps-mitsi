import { defineBoot } from '#q-app/wrappers';
import { createI18n } from 'vue-i18n';

import messages from 'src/i18n';

export type MessageLanguages = keyof typeof messages;
// Type-define 'en' as the master schema for the resource
export type MessageSchema = (typeof messages)['en'];

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
    // define the locale messages schema
    export interface DefineLocaleMessage extends MessageSchema {}

    // define the datetime format schema
    export interface DefineDateTimeFormat {}

    // define the number format schema
    export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

function getInitialLocale(): MessageLanguages {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app-locale') : null;
    if (stored && (stored === 'en' || stored === 'fr' || stored === 'de' || stored === 'it')) {
        return stored;
    }

    if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('fr')) return 'fr';
        if (browserLang.startsWith('de')) return 'de';
        if (browserLang.startsWith('it')) return 'it';
    }

    return 'en';
}

export default defineBoot(({ app }) => {
    const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
        locale: getInitialLocale(),
        legacy: false,
        messages,
    });

    app.use(i18n);

    if (typeof window !== 'undefined') {
        (window as { i18nGlobal?: unknown }).i18nGlobal = i18n.global;
    }
});
