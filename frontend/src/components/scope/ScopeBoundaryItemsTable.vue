<template>
    <q-btn flat color="primary" dense class="q-mb-sm" :label="$t('scopeBndAdd')" @click="addItem" />
    <div v-for="item in items" :key="item.id" class="row items-start q-col-gutter-sm q-mb-sm">
        <div class="col-3">
            <q-input
                v-model="item.type"
                :placeholder="$t('scopeBndColType')"
                :rules="[toValidationRule(BoundaryItemSchema.shape.type)]"
                dense
                outlined
            />
        </div>
        <div class="col-3">
            <q-input
                v-model="item.purpose"
                :placeholder="$t('scopeBndColPurpose')"
                :rules="[toValidationRule(BoundaryItemSchema.shape.purpose)]"
                dense
                outlined
            />
        </div>
        <div class="col-5">
            <q-input
                v-model="item.reason"
                :placeholder="reasonPlaceholder"
                :rules="[toValidationRule(BoundaryItemSchema.shape.reason)]"
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { BoundaryItemSchema } from 'src/models/schema';
import { useMitsiStore } from 'src/stores/mitsi';
import { useValidation } from 'src/composables/useValidation';

const props = defineProps<{
    kind: 'included' | 'excluded';
}>();

const { t } = useI18n();
const mitsi = useMitsiStore();
const { toValidationRule } = useValidation();

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
