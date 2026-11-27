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
                <q-toolbar-title class="ellipsis">
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
                        :name="isReadonly ? symRoundedVisibility : symRoundedEdit"
                        size="14px"
                        class="q-mr-xs"
                    />
                    {{ isReadonly ? $t('inventoryModeReadonly') : $t('inventoryModeEditing') }}
                </q-badge>

                <!-- View mode: a single close action, edits are discarded by design -->
                <q-btn
                    v-if="isReadonly"
                    v-close-popup
                    flat
                    round
                    dense
                    :icon="symRoundedClose"
                    text-color="grey-7"
                    class="q-ml-sm"
                />

                <!-- Edit mode: Cancel discards the draft, Save writes it back -->
                <template v-else>
                    <q-btn
                        unelevated
                        dense
                        no-caps
                        color="grey-3"
                        text-color="dark"
                        :label="$t('commonCancel')"
                        class="q-ml-md q-px-sm"
                        @click="cancel"
                    />
                    <q-btn
                        unelevated
                        dense
                        no-caps
                        color="primary"
                        :label="$t('commonSave')"
                        class="q-ml-sm q-px-sm"
                        @click="save"
                    />
                </template>
            </q-toolbar>

            <!--Centered scrollable content-->
            <HardwareDetailForm v-model:row="row" :readonly="isReadonly" />
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import {
    symRoundedClose,
    symRoundedEdit,
    symRoundedVisibility,
} from '@quasar/extras/material-symbols-rounded';
import { computed, nextTick, ref, toRaw, useTemplateRef } from 'vue';
import type { QCard } from 'quasar';
import { useI18n } from 'vue-i18n';

import HardwareDetailForm from 'src/components/inventory/HardwareDetailForm.vue';
import type { HardwareItem } from 'src/models/HardwareItem/schema';
import { useSurveyDataStore } from 'src/stores/surveyData';
import type { DialogOptions } from 'src/types/ui';
import { focusAndPulseField } from 'src/utils/error-navigation';
import { formatCategoryName } from 'src/utils/format';

const { t } = useI18n();
const emit = defineEmits<{ close: [rowId: string] }>();

const surveyData = useSurveyDataStore();
const row = ref<HardwareItem>();
/** The store row the draft was cloned from; `row` is a throwaway copy in edit mode. */
let targetRow: HardwareItem | undefined;
/** Set for a freshly added row, so Cancel removes it again instead of leaving it blank. */
let isNewRow = false;
const open = ref(false);
const isReadonly = ref(false);
const card = useTemplateRef<QCard>('card');

let shown = false;
let pendingField: string | undefined;

/** Detached copy so Cancel can discard and Save can publish atomically. */
function cloneRow(source: HardwareItem): HardwareItem {
    return JSON.parse(JSON.stringify(toRaw(source))) as HardwareItem;
}

async function showAndFocus(
    nextRow: HardwareItem,
    { mode = 'edit', field, isNew }: DialogOptions = {},
): Promise<void> {
    targetRow = nextRow;
    isNewRow = Boolean(isNew) && mode === 'edit';
    row.value = mode === 'edit' ? cloneRow(nextRow) : nextRow;
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

/** Publishes the draft onto the store row, then closes (which fires `close`). */
function save(): void {
    if (!isReadonly.value && row.value && targetRow) {
        Object.assign(targetRow, cloneRow(row.value));
    }
    isNewRow = false;
    open.value = false;
}

/** Discards the draft; a row created by "Add row" is removed again. */
function cancel(): void {
    if (isNewRow && targetRow) {
        const index = surveyData.hardware.findIndex((item) => item.id === targetRow?.id);
        if (index >= 0) surveyData.hardware.splice(index, 1);
    }
    isNewRow = false;
    open.value = false;
}

function onBeforeHide(): void {
    shown = false;
    pendingField = undefined;

    const rowId = targetRow?.id ?? row.value?.id;
    if (rowId) emit('close', rowId);
}

function onHide(): void {
    if (!open.value) {
        targetRow = undefined;
        row.value = undefined;
        isNewRow = false;
    }
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
    if ((targetRow?.id ?? row.value?.id) === rowId) open.value = false;
}

defineExpose({ showAndFocus, closeIfShowing });
</script>

<style scoped>
.border-bottom {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
