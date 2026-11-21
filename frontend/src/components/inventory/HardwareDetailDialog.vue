<template>
    <q-dialog v-model="open" persistent @show="onShow" @before-hide="onBeforeHide" @hide="onHide">
        <q-card
            v-if="row"
            ref="card"
            class="column no-wrap"
            style="width: 860px; max-width: 95vw; max-height: 90vh"
        >
            <!--Header and a subtle border-->
            <q-toolbar class="bg-white text-dark q-px-md border-bottom">
                <q-btn
                    v-close-popup
                    flat
                    round
                    dense
                    icon="arrow_back"
                    color="dark"
                    :aria-label="$t('commonBack')"
                />
                <q-toolbar-title class="q-ml-sm ellipsis">
                    <div class="text-subtitle1 text-weight-bold ellipsis">{{ itemTitle }}</div>
                    <div class="text-caption text-grey-7">{{ categoryLabel }}</div>
                </q-toolbar-title>

                <!-- Badge -->
                <q-badge
                    :color="isReadonly ? 'grey-3' : 'amber-2'"
                    :text-color="isReadonly ? 'grey-9' : 'brown-9'"
                    class="q-pa-xs text-weight-medium rounded-borders q-mr-sm"
                >
                    <q-icon
                        :name="isReadonly ? 'visibility' : 'edit'"
                        size="14px"
                        class="q-mr-xs"
                    />
                    {{ isReadonly ? $t('inventoryModeReadonly') : $t('inventoryModeEditing') }}
                </q-badge>

                <q-btn v-close-popup flat round dense icon="close" text-color="grey-7" />
            </q-toolbar>

            <!--Centered scrollable content-->
            <HardwareDetailForm v-model:row="row" :readonly="isReadonly" />
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import type { QCard } from 'quasar';
import { useI18n } from 'vue-i18n';

import HardwareDetailForm from 'src/components/inventory/HardwareDetailForm.vue';
import type { HardwareItem } from 'src/models/HardwareItem/schema';
import type { DialogOptions } from 'src/types/ui';
import { focusAndPulseField } from 'src/utils/error-navigation';
import { formatCategoryName } from 'src/utils/format';

const { t } = useI18n();

const row = ref<HardwareItem>();
const open = ref(false);
const isReadonly = ref(false);
const card = useTemplateRef<QCard>('card');

let shown = false;
let pendingField: string | undefined;

async function showAndFocus(
    nextRow: HardwareItem,
    { mode = 'edit', field }: DialogOptions = {},
): Promise<void> {
    row.value = nextRow;
    isReadonly.value = mode === 'view';
    pendingField = field;
    open.value = true;

    if (shown) {
        await nextTick();
        if (open.value) focusPendingField();
    }
}

function focusPendingField(): void {
    const field = pendingField;
    pendingField = undefined;

    if (field && row.value && card.value) {
        focusAndPulseField(card.value.$el, field, row.value.id);
    }
}

function onShow(): void {
    shown = true;
    focusPendingField();
}

function onBeforeHide(): void {
    shown = false;
    pendingField = undefined;
}

function onHide(): void {
    if (!open.value) row.value = undefined;
}

const categoryLabel = computed(() => {
    const item = row.value;
    return item ? formatCategoryName(item.category, item.categoryOther, t) : '';
});

const itemTitle = computed(() =>
    row.value
        ? row.value.name.trim() ||
          t('inventoryDialogUntitledItem', { category: categoryLabel.value })
        : '',
);

function closeIfShowing(rowId: string): void {
    if (row.value?.id === rowId) open.value = false;
}

defineExpose({ showAndFocus, closeIfShowing });
</script>

<style scoped>
.border-bottom {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
