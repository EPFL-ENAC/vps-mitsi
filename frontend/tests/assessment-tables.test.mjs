import assert from 'node:assert/strict';
import { test } from 'node:test';
import ScopeDatacentersTable from '../src/components/scope/ScopeDatacentersTable.vue';
import ScopeBoundaryItemsTable from '../src/components/scope/ScopeBoundaryItemsTable.vue';
import EnergyDatacentersTable from '../src/components/energy/EnergyDatacentersTable.vue';
import ResultsPage from '../src/pages/ResultsPage.vue';
import {
    DatacenterDraftSchema,
    DatacenterEnergySchema,
    DatacenterGeneralInfoSchema,
    BoundaryItemDraftSchema,
    HardwareItemDraftSchema,
} from '../src/models/schema.ts';
import en from '../src/i18n/en-GB/index.ts';
import { renderTables } from './helpers/render-tables.mjs';

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
    assert.equal(typeof intensity.rules[0](0), 'string');
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
    assert.match(result.html, /DC — Test datacenter/);
    assert.match(result.html, /data-kind="number"[^>]*>—<\/td>/);
    assert.match(result.html, /<th scope="row"/);
    assert.equal(result.store.totalEmbodied, 0);
});
