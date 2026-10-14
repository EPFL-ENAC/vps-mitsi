<script setup lang="ts">
import { computed } from 'vue';
import { QInput } from 'quasar';
import type { z } from 'zod';
import { useValidation } from 'src/composables/useValidation';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    schema: z.ZodType;
}>();

// Preserve editable values, including cleared fields.
const model = defineModel<string | number | null | undefined>({ required: true });
const { toValidationRule } = useValidation();

const rules = computed(() => [toValidationRule(props.schema)]);
</script>

<template>
    <QInput v-bind="$attrs" v-model="model" :rules="rules">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QInput>
</template>
