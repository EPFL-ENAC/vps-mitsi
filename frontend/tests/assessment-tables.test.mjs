import assert from 'node:assert/strict';
import { test } from 'node:test';
import ScopeDatacentersTable from '../src/components/scope/ScopeDatacentersTable.vue';
import ScopeBoundaryItemsTable from '../src/components/scope/ScopeBoundaryItemsTable.vue';
import EnergyDatacentersTable from '../src/components/energy/EnergyDatacentersTable.vue';
import EnergyMonitoringPeriodForm from '../src/components/energy/EnergyMonitoringPeriodForm.vue';
import HardwareInventoryTable from '../src/components/inventory/HardwareInventoryTable.vue';
import ResultsPage from '../src/pages/ResultsPage.vue';
import ResultsEmbodiedSection from '../src/components/results/ResultsEmbodiedSection.vue';
import ResultsTotalSection from '../src/components/results/ResultsTotalSection.vue';
import ResultsFunctionalUnitSection from '../src/components/results/ResultsFunctionalUnitSection.vue';
import ReportPreviewPage from '../src/pages/ReportPreviewPage.vue';
import ScopePage from '../src/pages/ScopePage.vue';
import { ScopeDraftSchema, BoundaryItemDraftSchema } from '../src/models/Scope/schema.ts';
import {
    DatacenterDraftSchema,
    DatacenterEnergySchema,
    DatacenterGeneralInfoSchema,
} from '../src/models/Datacenter/schema.ts';
import { HardwareItemDraftSchema } from '../src/models/HardwareItem/schema.ts';
import en from '../src/i18n/en-GB/index.ts';
import { renderTables } from './helpers/render-tables.mjs';
import { setupScope, validHardware } from './helpers/survey-fixtures.mjs';

const datacenter = () =>
    DatacenterDraftSchema.parse({
        id: 'dc-1',
        generalInfo: { abbreviation: 'DC', name: 'Test datacenter' },
    });
const input = (result, label) =>
    result.inputs.find((control) => control.$attrs['aria-label'] === label);
const button = (result, label) =>
    result.buttons.find((control) => control.$attrs['aria-label'] === label);

function assertCellKinds({ html, tables }) {
    const columns = tables[0].columns;
    for (const tag of ['th', 'td']) {
        const kinds = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*data-kind="([^"]+)"`, 'g'))].map(
            (m) => m[1],
        );
        assert.deepEqual(
            kinds,
            columns.map((column) => column.kind),
        );
    }
}

test('scope datacenter columns validate and edit general information without touching energy', async () => {
    const result = await renderTables(ScopeDatacentersTable, {
        setupStore(store) {
            store.datacenters = [datacenter()];
        },
        messages: {
            ...en,
            scopeDatacenterColumns: { ...en.scopeDatacenterColumns, name: 'Translated name' },
        },
    });
    assertCellKinds(result);
    assert.deepEqual(
        result.tables[0].columns.map((c) => c.name),
        ['abbreviation', 'name', 'comment', 'usedBy'],
    );
    for (const column of result.tables[0].columns.filter((c) => c.zod)) {
        assert.equal(column.zod, DatacenterGeneralInfoSchema.shape[column.name]);
    }
    const name = input(result, 'Translated name');
    name.$emit('update:modelValue', 'Renamed');
    assert.equal(result.store.datacenters[0].generalInfo.name, 'Renamed');
    assert.equal(result.store.datacenters[0].energy.comment, '');
    assert.equal(typeof name.rules[0](''), 'string');
});

test('scope deletion still blocks referenced datacenters and confirms unreferenced deletion', async () => {
    const used = await renderTables(ScopeDatacentersTable, {
        setupStore(store) {
            store.datacenters = [datacenter()];
            store.hardware = [HardwareItemDraftSchema.parse({ id: 'h1', datacenterId: 'dc-1' })];
        },
    });
    assert.match(used.html, /1 inventory row/);
    button(used, en.scopeDcDelete).$emit('click');
    assert.equal(used.dialogs[0].options.title, en.scopeDcDeleteBlockedTitle);
    assert.equal(used.dialogs[0].confirm, undefined);
    assert.equal(used.store.datacenters.length, 1);

    const unused = await renderTables(ScopeDatacentersTable, {
        setupStore(store) {
            store.datacenters = [datacenter()];
        },
    });
    button(unused, en.scopeDcDelete).$emit('click');
    assert.equal(unused.store.datacenters.length, 1);
    unused.dialogs[0].confirm();
    assert.equal(unused.store.datacenters.length, 0);
});

test('boundary tables keep persistent contextual headers and edit the selected collection', async () => {
    for (const kind of ['included', 'excluded']) {
        const result = await renderTables(ScopeBoundaryItemsTable, {
            props: { kind },
            setupStore(store) {
                store.scope[`${kind}Items`] = [BoundaryItemDraftSchema.parse({ id: 'b1' })];
            },
        });
        assertCellKinds(result);
        const label = en.scopeBoundaryColumns[kind].reason;
        assert.match(result.html, new RegExp(label));
        input(result, label).$emit('update:modelValue', 'Assessment boundary');
        assert.equal(result.store.scope[`${kind}Items`][0].reason, 'Assessment boundary');
        assert.equal(
            result.store.scope[kind === 'included' ? 'excludedItems' : 'includedItems'].length,
            0,
        );
        button(result, en.scopeBndDelete).$emit('click');
        assert.equal(result.store.scope[`${kind}Items`].length, 0);
    }
});

test('energy inputs retain canonical validation and nested updates; clear requires confirmation', async () => {
    const result = await renderTables(EnergyDatacentersTable, {
        setupStore(store) {
            store.datacenters = [datacenter()];
        },
    });
    assertCellKinds(result);
    assert.deepEqual(
        result.tables[0].columns.map((c) => c.name),
        ['datacenter', ...Object.keys(DatacenterEnergySchema.shape)],
    );
    for (const column of result.tables[0].columns.filter((c) => c.zod)) {
        assert.equal(column.zod, DatacenterEnergySchema.shape[column.name]);
    }
    const intensity = input(result, en.energyColumns.carbonIntensity);
    assert.equal(intensity.rules[0](0), true);
    intensity.$emit('update:modelValue', 125);
    input(result, en.energyColumns.comment).$emit('update:modelValue', 'Energy note');
    input(result, en.energyColumns.pue).$emit('update:modelValue', null);
    assert.equal(result.store.datacenters[0].energy.carbonIntensity, 125);
    assert.equal(result.store.datacenters[0].energy.comment, 'Energy note');
    assert.equal(result.store.datacenters[0].energy.pue, null);
    assert.equal(result.store.datacenters[0].generalInfo.comment, '');
    button(result, en.energyDcClear).$emit('click');
    assert.equal(result.store.datacenters[0].energy.carbonIntensity, 125);
    result.dialogs[0].confirm();
    assert.equal(result.store.datacenters[0].energy.carbonIntensity, null);
    assert.equal(result.store.datacenters[0].energy.comment, '');
    assert.equal(result.store.datacenters[0].generalInfo.name, 'Test datacenter');
});

test('empty editable tables still render translated column headers', async () => {
    for (const [component, props, expected] of [
        [ScopeDatacentersTable, {}, en.scopeDatacenterColumns.name],
        [ScopeBoundaryItemsTable, { kind: 'included' }, en.scopeBoundaryColumns.included.reason],
        [EnergyDatacentersTable, {}, en.energyColumns.carbonIntensity],
    ]) {
        const result = await renderTables(component, { props });
        assert.match(result.html, new RegExp(expected));
        assert.equal(result.tables[0].rows.length, 0);
    }
});

test('results preserve translated report headers, excluded totals and missing operational values', async () => {
    const result = await renderTables(ResultsPage, {
        setupStore(store) {
            store.datacenters = [datacenter()];
            store.hardware = [
                HardwareItemDraftSchema.parse({
                    id: 'h1',
                    name: 'Reused server',
                    quantity: 2,
                    impactManufacturingDistributionEol: 12,
                    isSecondHand: true,
                }),
            ];
        },
        messages: {
            ...en,
            resultsEmbodiedColumns: { ...en.resultsEmbodiedColumns, name: 'Translated equipment' },
            resultsOperationalColumns: {
                ...en.resultsOperationalColumns,
                datacenterId: 'Translated datacenter',
            },
        },
    });
    assert.match(result.html, /Translated equipment/);
    assert.match(result.html, /Translated datacenter/);
    assert.match(result.html, /results-strike[^>]*>24\.00<\/span>/);
    assert.match(result.html, /not counted/);
    const operationalTable = result.tables.find((table) =>
        table.columns.some((column) => column.name === 'pue'),
    );
    assert.deepEqual(operationalTable.rows, []);
    assert.deepEqual(result.datacenterCharts[0].rows, []);
    assert.match(result.html, /data-kind="number"[^>]*>—<\/td>/);
    assert.match(result.html, /<th scope="row"/);
    assert.equal(result.results.totalEmbodiedEmissionsKg.result, 0);
});

test('embodied results render the available partial total while retaining unfinished rows', async () => {
    const result = await renderTables(ResultsEmbodiedSection, {
        setupStore(store) {
            store.hardware = [
                HardwareItemDraftSchema.parse({
                    id: 'valid',
                    quantity: 2,
                    impactManufacturingDistributionEol: 12,
                }),
                HardwareItemDraftSchema.parse({ id: 'unfinished' }),
            ];
        },
    });
    assert.equal(result.results.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(result.results.totalEmbodiedEmissionsKg.result, 24);
    const group = result.results.embodiedEmissionsByCategory[0];
    assert.equal(group.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(group.totalEmbodiedEmissionsKg.result, 24);
    assert.equal(group.totalEmbodiedEmissionsKg.ignoredInputs[0], result.store.hardware[1]);
    assert.equal(result.tables[0].rows.length, 2);
    assert.match(result.html, /results-category-total[\s\S]*<strong>24\.00<\/strong>/);
    assert.match(result.html, /results-total-table[\s\S]*<strong>24\.00<\/strong>/);
});

test('select and toggle edits write through to the store', async () => {
    const inventory = await renderTables(HardwareInventoryTable, {
        props: { mode: 'simple' },
        setupStore(store) {
            store.datacenters = [datacenter()];
            store.hardware = [HardwareItemDraftSchema.parse({ id: 'h1' })];
        },
    });
    const [category, datacenterSelect] = inventory.selects;
    category.$emit('update:modelValue', 'storage_bay');
    datacenterSelect.$emit('update:modelValue', 'dc-1');
    inventory.toggles[0].$emit('update:modelValue', true);
    const row = inventory.store.hardware[0];
    assert.deepEqual(
        [row.category, row.datacenterId, row.isSecondHand],
        ['storage_bay', 'dc-1', true],
    );

    const period = await renderTables(EnergyMonitoringPeriodForm);
    period.selects[0].$emit('update:modelValue', 'week');
    assert.equal(period.store.monitoringPeriod.unit, 'week');

    const scope = await renderTables(ScopePage);
    const [timeUnit, resourceType] = scope.selects;
    timeUnit.$emit('update:modelValue', 'day');
    resourceType.$emit('update:modelValue', 'GPU');
    assert.equal(scope.store.scope.functionalUnit.timeUnit, 'day');
    assert.equal(scope.store.scope.functionalUnit.resourceType, 'GPU');
});

test('results and report share partial totals, PUE labels, functional units and stable row keys', async () => {
    for (const component of [ResultsPage, ReportPreviewPage]) {
        const result = await renderTables(component, {
            setupStore(store) {
                store.scope = ScopeDraftSchema.parse({
                    organizationName: 'EPFL',
                    assessors: 'Assessor',
                    serviceName: 'Research service',
                    function: 'Research',
                    lifespanYears: 1,
                    functionalUnit: {
                        timeUnit: 'day',
                        usageDuration: 2,
                        resourceCount: 3,
                        resourceType: 'CPU',
                    },
                });
                store.monitoringPeriod.unit = 'year';
                store.monitoringPeriod.value = 1;
                store.datacenters = [
                    DatacenterDraftSchema.parse({
                        id: 'ready',
                        generalInfo: { name: 'Ready', abbreviation: 'R' },
                        energy: { carbonIntensity: 1000, energyConsumption: 100, pue: 1.5 },
                    }),
                    DatacenterDraftSchema.parse({
                        id: 'draft',
                        generalInfo: { name: 'Draft', abbreviation: 'D' },
                    }),
                ];
            },
        });
        assert.match(result.html, /150\.00 \(Partial — 1 of 2 datacenters\)/);
        assert.match(result.html, /150\.00 \(Partial\)/);
        assert.match(result.html, /included \(1\.5\)/);
        assert.match(result.html, /Usage of 2 day of the service with 3 CPU/);
        const table = result.tables.find((table) =>
            table.columns.some((column) => column.name === 'pue'),
        );
        assert.deepEqual(table.rows.map(table.rowKey), ['ready']);
        assert.deepEqual(
            result.datacenterCharts[0].rows.map((row) => row.datacenter.id),
            ['ready'],
        );
        assert.equal(result.datacenterCharts[0].total, 150);
        if (component === ReportPreviewPage) {
            assert.equal((result.html.match(/class="report-sheet"/g) || []).length, 5);
            assert.match(result.html, /Research service/);
        }
    }
});

test('combined totals and ratios render partial values and pass numbers to the split chart', async () => {
    for (const component of [ResultsTotalSection, ResultsFunctionalUnitSection]) {
        const result = await renderTables(component, {
            props: component === ResultsTotalSection ? { showChart: true } : {},
            setupStore(store) {
                setupScope(store);
                store.datacenters = [];
                store.scope.functionalUnit.resourceType = 'CPU';
                store.scope.functionalUnit.timeUnit = 'year';
                store.hardware = [
                    { ...validHardware(), cpuQuantity: 1, impactManufacturingDistributionEol: 10 },
                    {
                        ...validHardware(),
                        id: 'editing',
                        cpuQuantity: 1,
                        impactManufacturingDistributionEol: null,
                    },
                ];
            },
        });
        assert.equal(result.results.totalLifespanEmissionsKg.success, 'partial');
        if (component === ResultsTotalSection) {
            assert.match(result.html, /10\.00 \(Partial\)/);
            assert.equal(result.splitCharts[0].total, 10);
            assert.equal(result.splitCharts[0].embodied, 10);
        } else {
            assert.match(result.html, /5\.00 kg CO₂ \(Partial\)/);
            assert.match(result.html, /5\.0000 kg CO₂ \/ 5000\.0000 g CO₂ \(Partial\)/);
        }
    }
});

test('unfinished descriptive scope fields do not mark complete emission values as partial', async () => {
    const result = await renderTables(ResultsTotalSection, {
        setupStore(store) {
            store.hardware = [{ ...validHardware(), impactManufacturingDistributionEol: 10 }];
        },
    });
    assert.equal(result.results.totalLifespanEmissionsKg.success, 'success');
    assert.match(result.html, /<strong>10\.00<\/strong>/);
    assert.doesNotMatch(result.html, /10\.00 \(Partial\)/);
});
