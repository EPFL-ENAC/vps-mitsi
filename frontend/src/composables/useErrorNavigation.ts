import { computed, reactive, watch, type ComponentPublicInstance } from 'vue';
import {
    useRoute,
    useRouter,
    type LocationQueryValue,
    type RouteLocationNormalizedLoaded,
    type Router,
} from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { ZodType } from 'zod';

import { useSurveyDataStore } from 'src/stores/surveyData';
import { useValidation } from 'src/composables/useValidation';
import { ScopeSchema, BoundaryItemSchema } from 'src/models/Scope/schema';
import { DatacenterGeneralInfoSchema, DatacenterEnergySchema } from 'src/models/Datacenter/schema';
import { HardwareItemSchema } from 'src/models/HardwareItem/schema';
import { MonitoringPeriodSchema } from 'src/models/MonitoringPeriod/schema';
import { formatDatacenterName } from 'src/utils/format';

export type SectionId = 'scope' | 'inventory' | 'energy';

export interface DiagnosticIssue {
    id: string;
    section: SectionId;
    route: string;
    sectionIcon: string;
    sectionLabel: string;
    entityName: string;
    fieldLabel: string;
    message: string;
    rowId?: string | undefined;
    field: string;
}

interface ValidationContext {
    section: SectionId;
    route: string;
    sectionIcon: string;
    sectionLabel: string;
    entityName: string;
    labelPrefix: string;
    rowId?: string | undefined;
    idPrefix: string;
}

export interface FocusableSection {
    focusField: (field: string, rowId?: string) => boolean;
}

function queryString(
    value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
}

function isFocusableSection(el: unknown): el is FocusableSection {
    return (
        typeof el === 'object' &&
        el !== null &&
        'focusField' in el &&
        typeof el.focusField === 'function'
    );
}

export function buildFieldSelector(field: string, rowId?: string): string {
    return rowId
        ? `[data-row-id="${CSS.escape(rowId)}"][data-field="${CSS.escape(field)}"]`
        : `[data-field="${CSS.escape(field)}"]`;
}

/** Scrolls to the target field, pulses it until `animationend`, and focuses its control. */
export function focusAndPulseField(container: ParentNode, field: string, rowId?: string): boolean {
    const element = container.querySelector<HTMLElement>(buildFieldSelector(field, rowId));
    if (!element) return false;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('field-highlight-pulse');
    element.addEventListener(
        'animationend',
        () => element.classList.remove('field-highlight-pulse'),
        { once: true },
    );

    const control = element.querySelector<HTMLElement>('input, textarea, select');
    (control ?? element).focus({ preventScroll: true });
    return true;
}

/** Removes deep-link selection params from the URL once focus has been applied. */
function clearNavigationQuery(router: Router): void {
    const query = { ...router.currentRoute.value.query };
    delete query.selected;
    delete query.row;
    void router.replace({ query });
}

function focusFromRoute(route: RouteLocationNormalizedLoaded, router: Router): void {
    const selected = queryString(route.query.selected);
    if (!selected) return;

    if (focusAndPulseField(document, selected, queryString(route.query.row))) {
        clearNavigationQuery(router);
    }
}

/** Single page-level watcher that loops through all mounted `AssessmentSection` template refs. */
export function useSectionQueryFocus() {
    const route = useRoute();
    const router = useRouter();
    const sections = reactive(new Set<FocusableSection>());

    function registerSection(el: Element | ComponentPublicInstance | null): void {
        if (isFocusableSection(el)) {
            sections.add(el);
        }
    }

    watch(
        () =>
            [
                sections.size,
                queryString(route.query.selected),
                queryString(route.query.row),
            ] as const,
        ([, selected, rowId]) => {
            if (!selected) return;

            for (const section of sections) {
                if (section.focusField(selected, rowId)) {
                    clearNavigationQuery(router);
                    break;
                }
            }
        },
        { flush: 'post' },
    );

    return { registerSection };
}

/** Opens a detail dialog whenever `route.query.row` matches a row in `getRows()`. */
export function useRowDialogFromQuery<T extends { id: string }>(
    getRows: () => readonly T[],
    openDialog: (row: T) => void,
): void {
    const route = useRoute();
    const router = useRouter();

    watch(
        () => queryString(route.query.row),
        (rowId) => {
            if (!rowId) return;

            const match = getRows().find((row) => row.id === rowId);
            if (!match) {
                clearNavigationQuery(router);
                return;
            }
            openDialog(match);
        },
        { immediate: true },
    );
}

/** Focuses the target field once a detail dialog finishes its open transition (`@show`). */
export function useDialogQueryFocus() {
    const route = useRoute();
    const router = useRouter();

    return {
        onDialogShow: () => focusFromRoute(route, router),
    };
}

export function useErrorNavigation() {
    const router = useRouter();
    const { t } = useI18n();
    const { formatIssue } = useValidation();
    const surveyData = useSurveyDataStore();

    function resolveFieldLabel(prefix: string, field: string): string {
        const fullKey = `${prefix}.${field}`;
        const translated = t(fullKey);
        return translated !== fullKey ? translated : field;
    }

    /** Runs a Zod schema validation and transforms any issues into diagnostic items. */
    function collectIssues(
        schema: ZodType,
        data: unknown,
        context: ValidationContext,
    ): DiagnosticIssue[] {
        const result = schema.safeParse(data);
        if (result.success) return [];

        return result.error.issues.map((issue) => {
            const field = String(issue.path[issue.path.length - 1] ?? '');
            return {
                id: `${context.idPrefix}-${context.rowId ?? 'static'}-${field}`,
                section: context.section,
                route: context.route,
                sectionIcon: context.sectionIcon,
                sectionLabel: context.sectionLabel,
                entityName: context.entityName,
                fieldLabel: resolveFieldLabel(context.labelPrefix, field),
                message: formatIssue(issue),
                rowId: context.rowId,
                field,
            };
        });
    }

    const issues = computed<DiagnosticIssue[]>(() => {
        const list: DiagnosticIssue[] = [];

        // ── 1. Scope: General & Functional Unit ──────────────────────────────
        const scopeResult = ScopeSchema.safeParse(surveyData.scope);
        if (!scopeResult.success) {
            for (const issue of scopeResult.error.issues) {
                const pathStr = issue.path.join('.');
                if (pathStr.startsWith('includedItems') || pathStr.startsWith('excludedItems')) {
                    continue;
                }
                const field = String(issue.path[issue.path.length - 1] ?? '');
                list.push({
                    id: `scope-${pathStr}`,
                    section: 'scope',
                    route: '/scope',
                    sectionIcon: 'my_location',
                    sectionLabel: t('mainNavScope'),
                    entityName: pathStr.startsWith('functionalUnit')
                        ? t('errorPanel.scopeFuEntity')
                        : t('errorPanel.scopeGeneralEntity'),
                    fieldLabel: resolveFieldLabel('scope', field),
                    message: formatIssue(issue),
                    field,
                });
            }
        }

        // ── 1b. Scope: Datacenters Boundary ──────────────────────────────────
        if (surveyData.datacenters.length === 0) {
            list.push({
                id: 'scope-no-dc',
                section: 'scope',
                route: '/scope',
                sectionIcon: 'my_location',
                sectionLabel: t('mainNavScope'),
                entityName: t('scopeBoundariesDcTitle'),
                fieldLabel: t('inventoryColumns.datacenterId'),
                message: t('inventoryNoDatacentersHint'),
                field: 'abbreviation',
            });
        } else {
            surveyData.datacenters.forEach((dc) => {
                list.push(
                    ...collectIssues(DatacenterGeneralInfoSchema, dc.generalInfo, {
                        section: 'scope',
                        route: '/scope',
                        sectionIcon: 'my_location',
                        sectionLabel: t('mainNavScope'),
                        entityName: formatDatacenterName(dc),
                        labelPrefix: 'scopeDatacenterColumns',
                        rowId: dc.id,
                        idPrefix: 'scope-dc',
                    }),
                );
            });
        }

        // ── 1c. Scope: Included / Excluded Boundaries ────────────────────────
        const boundaryGroups = [
            { kind: 'included' as const, items: surveyData.scope.includedItems },
            { kind: 'excluded' as const, items: surveyData.scope.excludedItems },
        ];
        for (const { kind, items } of boundaryGroups) {
            items.forEach((item) => {
                list.push(
                    ...collectIssues(BoundaryItemSchema, item, {
                        section: 'scope',
                        route: '/scope',
                        sectionIcon: 'my_location',
                        sectionLabel: t('mainNavScope'),
                        entityName: t(`scopeBoundary.${kind}.prefix`),
                        labelPrefix: 'scopeBoundary.placeholders',
                        rowId: item.id,
                        idPrefix: `bnd-${kind}`,
                    }),
                );
            });
        }

        // ── 2. Hardware Inventory ────────────────────────────────────────────
        surveyData.hardware.forEach((item, index) => {
            list.push(
                ...collectIssues(HardwareItemSchema, item, {
                    section: 'inventory',
                    route: '/inventory',
                    sectionIcon: 'memory',
                    sectionLabel: t('mainNavInventory'),
                    entityName:
                        item.name.trim() || t('errorPanel.hardwareRowEntity', { index: index + 1 }),
                    labelPrefix: 'inventoryColumns',
                    rowId: item.id,
                    idPrefix: 'hw',
                }),
            );
        });

        // ── 3. Energy: Monitoring Period & Datacenters ───────────────────────
        list.push(
            ...collectIssues(MonitoringPeriodSchema, surveyData.monitoringPeriod, {
                section: 'energy',
                route: '/energy',
                sectionIcon: 'bolt',
                sectionLabel: t('mainNavEnergy'),
                entityName: t('energyMonitorTitle'),
                labelPrefix: 'energyColumns',
                idPrefix: 'energy-period',
            }),
        );

        surveyData.datacenters.forEach((dc) => {
            list.push(
                ...collectIssues(DatacenterEnergySchema, dc.energy, {
                    section: 'energy',
                    route: '/energy',
                    sectionIcon: 'bolt',
                    sectionLabel: t('mainNavEnergy'),
                    entityName: formatDatacenterName(dc),
                    labelPrefix: 'energyColumns',
                    rowId: dc.id,
                    idPrefix: 'energy-dc',
                }),
            );
        });

        return list;
    });

    function navigateToIssue(issue: DiagnosticIssue): void {
        void router.push({
            path: issue.route,
            query: {
                selected: issue.field,
                ...(issue.rowId && { row: issue.rowId }),
            },
        });
    }

    return {
        issues,
        issueCount: computed(() => issues.value.length),
        hasIssues: computed(() => issues.value.length > 0),
        navigateToIssue,
    };
}
