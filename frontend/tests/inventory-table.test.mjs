import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderInventoryTable } from './helpers/inventory-table.mjs';
import {
    DatacenterDraftSchema,
    HardwareItemDraftSchema,
    HardwareItemSchema,
} from '../src/models/schema.ts';
import en from '../src/i18n/en-GB/index.ts';

test('advanced inventory covers all display fields exactly once', async () => {
    const { columns } = await renderInventoryTable();
    const fields = columns.map((column) => column.field);
    assert.equal(new Set(fields).size, fields.length);
    assert.deepEqual(
        fields.toSorted(),
        [
            ...Object.keys(HardwareItemSchema.shape).filter((field) => field !== 'id'),
            'subtotal',
        ].toSorted(),
    );
    for (const column of columns) {
        assert.equal(column.name, column.field);
        assert.equal(column.label, en.inventoryColumns[column.field]);
    }
});

test('visibility modes are cumulative and group spans match rendered columns', async () => {
    const groups = [
        'General',
        'Impact (∑)',
        'CPU',
        'Memory',
        'Storage',
        'GPU',
        'Network &amp; PSU',
    ];
    const expectedSpans = {
        simple: [5, 2, 1, 2, 2, 1],
        normal: [6, 4, 2, 2, 2, 3, 1],
        advanced: [7, 4, 5, 3, 6, 5, 3],
    };
    let previous = [];
    for (const mode of ['simple', 'normal', 'advanced']) {
        const { html, columns } = await renderInventoryTable({
            mode,
            hardware: [HardwareItemDraftSchema.parse({})],
        });
        const names = columns.map((column) => column.name);
        assert.deepEqual(
            names.filter((name) => previous.includes(name)),
            previous,
        );
        const groupRow = html.match(/<tr[^>]*inventory-group-row[^>]*>(.*?)<\/tr>/s)?.[1];
        assert.ok(groupRow);
        const headers = [...groupRow.matchAll(/<th[^>]*colspan="(\d+)"[^>]*>(.*?)<\/th>/gs)];
        assert.deepEqual(
            headers.map((header) => Number(header[1])),
            expectedSpans[mode],
        );
        assert.deepEqual(
            headers.map((header) => header[2].trim()),
            groups.slice(0, headers.length),
        );
        assert.equal(
            expectedSpans[mode].reduce((sum, span) => sum + span, 0),
            columns.length,
        );
        for (const tag of ['th', 'td']) {
            const kinds = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*data-kind="([^"]+)"`, 'g'))];
            assert.deepEqual(
                kinds.map((cell) => cell[1]),
                columns.map((column) => column.kind),
            );
        }
        previous = names;
    }
});

test('column labels, enum options and datacenter choices use their current sources', async () => {
    const datacenter = DatacenterDraftSchema.parse({
        id: 'dc-1',
        generalInfo: { name: 'Main datacenter', abbreviation: 'DC' },
    });
    const { columns, html } = await renderInventoryTable({
        datacenters: [datacenter],
        messages: {
            ...en,
            inventoryColumns: { ...en.inventoryColumns, name: 'Equipment name' },
            inventoryCategory_server: 'Translated server',
            inventoryGroups: { ...en.inventoryGroups, general: 'Translated general' },
        },
    });
    assert.equal(columns.find((column) => column.name === 'name').label, 'Equipment name');
    assert.match(html, /Translated general<\/th>/);
    assert.deepEqual(columns.find((column) => column.name === 'datacenterId').options, [
        { label: 'DC — Main datacenter', value: 'dc-1' },
    ]);
    assert.equal(
        columns
            .find((column) => column.name === 'category')
            .options.find((option) => option.value === 'server').label,
        'Translated server',
    );
    const empty = await renderInventoryTable();
    assert.deepEqual(empty.columns.find((column) => column.name === 'datacenterId').options, []);
});

test('derived columns calculate from inputs and subtotal sorts by calculated value', async () => {
    const row = HardwareItemDraftSchema.parse({
        quantity: 3,
        impactManufacturingDistributionEol: 12,
        memoryQuantity: 4,
        memorySizeGb: 16,
        storageQuantity: 2,
        storageSize: 1000,
        memoryTotalGb: 999,
        storageTotal: 999,
    });
    const { columns, html } = await renderInventoryTable({ hardware: [row] });
    const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
    assert.equal(byName.memoryTotalGb.derived(row), 64);
    assert.equal(byName.storageTotal.derived(row), 2000);
    assert.equal(byName.subtotal.derived(row), 36);
    assert.equal(byName.subtotal.sort(undefined, undefined, row, { ...row, quantity: 1 }), 24);
    assert.equal(byName.memoryTotalGb.derived({ ...row, memoryQuantity: null }), 0);
    assert.equal(byName.storageTotal.derived({ ...row, storageSize: undefined }), 0);
    assert.match(html, /<tbody>/);
});
