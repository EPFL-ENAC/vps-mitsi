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
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="location"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.location') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.location) }}
                            </div>
                        </div>
                        <ZodValidatedTextInput
                            v-else
                            v-model="dc.energy.location"
                            :schema="DatacenterEnergySchema.shape.location"
                            :label="$t('energyColumns.location')"
                            :data-row-id="dc.id"
                            data-field="location"
                            outlined
                            dense
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="locationComment"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.locationComment') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.locationComment) }}
                            </div>
                        </div>
                        <ZodValidatedTextInput
                            v-else
                            v-model="dc.energy.locationComment"
                            :schema="DatacenterEnergySchema.shape.locationComment"
                            :label="$t('energyColumns.locationComment')"
                            :data-row-id="dc.id"
                            data-field="locationComment"
                            outlined
                            dense
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
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="carbonIntensity"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.carbonIntensity') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.carbonIntensity, 'gCO₂/kWh') }}
                            </div>
                        </div>
                        <ZodValidatedNumberInput
                            v-else
                            v-model="dc.energy.carbonIntensity"
                            :schema="DatacenterEnergySchema.shape.carbonIntensity"
                            :label="$t('energyColumns.carbonIntensity')"
                            :data-row-id="dc.id"
                            data-field="carbonIntensity"
                            outlined
                            dense
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="carbonIntensityComment"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.carbonIntensityComment') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.carbonIntensityComment) }}
                            </div>
                        </div>
                        <ZodValidatedTextInput
                            v-else
                            v-model="dc.energy.carbonIntensityComment"
                            :schema="DatacenterEnergySchema.shape.carbonIntensityComment"
                            :label="$t('energyColumns.carbonIntensityComment')"
                            :data-row-id="dc.id"
                            data-field="carbonIntensityComment"
                            outlined
                            dense
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
                        <div v-if="readonly" class="q-py-xs" :data-row-id="dc.id" data-field="pue">
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.pue') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.pue) }}
                            </div>
                        </div>
                        <ZodValidatedNumberInput
                            v-else
                            v-model="dc.energy.pue"
                            :schema="DatacenterEnergySchema.shape.pue"
                            :label="$t('energyColumns.pue')"
                            :data-row-id="dc.id"
                            data-field="pue"
                            outlined
                            dense
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="pueComment"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.pueComment') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.pueComment) }}
                            </div>
                        </div>
                        <ZodValidatedTextInput
                            v-else
                            v-model="dc.energy.pueComment"
                            :schema="DatacenterEnergySchema.shape.pueComment"
                            :label="$t('energyColumns.pueComment')"
                            :data-row-id="dc.id"
                            data-field="pueComment"
                            outlined
                            dense
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
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="energyConsumption"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.energyConsumption') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.energyConsumption, 'kWh') }}
                            </div>
                        </div>
                        <ZodValidatedNumberInput
                            v-else
                            v-model="dc.energy.energyConsumption"
                            :schema="DatacenterEnergySchema.shape.energyConsumption"
                            :label="$t('energyColumns.energyConsumption')"
                            :data-row-id="dc.id"
                            data-field="energyConsumption"
                            outlined
                            dense
                        />
                    </div>
                    <div class="col-12 col-sm-6">
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="dc.id"
                            data-field="energyComment"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t('energyColumns.energyComment') }}
                            </div>
                            <div class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonly(dc.energy.energyComment) }}
                            </div>
                        </div>
                        <ZodValidatedTextInput
                            v-else
                            v-model="dc.energy.energyComment"
                            :schema="DatacenterEnergySchema.shape.energyComment"
                            :label="$t('energyColumns.energyComment')"
                            :data-row-id="dc.id"
                            data-field="energyComment"
                            outlined
                            dense
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
                <div v-if="readonly" class="q-py-xs" :data-row-id="dc.id" data-field="comment">
                    <div class="text-body2 text-dark text-weight-medium">
                        {{ formatReadonly(dc.energy.comment) }}
                    </div>
                </div>
                <ZodValidatedTextInput
                    v-else
                    v-model="dc.energy.comment"
                    :schema="DatacenterEnergySchema.shape.comment"
                    :label="$t('energyColumns.comment')"
                    :data-row-id="dc.id"
                    data-field="comment"
                    outlined
                    dense
                />
            </q-card-section>
        </q-card>
    </q-card-section>
</template>

<script setup lang="ts">
import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { DatacenterEnergySchema, type DatacenterDraft } from 'src/models/Datacenter/schema';

const dc = defineModel<DatacenterDraft>('row', { required: true });

defineProps<{
    readonly: boolean;
}>();

function formatReadonly(val: string | number | null | undefined, unit?: string): string {
    if (val === null || val === undefined || val === '') return '—';
    return unit ? `${val} ${unit}` : String(val);
}
</script>
