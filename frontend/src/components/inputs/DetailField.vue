<template>
    <div v-if="readonly" class="q-py-xs" :data-row-id="rowId" :data-field="field">
        <div v-if="label && !hideReadonlyLabel" class="text-caption text-grey-7 q-mb-xs">
            {{ label }}
        </div>
        <slot name="readonly">
            <div class="text-body2 text-dark text-weight-medium">{{ formattedValue }}</div>
        </slot>
    </div>

    <slot v-else>
        <ZodValidatedNumberInput
            v-if="kind === 'number'"
            v-model="numberModel"
            :schema="schema!"
            :label="label"
            :data-row-id="rowId"
            :data-field="field"
            outlined
            dense
        />
        <ZodValidatedSelect
            v-else-if="kind === 'select'"
            v-model="stringModel"
            :schema="schema!"
            :options="options ?? []"
            :label="label"
            :data-row-id="rowId"
            :data-field="field"
            emit-value
            map-options
            outlined
            dense
        />
        <ZodValidatedTextInput
            v-else
            v-model="stringModel"
            :schema="schema!"
            :label="label"
            :data-row-id="rowId"
            :data-field="field"
            outlined
            dense
        />
    </slot>
</template>

<script setup lang="ts" generic="T extends string | number | null | undefined">
import { computed } from 'vue';
import type { z } from 'zod';

import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedSelect from 'src/components/inputs/ZodValidatedSelect.vue';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';

const model = defineModel<T>();

const props = withDefaults(
    defineProps<{
        readonly: boolean;
        rowId: string;
        field: string;
        label?: string | undefined;
        kind?: 'text' | 'number' | 'select';
        schema?: z.ZodType | undefined;
        options?: readonly { label: string; value: string }[] | undefined;
        unit?: string | undefined;
        /** Optional override when read-only text differs from model value (e.g. custom category). */
        displayValue?: string | undefined;
        /** Hides the caption in read-only mode when the card header already names the field. */
        hideReadonlyLabel?: boolean;
    }>(),
    {
        kind: 'text',
        label: undefined,
        schema: undefined,
        options: undefined,
        unit: undefined,
        displayValue: undefined,
        hideReadonlyLabel: false,
    },
);

const formattedValue = computed<string>(() => {
    if (props.displayValue !== undefined) {
        return props.displayValue || '—';
    }
    const val = model.value;
    if (val === null || val === undefined || val === '') return '—';
    if (props.options) {
        return props.options.find((opt) => opt.value === val)?.label ?? String(val);
    }
    return props.unit ? `${val} ${props.unit}` : String(val);
});

const stringModel = computed<string | undefined>({
    get: () => (typeof model.value === 'string' ? model.value : undefined),
    // `T` is constrained to string | number | null | undefined, so narrowing back to T is safe,
    // but the compiler cannot prove it for an arbitrary generic member.
    set: (val) => {
        model.value = val as T; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    },
});

const numberModel = computed<number | null | undefined>({
    get: () => (typeof model.value === 'number' ? model.value : null),
    set: (val) => {
        model.value = val as T; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    },
});
</script>
