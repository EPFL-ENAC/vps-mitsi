<script setup lang="ts">
import { computed, ref } from 'vue';
import { QInput, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation, isSchemaRequired } from 'src/composables/useValidation';
import { numberInputAttributes } from 'src/utils/number-input';
import { formatNumber, parseNumber } from 'src/utils/format';

defineOptions({ inheritAttrs: false });

// Without `required: undefined`, Vue defaults an omitted Boolean prop to `false`,
// so `props.required ?? isSchemaRequired(...)` would never reach the schema check.
const props = withDefaults(
    defineProps<{
        schema: z.ZodType;
        label?: string | undefined;
        rules?: ValidationRule[] | undefined;
        required?: boolean | undefined;
        /** Shows comma thousands separators while idle, raw digits while editing. */
        formatThousands?: boolean | undefined;
    }>(),
    { label: undefined, rules: undefined, required: undefined, formatThousands: false },
);

const model = defineModel<string | number | null | undefined>({
    required: true,
    set(value) {
        if (value === '' || value === null || value === undefined) {
            const empty = props.schema.safeParse(undefined);
            return empty.success && empty.data === undefined ? undefined : null;
        }
        return value;
    },
});
const input = ref<QInput>();
const editText = ref<string | null>(null);
const { toValidationRule } = useValidation();

const isRequired = computed(() => props.required ?? isSchemaRequired(props.schema));
const numberAttrs = computed(() => numberInputAttributes(props.schema));

const rules = computed<ValidationRule[]>(() => {
    const rule = toValidationRule(props.schema);
    return [
        typeof rule === 'function'
            ? (value, patterns) => rule(parseInputValue(value), patterns)
            : rule,
        ...(props.rules ?? []),
    ];
});

// Formatted fields type as text so a comma is never rejected by the native number input.
const inputAttrs = computed(() =>
    props.formatThousands
        ? { type: 'text' as const, inputmode: 'decimal' as const }
        : { type: 'number' as const, ...numberAttrs.value },
);

const displayValue = computed(() => {
    const value = model.value ?? '';
    if (!props.formatThousands) return value;
    if (editText.value !== null) return editText.value;
    return typeof value === 'number' ? formatNumber(value) : value;
});

function parseInputValue<T>(value: T): T | string | number {
    return typeof value === 'string' ? parseNumber(value) : value;
}

function onFocus(): void {
    if (props.formatThousands) editText.value = String(model.value ?? '');
}

function onUpdate(value: string | number | null): void {
    if (editText.value !== null) editText.value = String(value ?? '');
    model.value = parseInputValue(value);
}

defineExpose({ input });
</script>

<template>
    <QInput
        ref="input"
        v-bind="{ ...$attrs, ...inputAttrs }"
        :class="{ 'zod-required': isRequired }"
        :label="props.label"
        :model-value="displayValue"
        :rules="rules"
        @blur="editText = null"
        @focus="onFocus"
        @update:model-value="onUpdate"
    >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QInput>
</template>
