<script setup lang="ts">
import { computed, ref } from 'vue';
import { QInput, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation, isSchemaRequired } from 'src/composables/useValidation';
import { numberInputAttributes } from 'src/utils/number-input';

defineOptions({ inheritAttrs: false });

//Without `required: undefined`, Vue defaults an omitted Boolean prop to `false`,
// so `props.required ?? isSchemaRequired(...)` would never reach the schema check
const props = withDefaults(
    defineProps<{
        schema: z.ZodType;
        label?: string;
        rules?: ValidationRule[];
        required?: boolean | undefined;
    }>(),
    { required: undefined },
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

defineExpose({ input });
</script>

<template>
    <QInput
        ref="input"
        v-bind="$attrs"
        :class="{ 'zod-required': isRequired }"
        :label="props.label"
        v-model.number="model"
        type="number"
        :min="numberAttrs.min"
        :max="numberAttrs.max"
        :step="numberAttrs.step"
        :rules="rules"
    >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QInput>
</template>
