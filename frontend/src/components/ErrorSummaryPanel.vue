<template>
    <div class="error-summary-wrapper">
        <q-btn
            unelevated
            dense
            no-caps
            class="text-weight-medium rounded-borders q-px-sm"
            :class="hasIssues ? 'bg-amber-1 text-brown-9' : 'bg-grey-2 text-grey-8'"
            :aria-label="t('errorPanel.title', { count: issueCount })"
            @click="dialogOpen = true"
        >
            <q-icon
                :name="hasIssues ? 'warning' : 'check_circle'"
                size="20px"
                class="q-mr-xs"
                :class="hasIssues ? 'text-warning' : 'text-positive'"
            />
            <span>
                {{
                    hasIssues
                        ? t('errorPanel.triggerBtn', { count: issueCount }, issueCount)
                        : t('errorPanel.noIssues')
                }}
            </span>
        </q-btn>

        <q-dialog
            v-model="dialogOpen"
            position="bottom"
            transition-show="slide-up"
            transition-hide="slide-down"
        >
            <q-card class="error-summary-sheet">
                <q-card-section class="row items-center justify-between q-pb-none">
                    <div class="row items-center q-gutter-x-sm">
                        <q-icon
                            :name="hasIssues ? 'warning' : 'check_circle'"
                            :color="hasIssues ? 'warning' : 'positive'"
                            size="30px"
                        />
                        <div class="text-subtitle1 text-weight-bold">
                            {{
                                hasIssues
                                    ? t('errorPanel.title', { count: issueCount })
                                    : t('errorPanel.noIssues')
                            }}
                        </div>
                    </div>
                    <q-btn
                        v-close-popup
                        flat
                        round
                        dense
                        icon="close"
                        :aria-label="t('errorPanel.closeAriaLabel')"
                    />
                </q-card-section>

                <q-card-section class="q-pt-xs">
                    <div v-if="hasIssues" class="text-caption text-grey-7 q-mb-sm">
                        {{ t('errorPanel.subtitle') }}
                    </div>

                    <div v-if="!hasIssues" class="q-py-md text-center text-grey-7">
                        {{ t('errorPanel.noIssues') }}
                    </div>

                    <q-list v-else separator bordered class="rounded-borders error-summary-list">
                        <q-item
                            v-for="issue in issues"
                            :key="issue.id"
                            v-ripple
                            clickable
                            class="q-py-sm"
                            @click="selectIssue(issue)"
                        >
                            <q-item-section avatar top>
                                <q-avatar
                                    size="32px"
                                    color="amber-1"
                                    text-color="brown-9"
                                    :icon="issue.sectionIcon"
                                />
                            </q-item-section>

                            <q-item-section>
                                <q-item-label class="text-weight-medium">
                                    <span class="text-grey-7">{{ issue.sectionLabel }} · </span>
                                    <span>{{ issue.entityName }}</span>
                                </q-item-label>
                                <q-item-label caption class="text-dark">
                                    <span class="text-weight-bold">{{ issue.fieldLabel }}: </span>
                                    <span>{{ issue.message }}</span>
                                </q-item-label>
                            </q-item-section>

                            <q-item-section side>
                                <q-btn
                                    flat
                                    dense
                                    size="md"
                                    no-caps
                                    style="color: #007480"
                                    icon-right="arrow_forward"
                                    :label="t('errorPanel.goToField')"
                                />
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useErrorNavigation, type DiagnosticIssue } from 'src/composables/useErrorNavigation';

const { t } = useI18n();
const { issues, issueCount, hasIssues, navigateToIssue } = useErrorNavigation();
const dialogOpen = ref(false);

function selectIssue(issue: DiagnosticIssue): void {
    dialogOpen.value = false;
    navigateToIssue(issue);
}
</script>

<style scoped lang="scss">
.error-summary-wrapper {
    display: inline-flex;
    align-items: center;
}

.error-summary-sheet {
    width: 100%;
    max-width: 760px;
    margin: 0 auto 12px;
    border-radius: 12px 12px 8px 8px;
}

.error-summary-list {
    max-height: 48vh;
    overflow-y: auto;
}
</style>
