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
                    <div class="text-subtitle1 text-weight-bold ellipsis">{{ itemTitle }}</div>
                    <div class="text-caption text-grey-7">{{ categoryLabel }}</div>
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
            <HardwareDetailForm v-model:row="row" :readonly="readonly" />
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import HardwareDetailForm from 'src/components/inventory/HardwareDetailForm.vue';
import type { HardwareItem } from 'src/models/HardwareItem/schema';
import { formatCategoryName } from 'src/utils/format';

const open = defineModel<boolean>('open', { required: true });
const row = defineModel<HardwareItem>('row', { required: true });

defineProps<{
    readonly: boolean;
}>();

const { t } = useI18n();

const categoryLabel = computed(() =>
    formatCategoryName(row.value.category, row.value.categoryOther, t),
);
const itemTitle = computed(
    () =>
        row.value.name.trim() ||
        t('inventoryDialogUntitledItem', { category: categoryLabel.value }),
);
</script>

<style scoped>
.border-bottom {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
