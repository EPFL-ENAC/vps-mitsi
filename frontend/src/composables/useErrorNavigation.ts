import { computed, reactive, watch, type ComponentPublicInstance } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { z, type ZodType } from 'zod';

import { useSurveyDataStore } from 'src/stores/surveyData';
import { useValidation } from 'src/composables/useValidation';
import { ScopeSchema, BoundaryItemSchema } from 'src/models/Scope/schema';
import { DatacenterGeneralInfoSchema, DatacenterEnergySchema } from 'src/models/Datacenter/schema';
import { HardwareItemSchema } from 'src/models/HardwareItem/schema';
import { MonitoringPeriodSchema } from 'src/models/MonitoringPeriod/schema';
import { focusAndPulseField } from 'src/utils/error-navigation';
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

type FocusableSection = ComponentPublicInstance & {
    focusField(field: string, rowId?: string): boolean;
};

const queryValue = z.string().min(1).optional().catch(undefined);
const navigationQuerySchema = z.object({ selected: queryValue, row: queryValue });

/** Single page-level watcher that loops through all mounted `AssessmentSection` template refs. */
export function useSectionQueryFocus() {
    const { currentRoute } = useRouter();
    const sections = reactive(new Set<FocusableSection>());

    function registerSection(instance: Element | ComponentPublicInstance | null): void {
        if (instance) sections.add(instance as FocusableSection);
    }

    watch(
        [currentRoute, () => sections.size],
        ([route]) => {
            const { selected, row } = navigationQuerySchema.parse(route.query);
            if (!selected) return;

            for (const section of sections) {
                if (section.focusField(selected, row)) break;
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
    const { currentRoute } = useRouter();

    watch(
        currentRoute,
        (route) => {
            const { row: rowId } = navigationQuerySchema.parse(route.query);
            if (!rowId) return;

            const match = getRows().find((row) => row.id === rowId);
            if (match) openDialog(match);
        },
        { immediate: true, flush: 'post' },
    );
}

/** Focuses the target field once a detail dialog finishes its open transition (`@show`). */
export function useDialogQueryFocus() {
    const { currentRoute } = useRouter();

    return {
        onDialogShow: () => {
            const { selected, row } = navigationQuerySchema.parse(currentRoute.value.query);
            if (selected) focusAndPulseField(document, selected, row);
        },
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
        const destination = {
            path: issue.route,
            query: {
                selected: issue.field,
                ...(issue.rowId && { row: issue.rowId }),
            },
        };
        const sameLink =
            router.resolve(destination).fullPath === router.currentRoute.value.fullPath;
        void router.push(sameLink ? { ...destination, force: true, replace: true } : destination);
    }

    return {
        issues,
        issueCount: computed(() => issues.value.length),
        hasIssues: computed(() => issues.value.length > 0),
        navigateToIssue,
    };
}
