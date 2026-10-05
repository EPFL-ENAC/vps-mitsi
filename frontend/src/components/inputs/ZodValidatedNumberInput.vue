<script setup lang="ts">
import { computed, ref } from 'vue';
import { QInput, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation } from 'src/composables/useValidation';
import { numberInputAttributes } from 'src/utils/number-input';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    schema: z.ZodType;
    rules?: ValidationRule[];
}>();

// Vue's number modifier preserves empty strings and clearable null values.
const model = defineModel<string | number | null | undefined>({ required: true });
const input = ref<QInput>();
const { toValidationRule } = useValidation();

const rules = computed(() => [toValidationRule(props.schema), ...(props.rules ?? [])]);
const numberAttrs = computed(() => numberInputAttributes(props.schema));

defineExpose({ input });
</script>

<template>
    <QInput
        ref="input"
        v-bind="$attrs"
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
