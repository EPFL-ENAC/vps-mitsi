<template>
    <div>
        <div v-if="items.length > 0" class="q-mb-sm">
            <div
                v-for="item in items"
                :key="item.id"
                class="boundary-row row items-baseline q-gutter-sm q-mb-sm"
            >
                <span class="boundary-prefix">
                    {{ t(`scopeBoundary.${kind}.prefix`) }}
                </span>

                <ZodValidatedTextInput
                    v-model="item.type"
                    :schema="BoundaryItemSchema.shape.type"
                    :placeholder="t('scopeBoundary.placeholders.type')"
                    :data-row-id="item.id"
                    data-field="type"
                    dense
                    outlined
                    hide-bottom-space
                    class="boundary-input"
                />

                <span class="boundary-separator">{{ t('scopeBoundary.separators.usedFor') }}</span>

                <ZodValidatedTextInput
                    v-model="item.purpose"
                    :schema="BoundaryItemSchema.shape.purpose"
                    :placeholder="t('scopeBoundary.placeholders.purpose')"
                    :data-row-id="item.id"
                    data-field="purpose"
                    dense
                    outlined
                    hide-bottom-space
                    class="boundary-input"
                />

                <span class="boundary-separator">{{ t('scopeBoundary.separators.because') }}</span>

                <ZodValidatedTextInput
                    v-model="item.reason"
                    :schema="BoundaryItemSchema.shape.reason"
                    :placeholder="t(`scopeBoundary.placeholders.${kind}Reason`)"
                    :data-row-id="item.id"
                    data-field="reason"
                    dense
                    outlined
                    hide-bottom-space
                    class="boundary-input boundary-input--grow"
                />

                <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    :aria-label="t('scopeBndDelete')"
                    @click="removeItem(item.id)"
                />
            </div>
        </div>

        <q-btn
            flat
            dense
            no-caps
            class="q-mb-xs text-body2 text-weight-medium text-grey-9"
            :label="`+ ${t(`scopeBoundary.${kind}.add`)}`"
            @click="addItem"
        />
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { computed } from 'vue';
import { BoundaryItemSchema } from 'src/models/Scope/schema';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    kind: 'included' | 'excluded';
}>();

const surveyData = useSurveyDataStore();
const { t } = useI18n();

const items = computed(() =>
    props.kind === 'included' ? surveyData.scope.includedItems : surveyData.scope.excludedItems,
);

function addItem(): void {
    surveyData.addBoundaryItem(props.kind);
}

function removeItem(id: string): void {
    const i = items.value.findIndex((item) => item.id === id);
    if (i >= 0) items.value.splice(i, 1);
}
</script>

<style scoped lang="scss">
.boundary-prefix {
    font-weight: 700;
    white-space: nowrap;
    min-width: 140px;
    color: #1d1d1d;
}

.boundary-separator {
    color: #555;
    white-space: nowrap;
}

.boundary-input {
    flex: 1 1 200px;
    min-width: 150px;

    &--grow {
        flex: 1.5 1 260px;
    }
}
</style>
