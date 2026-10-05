<script setup lang="ts">
import { computed, ref } from 'vue';
import { QInput, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation } from 'src/composables/useValidation';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    schema: z.ZodType;
    rules?: ValidationRule[];
}>();

// Preserve editable values, including cleared fields.
const model = defineModel<string | number | null | undefined>({ required: true });
const input = ref<QInput>();
const { toValidationRule } = useValidation();

const rules = computed(() => [toValidationRule(props.schema), ...(props.rules ?? [])]);

// Expose the underlying Quasar instance for focus(), validate(), etc.
defineExpose({ input });
</script>

<template>
    <QInput ref="input" v-bind="$attrs" v-model="model" :rules="rules">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QInput>
</template>
