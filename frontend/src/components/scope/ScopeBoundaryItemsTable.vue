<template>
    <q-btn flat color="primary" dense class="q-mb-sm" :label="$t('scopeBndAdd')" @click="addItem" />
    <div v-for="item in items" :key="item.id" class="row items-start q-col-gutter-sm q-mb-sm">
        <div class="col-3">
            <ZodValidatedTextInput
                v-model="item.type"
                :placeholder="$t('scopeBndColType')"
                :schema="BoundaryItemSchema.shape.type"
                dense
                outlined
            />
        </div>
        <div class="col-3">
            <ZodValidatedTextInput
                v-model="item.purpose"
                :placeholder="$t('scopeBndColPurpose')"
                :schema="BoundaryItemSchema.shape.purpose"
                dense
                outlined
            />
        </div>
        <div class="col-5">
            <ZodValidatedTextInput
                v-model="item.reason"
                :placeholder="reasonPlaceholder"
                :schema="BoundaryItemSchema.shape.reason"
                dense
                outlined
            />
        </div>
        <div class="col-1 text-right">
            <q-btn
                flat
                dense
                icon="delete"
                :aria-label="$t('scopeBndDelete')"
                @click="removeItem(item.id)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { BoundaryItemSchema } from 'src/models/schema';
import { useMitsiStore } from 'src/stores/mitsi';

const props = defineProps<{
    kind: 'included' | 'excluded';
}>();

const { t } = useI18n();
const mitsi = useMitsiStore();

const items = computed(() =>
    props.kind === 'included' ? mitsi.scope.includedItems : mitsi.scope.excludedItems,
);

const reasonPlaceholder = computed(() =>
    t(props.kind === 'included' ? 'scopeBndColReasonInclusion' : 'scopeBndColReasonExclusion'),
);

function addItem(): void {
    mitsi.addBoundaryItem(props.kind);
}

function removeItem(id: string): void {
    const i = items.value.findIndex((item) => item.id === id);
    if (i >= 0) items.value.splice(i, 1);
}
</script>
