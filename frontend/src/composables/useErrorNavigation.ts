import { computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
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

    /** Runs a Zod schema validation and transforms any issues into diagnostic items */
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
                const isFu = pathStr.startsWith('functionalUnit');

                list.push({
                    id: `scope-${pathStr}`,
                    section: 'scope',
                    route: '/scope',
                    sectionIcon: 'my_location',
                    sectionLabel: t('mainNavScope'),
                    entityName: isFu
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
        surveyData.hardware.forEach((row, index) => {
            const entityName =
                row.name.trim() || t('errorPanel.hardwareRowEntity', { index: index + 1 });
            list.push(
                ...collectIssues(HardwareItemSchema, row, {
                    section: 'inventory',
                    route: '/inventory',
                    sectionIcon: 'memory',
                    sectionLabel: t('mainNavInventory'),
                    entityName,
                    labelPrefix: 'inventoryColumns',
                    rowId: row.id,
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

    /** Expands parent QExpansionItem if the target element is collapsed */
    function expandEnclosingSection(element: HTMLElement): void {
        const collapsed = element.closest('.q-expansion-item--collapsed');
        if (collapsed) {
            const header = collapsed.querySelector<HTMLElement>('.q-expansion-item__header');
            header?.click();
        }
    }

    /** Triggers smooth scrolling, pulse animation, and input focus */
    function focusElement(element: HTMLElement): void {
        expandEnclosingSection(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        element.classList.add('field-highlight-pulse');
        window.setTimeout(() => {
            element.classList.remove('field-highlight-pulse');
        }, 2000);

        const control = element.querySelector<HTMLElement>('input, textarea, select');
        (control ?? element).focus();
    }

    /** Navigates across routes, locates the field by attributes, and triggers focus */
    async function executeScrollAndPulse(issue: DiagnosticIssue): Promise<void> {
        if (router.currentRoute.value.path !== issue.route) {
            await router.push(issue.route);
            await nextTick();
        }

        window.setTimeout(() => {
            const selector = issue.rowId
                ? `[data-row-id="${CSS.escape(issue.rowId)}"][data-field="${CSS.escape(issue.field)}"]`
                : `[data-field="${CSS.escape(issue.field)}"]`;

            let element = document.querySelector<HTMLElement>(selector);

            // Fallback to row element if the specific table column is hidden by visibility mode
            if (!element && issue.rowId) {
                element = document.querySelector<HTMLElement>(
                    `[data-row-id="${CSS.escape(issue.rowId)}"]`,
                );
            }

            if (element) {
                focusElement(element);
            }
        }, 120);
    }

    function navigateToIssue(issue: DiagnosticIssue): void {
        void executeScrollAndPulse(issue);
    }

    return {
        issues,
        issueCount: computed(() => issues.value.length),
        hasIssues: computed(() => issues.value.length > 0),
        navigateToIssue,
    };
}
