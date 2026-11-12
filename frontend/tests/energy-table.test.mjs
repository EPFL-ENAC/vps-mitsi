import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    renderEnergyTable,
    renderEnergyDialog,
    renderEnergyDialogShell,
    renderDialogContent,
} from './helpers/render-tables.mjs';
import { DatacenterDraftSchema, DatacenterEnergySchema } from '../src/models/Datacenter/schema.ts';
import { useEnergyDialog, useHardwareDialog } from '../src/composables/useDetailDialog.ts';
import en from '../src/i18n/en-GB/index.ts';

const datacenter = (overrides = {}) =>
    DatacenterDraftSchema.parse({
        id: 'dc-1',
        generalInfo: { name: 'Main datacenter', abbreviation: 'DC' },
        ...overrides,
    });

const filled = (overrides = {}) =>
    datacenter({
        energy: {
            location: 'Lausanne, Switzerland',
            locationComment: 'Primary site',
            carbonIntensity: 500,
            carbonIntensityComment: 'Swiss grid mix average',
            pue: 1.2,
            pueComment: 'Includes cooling',
            energyConsumption: 100,
            energyComment: 'Metered via PDU',
            comment: 'Datacenter note',
            ...overrides,
        },
    });

test('summary table exposes exactly the five master-detail columns', async () => {
    const { columns } = await renderEnergyTable();
    assert.deepEqual(
        columns.map((column) => column.name),
        ['datacenter', 'location', 'carbonIntensity', 'energyConsumption', 'actions'],
    );
    assert.equal(columns.at(-1).align, 'right');
    assert.equal(columns.at(-1).label, '');
    assert.deepEqual(
        columns.map((column) => column.label),
        [
            en.energyColumns.datacenter,
            en.energyColumns.location,
            en.energyColumns.carbonIntensity,
            en.energyColumns.energyConsumption,
            '',
        ],
    );
});

test('editable columns carry the canonical energy schemas', async () => {
    const { columns } = await renderEnergyTable();
    const withZod = columns.filter((column) => column.zod);
    assert.deepEqual(
        withZod.map((column) => column.name),
        ['location', 'carbonIntensity', 'energyConsumption'],
    );
    for (const column of withZod) {
        assert.equal(column.zod, DatacenterEnergySchema.shape[column.name]);
    }
});

test('summary rows format measurements and hide PUE and comments from the master list', async () => {
    const { html, inputs } = await renderEnergyTable({ datacenters: [filled()] });
    assert.ok(html.includes('DC — Main datacenter'));
    assert.ok(html.includes('Lausanne, Switzerland'));
    assert.ok(html.includes('500 gCO₂/kWh'));
    // Energy consumption is a calculation parameter, so it is summarised with its unit.
    assert.ok(html.includes('100 kWh'));
    // PUE and every comment live in the detail dialog only.
    assert.doesNotMatch(html, />1\.2</);
    assert.doesNotMatch(html, /Swiss grid mix average/);
    assert.doesNotMatch(html, /Datacenter note/);
    assert.doesNotMatch(html, /Metered via PDU/);
    // Master list is read-only: no inline validated inputs.
    assert.equal(inputs.length, 0);
});

test('energy consumption is rendered with a thousands separator', async () => {
    const { html } = await renderEnergyTable({
        datacenters: [filled({ energyConsumption: 12345 })],
    });
    assert.ok(html.includes('12,345 kWh'));
});

test('summary rows fall back to a dash for empty values', async () => {
    const { html } = await renderEnergyTable({ datacenters: [datacenter()] });
    const dashes = html.match(/—/g) ?? [];
    assert.ok(
        dashes.length >= 3,
        'location, carbon intensity and energy consumption fall back to a dash',
    );
    assert.doesNotMatch(html, /null|undefined|NaN/);
});

test('view, edit and clear actions are rendered per row', async () => {
    const { buttons } = await renderEnergyTable({ datacenters: [datacenter()] });
    const labels = buttons.map((control) => control.$attrs['aria-label']);
    assert.ok(labels.includes(en.energyViewRow));
    assert.ok(labels.includes(en.energyEditRow));
    assert.ok(labels.includes(en.energyDcClear));
});

test('clear action confirms and resets the energy block only', async () => {
    const result = await renderEnergyTable({ datacenters: [filled()] });
    const clear = result.buttons.find(
        (control) => control.$attrs['aria-label'] === en.energyDcClear,
    );
    clear.$emit('click');

    assert.equal(result.dialogs.length, 1);
    assert.equal(
        result.dialogs[0].options.message,
        en.energyClearConfirmMessage.replace('{name}', 'DC — Main datacenter'),
    );
    // Nothing is cleared before the confirmation is accepted.
    assert.equal(result.store.datacenters[0].energy.carbonIntensity, 500);

    result.dialogs[0].confirm();
    // Both calculation parameters are cleared together.
    assert.equal(result.store.datacenters[0].energy.carbonIntensity, null);
    assert.equal(result.store.datacenters[0].energy.energyConsumption, null);
    assert.equal(result.store.datacenters[0].energy.comment, '');
    // General information is preserved.
    assert.equal(result.store.datacenters[0].generalInfo.name, 'Main datacenter');
});

test('detail dialog shell exposes the back button, title and mode badge', async () => {
    const readShell = await renderEnergyDialogShell({ row: filled(), readonly: true });
    const readHtml = await renderDialogContent(readShell);
    assert.ok(readHtml.includes('arrow_back'));
    assert.ok(readHtml.includes('DC — Main datacenter'));
    assert.ok(readHtml.includes(en.energyDcTitle));
    assert.ok(readHtml.includes(en.inventoryModeReadonly));

    const editShell = await renderEnergyDialogShell({ row: filled() });
    const editHtml = await renderDialogContent(editShell);
    assert.ok(editHtml.includes(en.inventoryModeEditing));
});

test('detail form renders every energy field with deep-link attributes', async () => {
    const { html, zodInputs } = await renderEnergyDialog({ row: filled() });

    for (const group of Object.values(en.energyGroups)) {
        const escaped = group.replaceAll('&', '&amp;');
        assert.ok(html.includes(escaped), `missing group ${group}`);
    }

    const fields = zodInputs.map((control) => control.$attrs['data-field']);
    assert.deepEqual([...fields].toSorted(), Object.keys(DatacenterEnergySchema.shape).toSorted());
    for (const control of zodInputs) {
        assert.equal(control.$attrs['data-row-id'], 'dc-1');
    }
});

test('edit mode binds every input to its canonical schema', async () => {
    const { zodInputs } = await renderEnergyDialog({ row: filled() });
    for (const control of zodInputs) {
        assert.equal(
            control.$props.schema,
            DatacenterEnergySchema.shape[control.$attrs['data-field']],
        );
    }
});

test('readonly mode renders text blocks without editable inputs', async () => {
    const { html, zodInputs } = await renderEnergyDialog({ row: filled(), readonly: true });
    assert.equal(zodInputs.length, 0);
    assert.ok(html.includes('Lausanne, Switzerland'));
    assert.ok(html.includes('500 gCO₂/kWh'));
    assert.ok(html.includes('1.2'));
    assert.ok(html.includes('100 kWh'));
    assert.ok(html.includes('Datacenter note'));
});

test('exposed openDialog drives the shared energy dialog state', async () => {
    const row = filled();
    const state = useEnergyDialog();
    const { tableExposed } = await renderEnergyTable({ datacenters: [row] });

    assert.equal(state.dialogOpen.value, false);
    assert.equal(typeof tableExposed.openDialog, 'function');

    tableExposed.openDialog(row, 'view');
    assert.equal(state.dialogOpen.value, true);
    assert.equal(state.dialogMode.value, 'view');
    assert.equal(state.selectedRow.value.id, 'dc-1');

    // The mode argument is optional and defaults to editing.
    tableExposed.openDialog(row);
    assert.equal(state.dialogMode.value, 'edit');
    state.close();
    assert.equal(state.dialogOpen.value, false);
    assert.equal(state.selectedRow.value, null);
});

test('hardware and energy dialog states are independent', async () => {
    const energy = useEnergyDialog();
    const hardware = useHardwareDialog();
    energy.close();
    hardware.close();

    energy.open(filled(), 'edit');
    assert.equal(energy.dialogOpen.value, true);
    assert.equal(hardware.dialogOpen.value, false);

    hardware.open({ id: 'h1' }, 'view');
    assert.equal(hardware.dialogMode.value, 'view');
    assert.equal(energy.dialogMode.value, 'edit');

    energy.close();
    hardware.close();
});
