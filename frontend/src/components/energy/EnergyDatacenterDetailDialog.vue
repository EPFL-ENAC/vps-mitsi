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
                    <div class="text-subtitle1 text-weight-bold ellipsis">{{ dcTitle }}</div>
                    <div class="text-caption text-grey-7">{{ $t('energyDcTitle') }}</div>
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
            <EnergyDatacenterDetailForm v-model:row="row" :readonly="isReadonly" />
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import type { QCard } from 'quasar';
import EnergyDatacenterDetailForm from 'src/components/energy/EnergyDatacenterDetailForm.vue';
import type { DatacenterDraft } from 'src/models/Datacenter/schema';
import type { DialogOptions } from 'src/types/ui';
import { focusAndPulseField } from 'src/utils/error-navigation';
import { formatDatacenterName } from 'src/utils/format';

const row = ref<DatacenterDraft>();
const open = ref(false);
const isReadonly = ref(false);
const card = useTemplateRef<QCard>('card');

let shown = false;
let pendingField: string | undefined;

async function showAndFocus(
    nextRow: DatacenterDraft,
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

const dcTitle = computed(() => (row.value ? formatDatacenterName(row.value) : ''));

defineExpose({ showAndFocus });
</script>

<style scoped>
.border-bottom {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
