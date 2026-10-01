import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import {
    Quasar,
    QTable,
    QTr,
    QTh,
    QTd,
    QBtn,
    QToggle,
    QMarkupTable,
    QCard,
    QCardSection,
    QExpansionItem,
    QItemSection,
    QItemLabel,
    QSeparator,
    QBanner,
    QTooltip,
} from 'quasar';
import { useMitsiStore } from '../../src/stores/mitsi.ts';
import en from '../../src/i18n/en-GB/index.ts';

/** Exercise real Quasar controls and inspect their public props/events in SSR. */
export async function renderTables(
    component,
    { props = {}, setupStore = () => {}, messages = en } = {},
) {
    const instances = [];
    const dialogs = [];
    const app = createSSRApp({ render: () => h(component, props) });
    const context = { req: { headers: {} } };
    const pinia = createPinia();
    app.use(pinia);
    const store = useMitsiStore(pinia);
    setupStore(store);
    app.mixin({
        created() {
            instances.push(this);
        },
    });
    app.use(
        Quasar,
        {
            components: {
                QTable,
                QTr,
                QTh,
                QTd,
                QBtn,
                QToggle,
                QMarkupTable,
                QCard,
                QCardSection,
                QExpansionItem,
                QItemSection,
                QItemLabel,
                QSeparator,
                QBanner,
                QTooltip,
            },
        },
        context,
    );
    app.config.globalProperties.$q.dialog = (options) => {
        const dialog = { options, confirm: undefined };
        dialogs.push(dialog);
        return {
            onOk(callback) {
                dialog.confirm = callback;
            },
        };
    };
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en: messages } }));
    const html = await renderToString(app, context);
    return {
        html,
        store,
        dialogs,
        tables: instances.filter((instance) => instance.$options.name === 'QTable'),
        inputs: instances.filter((instance) => instance.$options.name === 'QInput'),
        buttons: instances.filter((instance) => instance.$options.name === 'QBtn'),
    };
}
