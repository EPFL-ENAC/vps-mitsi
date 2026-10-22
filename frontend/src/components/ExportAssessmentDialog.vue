<template>
    <q-dialog v-model="open" :aria-label="t('exportDialogTitle')" @show="resetForm">
        <q-card style="width: 520px; max-width: 100%">
            <q-form @submit.prevent="onConfirm">
                <q-card-section class="text-h6">
                    {{ t('exportDialogTitle') }}
                </q-card-section>

                <q-card-section class="q-pt-none">
                    <p class="text-grey-7 q-mb-md">{{ t('exportDialogHint') }}</p>

                    <ZodValidatedTextInput
                        v-model="form.exportedBy"
                        :label="t('exportDialogExportedByLabel')"
                        :placeholder="t('exportDialogExportedByPlaceholder')"
                        :schema="ExportMetadataDraftSchema.shape.exportedBy"
                        autofocus
                        dense
                        outlined
                        class="q-mb-sm"
                    />

                    <ZodValidatedTextInput
                        v-model="form.comment"
                        type="textarea"
                        :label="t('exportDialogCommentLabel')"
                        :placeholder="t('exportDialogCommentPlaceholder')"
                        :schema="ExportMetadataDraftSchema.shape.comment"
                        autogrow
                        dense
                        outlined
                    />
                </q-card-section>

                <q-card-actions align="right">
                    <q-btn flat :label="t('exportDialogCancel')" @click="open = false" />
                    <q-btn
                        unelevated
                        color="primary"
                        type="submit"
                        :label="t('exportDialogConfirm')"
                        :disable="!isFormValid"
                    />
                </q-card-actions>
            </q-form>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import {
    type ExportMetadataInput,
    ExportMetadataDraftSchema,
} from 'src/models/ExportMetadata/schema';

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    confirm: [metadata: ExportMetadataInput];
}>();

const { t } = useI18n();

const form = reactive({
    exportedBy: '',
    comment: '',
});

function resetForm(): void {
    form.exportedBy = '';
    form.comment = '';
}

const isFormValid = computed(() => form.exportedBy.trim().length > 0);

function onConfirm(): void {
    const parsed = ExportMetadataDraftSchema.safeParse(form);
    if (!parsed.success) return;

    emit('confirm', parsed.data);
    open.value = false;
}
</script>
