<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { QSelect, type ValidationRule } from 'quasar';
import type { z } from 'zod';
import { useValidation } from 'src/composables/useValidation';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    schema: z.ZodType;
    rules?: ValidationRule[];
}>();

const model = defineModel<unknown>({ required: true });
const select = ref<QSelect>();
const { toValidationRule, registerForInitialValidation } = useValidation();

const rules = computed(() => [toValidationRule(props.schema), ...(props.rules ?? [])]);

// Registering the select in the global composable queue.
onMounted(() => {
    if (select.value) {
        registerForInitialValidation(() => void select.value?.validate());
    }
});

defineExpose({ select });
</script>

<template>
    <QSelect ref="select" v-bind="$attrs" v-model="model" :rules="rules" :lazy-rules="false">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
    </QSelect>
</template>
