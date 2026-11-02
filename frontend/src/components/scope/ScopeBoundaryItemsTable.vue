<template>
    <div>
        <div v-if="items.length > 0" class="q-mb-sm">
            <div
                v-for="item in items"
                :key="item.id"
                class="boundary-row row items-baseline q-gutter-sm q-mb-sm"
            >
                <span
                    class="boundary-prefix"
                    :class="{ 'boundary-prefix--included': kind === 'included' }"
                >
                    {{ t(`scopeBoundary.${kind}.prefix`) }}
                </span>

                <ZodValidatedTextInput
                    v-model="item.type"
                    :schema="BoundaryItemSchema.shape.type"
                    :placeholder="t('scopeBoundary.placeholders.type')"
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
            class="boundary-add-btn text-weight-bold"
            :class="kind === 'included' ? 'text-primary' : 'text-dark'"
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

    &--included {
        color: #0b6b66;
    }
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

.boundary-add-btn {
    letter-spacing: 0.5px;
    padding-left: 0;
}
</style>
