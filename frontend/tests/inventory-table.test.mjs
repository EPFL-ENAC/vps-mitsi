import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    renderInventoryTable,
    renderInventoryDialog,
    renderInventoryDialogShell,
    renderDialogContent,
} from './helpers/render-tables.mjs';
import { DatacenterDraftSchema } from '../src/models/Datacenter/schema.ts';
import { HardwareItemDraftSchema, HardwareItemSchema } from '../src/models/HardwareItem/schema.ts';
import en from '../src/i18n/en-GB/index.ts';

const datacenter = (overrides = {}) =>
    DatacenterDraftSchema.parse({
        id: 'dc-1',
        generalInfo: { name: 'Main datacenter', abbreviation: 'DC' },
        ...overrides,
    });

test('summary table exposes exactly the five master-detail columns', async () => {
    const { columns } = await renderInventoryTable();
    assert.deepEqual(
        columns.map((column) => column.name),
        ['category', 'name', 'quantity', 'datacenterId', 'actions'],
    );
    assert.equal(columns.at(-1).align, 'right');
    assert.deepEqual(
        columns.map((column) => column.label),
        [
            en.inventoryColumns.category,
            en.inventoryColumns.name,
            en.inventoryColumns.quantity,
            en.inventoryColumns.datacenterId,
            '',
        ],
    );
});

test('summary rows render translated category, name fallback, quantity and datacenter', async () => {
    const row = HardwareItemDraftSchema.parse({
        id: 'h1',
        category: 'storage_bay',
        quantity: 4,
        datacenterId: 'dc-1',
    });
    const { html } = await renderInventoryTable({ hardware: [row], datacenters: [datacenter()] });
    assert.ok(html.includes(en.inventoryCategory_storage_bay));
    assert.ok(html.includes(en.inventoryColumns.name));
    assert.ok(html.includes('>4<'));
    assert.ok(html.includes('DC — Main datacenter'));

    const hidden = await renderInventoryTable({ hardware: [row] });
    assert.ok(hidden.html.includes('>—<'));
});

test('view, edit and delete actions are rendered per row', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1' });
    const { buttons } = await renderInventoryTable({ hardware: [row] });
    const labels = buttons.map((control) => control.$attrs['aria-label']);
    assert.ok(labels.includes(en.inventoryViewRow));
    assert.ok(labels.includes(en.inventoryEditRow));
    assert.ok(labels.includes(en.inventoryDeleteRow));
});

test('delete action confirms and removes the row', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1', name: 'Router' });
    const result = await renderInventoryTable({ hardware: [row] });
    const remove = result.buttons.find(
        (control) => control.$attrs['aria-label'] === en.inventoryDeleteRow,
    );
    remove.$emit('click');
    assert.equal(result.dialogs.length, 1);
    assert.equal(
        result.dialogs[0].options.message,
        en.inventoryDeleteConfirmMessage.replace('{name}', 'Router'),
    );
    result.dialogs[0].confirm();
    assert.equal(result.store.hardware.length, 0);
});

test('detail dialog shell exposes the back button, title context and mode badge', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1', name: 'Server' });
    const readShell = await renderInventoryDialogShell({ row, readonly: true });
    const readHtml = await renderDialogContent(readShell);
    assert.ok(readHtml.includes('arrow_back'));
    assert.ok(readHtml.includes('Server'));
    assert.ok(readHtml.includes(en.inventoryCategory_server));
    assert.ok(readHtml.includes(en.inventoryModeReadonly));

    const editShell = await renderInventoryDialogShell({ row });
    const editHtml = await renderDialogContent(editShell);
    assert.ok(editHtml.includes(en.inventoryModeEditing));

    const untitled = await renderInventoryDialogShell({
        row: HardwareItemDraftSchema.parse({ id: 'h2' }),
    });
    const untitledHtml = await renderDialogContent(untitled);
    assert.ok(untitledHtml.includes('Untitled'));
});

test('detail form renders every group and field with deep-link attributes', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1', name: 'Server' });
    const { html, inputs, selects, toggles } = await renderInventoryDialog({
        row,
        datacenters: [datacenter()],
    });

    for (const group of Object.values(en.inventoryGroups)) {
        const escaped = group.replaceAll('&', '&amp;');
        assert.ok(html.includes(escaped), `missing group ${group}`);
    }

    const fields = new Set([
        ...inputs.map((control) => control.$attrs['data-field']),
        ...selects.map((control) => control.$attrs['data-field']),
        ...toggles.map((control) => control.$attrs['data-field']),
    ]);
    assert.deepEqual(
        [...fields].toSorted(),
        Object.keys(HardwareItemSchema.shape)
            .filter(
                (field) => field !== 'id' && field !== 'memoryTotalGb' && field !== 'storageTotal',
            )
            .toSorted(),
    );
    for (const control of [...inputs, ...selects, ...toggles]) {
        assert.equal(control.$attrs['data-row-id'], 'h1');
    }
});

test('readonly mode renders text details without editable inputs', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1', name: 'Server A' });
    const { html, inputs, selects, toggles } = await renderInventoryDialog({ row, readonly: true });
    assert.equal(inputs.length, 0);
    assert.equal(selects.length, 0);
    assert.equal(toggles.length, 0);
    assert.ok(html.includes('Server A'));
    assert.ok(html.includes(en.inventoryColumns.memoryTotalGb));
});

test('edit mode keeps controls enabled', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1' });
    const { inputs, selects, toggles } = await renderInventoryDialog({ row });
    for (const control of [...inputs, ...selects, ...toggles]) {
        assert.equal(control.$props.disable, false);
    }
});

test('enum and datacenter options come from the schema and the store', async () => {
    const row = HardwareItemDraftSchema.parse({ id: 'h1' });
    const { selects } = await renderInventoryDialog({
        row,
        datacenters: [datacenter()],
        messages: {
            ...en,
            inventoryCategory_server: 'Translated server',
        },
    });
    const category = selects.find((control) => control.$attrs['data-field'] === 'category');
    assert.equal(
        category.$props.options.find((option) => option.value === 'server').label,
        'Translated server',
    );
    const datacenterSelect = selects.find(
        (control) => control.$attrs['data-field'] === 'datacenterId',
    );
    assert.deepEqual(datacenterSelect.$props.options, [
        { label: 'DC — Main datacenter', value: 'dc-1' },
    ]);
});
