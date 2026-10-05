<script setup lang="ts">
import { computed } from 'vue';
import { QInput } from 'quasar';
import type { z } from 'zod';
import { useValidation } from 'src/composables/useValidation';
import { numberInputAttributes } from 'src/utils/number-input';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    schema: z.ZodType;
}>();

// Vue's number modifier preserves empty strings and clearable null values.
const model = defineModel<string | number | null | undefined>({ required: true });
const { toValidationRule } = useValidation();

const rules = computed(() => [toValidationRule(props.schema)]);
const numberAttrs = computed(() => numberInputAttributes(props.schema));
</script>

<template>
    <QInput
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
