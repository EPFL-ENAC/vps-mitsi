import { computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { ZodType } from 'zod';

import { useSurveyDataStore } from 'src/stores/surveyData';
import { useValidation } from 'src/composables/useValidation';
import { useHardwareDialog } from 'src/composables/useHardwareDialog';
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
    const { open: openHardwareDialog } = useHardwareDialog();

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

    /** Handlers for sections requiring modal or drawer activation before focus */
    const sectionOpeners: Partial<Record<SectionId, (issue: DiagnosticIssue) => void>> = {
        inventory: (issue) => {
            if (!issue.rowId) return;
            const item = surveyData.hardware.find((row) => row.id === issue.rowId);
            if (item) openHardwareDialog(item, 'edit');
        },
    };

    function expandEnclosingSection(element: HTMLElement): boolean {
        const closed = element.closest<HTMLElement>('.q-expansion-item--collapsed');
        if (!closed) return false;
        closed.querySelector<HTMLElement>('.q-item--clickable')?.click();
        return true;
    }

    function focusElement(element: HTMLElement): void {
        const wasClosed = expandEnclosingSection(element);
        const delay = wasClosed ? 260 : 0;

        window.setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('field-highlight-pulse');
            window.setTimeout(() => element.classList.remove('field-highlight-pulse'), 2000);

            const control = element.querySelector<HTMLElement>('input, textarea, select');
            (control ?? element).focus({ preventScroll: true });
        }, delay);
    }

    /** Navigates across routes, prepares target container, and triggers field focus */
    async function executeScrollAndPulse(issue: DiagnosticIssue): Promise<void> {
        if (router.currentRoute.value.path !== issue.route) {
            await router.push(issue.route);
            await nextTick();
        }

        // Run section-specific preparation (e.g. opening edit modal) if registered
        sectionOpeners[issue.section]?.(issue);
        await nextTick();

        window.setTimeout(() => {
            const selector = issue.rowId
                ? `[data-row-id="${CSS.escape(issue.rowId)}"][data-field="${CSS.escape(issue.field)}"]`
                : `[data-field="${CSS.escape(issue.field)}"]`;

            const element = document.querySelector<HTMLElement>(selector);
            if (element) {
                focusElement(element);
            }
        }, 120);
    }

    return {
        issues,
        issueCount: computed(() => issues.value.length),
        hasIssues: computed(() => issues.value.length > 0),
        navigateToIssue: (issue: DiagnosticIssue) => void executeScrollAndPulse(issue),
    };
}
