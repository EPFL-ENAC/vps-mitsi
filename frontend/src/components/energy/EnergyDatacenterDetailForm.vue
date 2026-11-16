<template>
    <q-card-section class="col scroll q-pa-md bg-grey-1">
        <!-- 1. Location -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('energyGroups.location') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.location"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="location"
                            :label="$t('energyColumns.location')"
                            :schema="DatacenterEnergySchema.shape.location"
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.locationComment"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="locationComment"
                            :label="$t('energyColumns.locationComment')"
                            :schema="DatacenterEnergySchema.shape.locationComment"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 2. Carbon intensity -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('energyGroups.carbonIntensity') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.carbonIntensity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="carbonIntensity"
                            :label="$t('energyColumns.carbonIntensity')"
                            :schema="DatacenterEnergySchema.shape.carbonIntensity"
                            unit="gCO₂/kWh"
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.carbonIntensityComment"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="carbonIntensityComment"
                            :label="$t('energyColumns.carbonIntensityComment')"
                            :schema="DatacenterEnergySchema.shape.carbonIntensityComment"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 3. PUE -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('energyGroups.pue') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.pue"
                            kind="number"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="pue"
                            :label="$t('energyColumns.pue')"
                            :schema="DatacenterEnergySchema.shape.pue"
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.pueComment"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="pueComment"
                            :label="$t('energyColumns.pueComment')"
                            :schema="DatacenterEnergySchema.shape.pueComment"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 4. Energy Consumption -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('energyGroups.energyConsumption') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.energyConsumption"
                            kind="number"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="energyConsumption"
                            :label="$t('energyColumns.energyConsumption')"
                            :schema="DatacenterEnergySchema.shape.energyConsumption"
                            unit="kWh"
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <DetailField
                            v-model="dc.energy.energyComment"
                            :readonly="readonly"
                            :row-id="dc.id"
                            field="energyComment"
                            :label="$t('energyColumns.energyComment')"
                            :schema="DatacenterEnergySchema.shape.energyComment"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 5. General comment -->
        <q-card flat bordered class="bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('energyGroups.general') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <DetailField
                    v-model="dc.energy.comment"
                    :readonly="readonly"
                    :row-id="dc.id"
                    field="comment"
                    :label="$t('energyColumns.comment')"
                    :schema="DatacenterEnergySchema.shape.comment"
                    hide-readonly-label
                />
            </q-card-section>
        </q-card>
    </q-card-section>
</template>

<script setup lang="ts">
import DetailField from 'src/components/inputs/DetailField.vue';
import { DatacenterEnergySchema, type DatacenterDraft } from 'src/models/Datacenter/schema';

const dc = defineModel<DatacenterDraft>('row', { required: true });

defineProps<{
    readonly: boolean;
}>();
</script>
