import { createI18n } from 'vue-i18n';
import enGB from 'src/i18n/en-GB/index';

const messages = {
    en: enGB,
};

type MessageLanguages = keyof typeof messages;
type MessageSchema = (typeof messages)['en'];

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
    export interface DefineLocaleMessage extends MessageSchema {}
    export interface DefineDateTimeFormat {}
    export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

export const i18n = createI18n<{ message: MessageSchema }, MessageLanguages, false>({
    locale: 'en',
    legacy: false,
    messages,
});
