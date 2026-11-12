import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createI18n } from 'vue-i18n';
import {
    Quasar,
    QTable,
    QTr,
    QTh,
    QTd,
    QBtn,
    QInput,
    QSelect,
    QToggle,
    QMarkupTable,
    QCard,
    QCardSection,
    QCardActions,
    QDialog,
    QExpansionItem,
    QItemSection,
    QItemLabel,
    QSeparator,
    QBanner,
    QTooltip,
    QToolbar,
    QToolbarTitle,
    QSpace,
    QLayout,
    QHeader,
    QFooter,
    QDrawer,
    QPageContainer,
    QList,
    QItem,
    QIcon,
    QFile,
    QForm,
    QBtnToggle,
    QChip,
    ClosePopup,
    Ripple,
} from 'quasar';
import HardwareInventoryTable from '../../src/components/inventory/HardwareInventoryTable.vue';
import HardwareDetailDialog from '../../src/components/inventory/HardwareDetailDialog.vue';
import HardwareDetailForm from '../../src/components/inventory/HardwareDetailForm.vue';
import EnergyDatacentersTable from '../../src/components/energy/EnergyDatacentersTable.vue';
import EnergyDatacenterDetailDialog from '../../src/components/energy/EnergyDatacenterDetailDialog.vue';
import EnergyDatacenterDetailForm from '../../src/components/energy/EnergyDatacenterDetailForm.vue';
import { useSurveyDataStore } from '../../src/stores/surveyData.ts';
import { useSurveyResultsStore } from '../../src/stores/surveyResults.ts';
import { useEnergyDialog } from '../../src/composables/useDetailDialog.ts';
import en from '../../src/i18n/en-GB/index.ts';

/** Exercise real Quasar controls and inspect their public props/events in SSR. */
export async function renderTables(
    component,
    { props = {}, setupStore = () => {}, messages = en } = {},
) {
    const instances = [];
    const dialogs = [];
    const notifications = [];
    const app = createSSRApp({ render: () => h(component, props) });
    const context = { req: { headers: {} } };
    const pinia = createPinia();
    app.use(pinia);
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    });
    app.use(router);
    await router.push('/');
    await router.isReady();
    const store = useSurveyDataStore(pinia);
    setupStore(store);
    // Create computed results outside SSR setup so later reads share the rendered instances.
    const results = useSurveyResultsStore(pinia);
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
                QInput,
                QSelect,
                QToggle,
                QMarkupTable,
                QCard,
                QCardSection,
                QCardActions,
                QDialog,
                QExpansionItem,
                QItemSection,
                QItemLabel,
                QSeparator,
                QBanner,
                QTooltip,
                QToolbar,
                QToolbarTitle,
                QSpace,
                QLayout,
                QHeader,
                QFooter,
                QDrawer,
                QPageContainer,
                QList,
                QItem,
                QIcon,
                QFile,
                QForm,
                QBtnToggle,
                QChip,
            },
            directives: { Ripple, ClosePopup },
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
    app.config.globalProperties.$q.notify = (options) => notifications.push(options);
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en: messages } }));
    const html = await renderToString(app, context);
    return {
        html,
        instances,
        store,
        router,
        results,
        dialogs,
        notifications,
        exportDialogs: instances.filter(
            (instance) => instance.$options.__name === 'ExportAssessmentDialog',
        ),
        modalDialogs: instances.filter((instance) => instance.$options.name === 'QDialog'),
        tables: instances.filter((instance) => instance.$options.name === 'QTable'),
        datacenterCharts: instances.filter(
            (instance) => instance.$options.__name === 'DatacentersTreemapChart',
        ),
        splitCharts: instances.filter(
            (instance) => instance.$options.__name === 'TotalSplitPieChart',
        ),
        inputs: instances.filter((instance) => instance.$options.name === 'QInput'),
        selects: instances.filter((instance) => instance.$options.name === 'QSelect'),
        toggles: instances.filter((instance) => instance.$options.name === 'QToggle'),
        buttons: instances.filter((instance) => instance.$options.name === 'QBtn'),
        computations: instances.filter(
            (instance) => instance.$options.__name === 'ComputationResultDisplay',
        ),
        tooltips: instances.filter((instance) => instance.$options.name === 'QTooltip'),
        /** ZodValidated* wrappers, which own the canonical `schema` prop. */
        zodInputs: instances.filter((instance) =>
            ['ZodValidatedNumberInput', 'ZodValidatedTextInput'].includes(instance.$options.__name),
        ),
        zodSelects: instances.filter(
            (instance) => instance.$options.__name === 'ZodValidatedSelect',
        ),

        charts: instances.filter((instance) => instance.$props.option !== undefined),
        renderAgain: async () =>
            (
                await renderTables(component, {
                    props,
                    messages,
                    setupStore(nextStore) {
                        nextStore.$patch(store.$state);
                    },
                })
            ).html,
    };
}

/** Inspect the columns passed to the real QTable and the rendered summary rows. */
export async function renderInventoryTable({ hardware = [], datacenters = [], messages } = {}) {
    const result = await renderTables(HardwareInventoryTable, {
        setupStore(store) {
            store.hardware = hardware;
            store.datacenters = datacenters;
        },
        messages,
    });
    return { ...result, columns: result.tables[0].columns };
}

/**
 * Render the detail form body (SSR-friendly, unlike the lazily-ported dialog)
 * for a single hardware row.
 */
export async function renderInventoryDialog({
    row,
    readonly = false,
    datacenters = [],
    messages,
} = {}) {
    return renderTables(HardwareDetailForm, {
        props: { row, readonly },
        setupStore(store) {
            store.datacenters = datacenters;
        },
        messages,
    });
}

/** Render the full-screen dialog shell (used to assert header/badge markup). */
export async function renderInventoryDialogShell({ row, readonly = false, messages } = {}) {
    return renderTables(HardwareDetailDialog, {
        props: { row, readonly, open: true },
        messages,
    });
}

/** Inspect the energy summary columns and the rendered master rows. */
export async function renderEnergyTable({ datacenters = [], messages } = {}) {
    // The energy dialog state is module-scoped (shared with error navigation),
    // so reset it to keep test cases independent of each other.
    useEnergyDialog().close();
    const result = await renderTables(EnergyDatacentersTable, {
        setupStore(store) {
            store.datacenters = datacenters;
        },
        messages,
    });
    useEnergyDialog().close();
    const table = result.instances.find(
        (instance) => instance.$options.__name === 'EnergyDatacentersTable',
    );
    return {
        ...result,
        columns: result.tables[0].columns,
        /** The public surface published through `defineExpose` (as a parent sees it). */
        tableExposed: table?.$.exposed ?? {},
    };
}

/** Render the energy detail form body for a single datacenter. */
export async function renderEnergyDialog({ row, readonly = false, messages } = {}) {
    return renderTables(EnergyDatacenterDetailForm, {
        props: { row, readonly },
        messages,
    });
}

/** Render the energy dialog shell (used to assert header/badge markup). */
export async function renderEnergyDialogShell({ row, readonly = false, messages } = {}) {
    return renderTables(EnergyDatacenterDetailDialog, {
        props: { row, readonly, open: true },
        messages,
    });
}

/**
 * Dialog content is lazily ported, so SSR renders an empty comment for the
 * `q-dialog`. Extract the first modal dialog's default slot and render it to
 * obtain the real shell markup (toolbar, badge, back button, form).
 */
export async function renderDialogContent(result) {
    const slot = result.modalDialogs[0].$slots.default();
    const { html } = await renderTables({ render: () => h('div', slot) });
    return html;
}
