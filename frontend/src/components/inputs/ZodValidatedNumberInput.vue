<script setup lang="ts">
import { computed, ref } from 'vue';
import { QInput, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation, isSchemaRequired } from 'src/composables/useValidation';
import { numberInputAttributes } from 'src/utils/number-input';
import { formatNumber, parseNumber } from 'src/utils/format';

defineOptions({ inheritAttrs: false });

//Without `required: undefined`, Vue defaults an omitted Boolean prop to `false`,
// so `props.required ?? isSchemaRequired(...)` would never reach the schema check
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
const { toValidationRule } = useValidation();

const isRequired = computed(() => props.required ?? isSchemaRequired(props.schema));
const rules = computed(() => [toValidationRule(props.schema), ...(props.rules ?? [])]);
const numberAttrs = computed(() => numberInputAttributes(props.schema));

// Formatted fields type as text so a comma is never rejected by the native number input.
const inputAttrs = computed(() =>
    props.formatThousands
        ? { type: 'text' as const, inputmode: 'decimal' as const }
        : { type: 'number' as const, ...numberAttrs.value },
);

const isFocused = ref(false);
/** Raw digits kept while the field has focus, so separators never fight the caret. */
const rawText = ref('');

/** Formatted while idle, raw text while editing; the model keeps the unformatted value. */
const displayValue = computed(() => {
    if (isFocused.value) return rawText.value;
    if (props.formatThousands && typeof model.value === 'number') {
        return formatNumber(model.value);
    }
    return model.value ?? '';
});

function onFocus(): void {
    isFocused.value = true;
    rawText.value = model.value == null ? '' : String(model.value);
}

function onUpdate(value: string | number | null): void {
    rawText.value = value == null ? '' : String(value);
    model.value = typeof value === 'string' ? parseNumber(value) : value;
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
        @blur="isFocused = false"
        @focus="onFocus"
        @update:model-value="onUpdate"
    >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QInput>
</template>
