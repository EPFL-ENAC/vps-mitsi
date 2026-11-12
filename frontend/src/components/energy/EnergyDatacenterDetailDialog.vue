<template>
    <q-dialog v-model="open" persistent>
        <q-card class="column no-wrap" style="width: 860px; max-width: 95vw; max-height: 90vh">
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
                    :color="readonly ? 'grey-3' : 'amber-2'"
                    :text-color="readonly ? 'grey-9' : 'brown-9'"
                    class="q-pa-xs text-weight-medium rounded-borders q-mr-sm"
                >
                    <q-icon :name="readonly ? 'visibility' : 'edit'" size="14px" class="q-mr-xs" />
                    {{ readonly ? $t('inventoryModeReadonly') : $t('inventoryModeEditing') }}
                </q-badge>

                <q-btn v-close-popup flat round dense icon="close" text-color="grey-7" />
            </q-toolbar>

            <!--Centered scrollable content-->
            <EnergyDatacenterDetailForm v-model:row="dc" :readonly="readonly" />
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EnergyDatacenterDetailForm from 'src/components/energy/EnergyDatacenterDetailForm.vue';
import type { DatacenterDraft } from 'src/models/Datacenter/schema';
import { formatDatacenterName } from 'src/utils/format';

const open = defineModel<boolean>('open', { required: true });
const dc = defineModel<DatacenterDraft>('row', { required: true });

defineProps<{
    readonly: boolean;
}>();

const dcTitle = computed(() => formatDatacenterName(dc.value));
</script>

<style scoped>
.border-bottom {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
