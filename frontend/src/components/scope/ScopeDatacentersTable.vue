<template>
    <q-btn flat color="primary" class="q-mb-sm" :label="$t('scopeDcAdd')" @click="addDatacenter" />
    <div class="row items-center q-col-gutter-x-sm q-py-xs">
        <div class="col-3">
            <div class="scope-th">{{ $t('scopeDcColAbbreviation') }}</div>
        </div>
        <div class="col-3">
            <div class="scope-th">{{ $t('scopeDcColName') }}</div>
        </div>
        <div class="col-3">
            <div class="scope-th">{{ $t('scopeDcColComment') }}</div>
        </div>
        <div class="col-2">
            <div class="scope-th text-right">{{ $t('scopeDcColUsedBy') }}</div>
        </div>
        <div class="col-1" />
    </div>
    <div
        v-for="dc in mitsi.scope.datacenters"
        :key="dc.id"
        class="row items-center q-col-gutter-x-sm q-py-xs"
    >
        <div class="col-3">
            <q-input
                class="full-width"
                v-model="dc.abbreviation"
                :rules="[toValidationRule(DatacenterSchema.shape.abbreviation)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-3">
            <q-input
                class="full-width"
                v-model="dc.name"
                :rules="[toValidationRule(DatacenterSchema.shape.name)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-3">
            <q-input class="full-width" v-model="dc.comment" dense outlined hide-bottom-space />
        </div>
        <div class="col-2 text-right text-grey-7">
            {{ usedByCell(dc) }}
        </div>
        <div class="col-1 text-right">
            <q-btn
                flat
                dense
                icon="delete"
                :aria-label="$t('scopeDcDelete')"
                @click="removeDatacenter(dc)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';

import type { Datacenter } from 'src/models/mitsi';
import { DatacenterSchema } from 'src/models/schema';
import { useMitsiStore } from 'src/stores/mitsi';
import { useValidation } from 'src/composables/useValidation';

const { t } = useI18n();
const $q = useQuasar();
const mitsi = useMitsiStore();
const { toValidationRule } = useValidation();

function addDatacenter(): void {
    mitsi.addDatacenter();
}

function usedByCell(dc: Datacenter): string {
    const guard = mitsi.deleteDatacenterGuard(dc.id);
    if (!guard) return t('scopeDcUsedByNone');
    return t('scopeDcUsedByCounts', {
        inv: t('scopeDcInvRows', guard.hardwareRowCount),
        eng: t('scopeDcEngRecords', guard.energyRecordCount),
    });
}

function removeDatacenter(dc: Datacenter): void {
    const guard = mitsi.deleteDatacenterGuard(dc.id);
    const name = dc.abbreviation || dc.name || t('scopeDcColAbbreviation');
    if (guard) {
        $q.dialog({
            title: t('scopeDcDeleteBlockedTitle'),
            message: t('scopeDcDeleteBlocked', {
                name,
                inv: t('scopeDcInvRows', guard.hardwareRowCount),
                eng: t('scopeDcEngRecords', guard.energyRecordCount),
            }),
            ok: true,
        });
        return;
    }
    $q.dialog({
        title: t('scopeDcDeleteConfirmTitle'),
        message: t('scopeDcDeleteConfirmMessage', { name }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const i = mitsi.scope.datacenters.findIndex((d) => d.id === dc.id);
        if (i >= 0) mitsi.scope.datacenters.splice(i, 1);
    });
}
</script>

<style scoped>
.scope-th {
    font-size: 12px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #78828f;
    font-weight: 600;
}
</style>
