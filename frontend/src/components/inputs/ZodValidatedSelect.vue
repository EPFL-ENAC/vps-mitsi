<script setup lang="ts">
import { computed, ref } from 'vue';
import { QSelect, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation, isSchemaRequired } from 'src/composables/useValidation';

defineOptions({ inheritAttrs: false });

// Without `required: undefined`, Vue defaults an omitted Boolean prop to `false`,
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

const model = defineModel<unknown>({ required: true });
const select = ref<QSelect>();
const { toValidationRule } = useValidation();

const isRequired = computed(() => props.required ?? isSchemaRequired(props.schema));
const rules = computed(() => [toValidationRule(props.schema), ...(props.rules ?? [])]);

defineExpose({ select });
</script>

<template>
    <QSelect
        ref="select"
        v-bind="$attrs"
        v-model="model"
        :class="{ 'zod-required': isRequired }"
        :label="props.label"
        :rules="rules"
    >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QSelect>
</template>
