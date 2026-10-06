import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { Quasar } from 'quasar';
import { z } from 'zod';
import ZodValidatedNumberInput from '../src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedTextInput from '../src/components/inputs/ZodValidatedTextInput.vue';
import { DatacenterEnergySchema, HardwareItemSchema } from '../src/models/schema.ts';
import en from '../src/i18n/en-GB/index.ts';

/** Render the real Quasar input and capture its public API, without a DOM stub. */
async function renderInput(component, props, slots = {}) {
    let input;
    const updates = [];
    const context = { req: { headers: {} } };
    const app = createSSRApp({
        render: () =>
            h(
                component,
                {
                    modelValue: '',
                    ...props,
                    'onUpdate:modelValue': (value) => updates.push(value),
                },
                slots,
            ),
    });
    app.mixin({
        created() {
            if (this.$options.name === 'QInput') input = this;
        },
    });
    app.use(Quasar, {}, context);
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }));
    const html = await renderToString(app, context);
    assert.ok(input);
    return { html, input, updates };
}

test('number inputs convert values without clamping, defaulting or losing clear values', async () => {
    const { input, updates } = await renderInput(ZodValidatedNumberInput, {
        schema: HardwareItemSchema.shape.quantity,
    });
    for (const value of ['2', '1.5', '-1', '', null]) input.$emit('update:modelValue', value);
    assert.deepEqual(updates, [2, 1.5, -1, '', null]);
    assert.equal(input.rules[0](-1), 'Must be at least 1.');
    assert.equal(input.rules[0](1.5), 'Must be a whole number.');
});

test('schema attributes and validation override caller-supplied ones', async () => {
    const { html, input } = await renderInput(ZodValidatedNumberInput, {
        schema: z.number().int().min(1).max(5),
        type: 'text',
        min: -100,
        max: 100,
        step: 0.25,
        rules: [() => 'Caller rule'],
    });
    assert.match(html, /type="number"/);
    assert.match(html, /min="1"/);
    assert.match(html, /max="5"/);
    assert.match(html, /step="1"/);
    assert.equal(input.rules.length, 1);
    assert.equal(input.rules[0](0), 'Must be at least 1.');
    assert.equal(await input.validate(6), false);
    assert.equal(await input.validate(3), true);
});

test('nullable decimals accept clearing and unbounded attributes are omitted', async () => {
    const { html, input } = await renderInput(ZodValidatedNumberInput, {
        schema: DatacenterEnergySchema.shape.pue,
        modelValue: null,
    });
    assert.match(html, /min="0"/);
    assert.match(html, /step="any"/);
    assert.doesNotMatch(html, /\bmax=/);
    assert.equal(input.rules[0](null), true);
    assert.equal(input.rules[0](''), true);
    assert.equal(input.rules[0](1.25), true);
    assert.equal(input.rules[0](-1), 'Must be at least 0.');
});

test('text inputs forward textarea styling, slots and events while preserving text', async () => {
    let focused = 0;
    const { html, input, updates } = await renderInput(
        ZodValidatedTextInput,
        {
            schema: z.string().min(1),
            type: 'textarea',
            class: 'description-field',
            style: { width: '240px' },
            outlined: true,
            dense: true,
            placeholder: 'Describe the service',
            'aria-label': 'Description',
            onFocus: () => focused++,
        },
        {
            default: () => h('span', 'Tooltip content'),
            append: () => h('span', 'Append content'),
        },
    );
    assert.match(html, /<textarea/);
    assert.match(html, /description-field/);
    assert.match(html, /width:240px/);
    assert.match(html, /q-field--outlined/);
    assert.match(html, /q-field--dense/);
    assert.match(html, /placeholder="Describe the service"/);
    assert.match(html, /aria-label="Description"/);
    assert.match(html, /Tooltip content/);
    assert.match(html, /Append content/);
    input.$emit('focus', {});
    input.$emit('update:modelValue', '001');
    input.$emit('update:modelValue', '');
    assert.equal(focused, 1);
    assert.deepEqual(updates, ['001', '']);
    assert.equal(input.rules[0](''), 'This field is required.');
});
