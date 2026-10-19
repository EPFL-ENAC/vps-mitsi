<script setup lang="ts" generic="C extends ComputationResult<unknown, unknown>">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { QTooltip } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { z } from 'zod';
import type { ComputationResult } from 'src/utils/computation';
import { useValidation } from 'src/composables/useValidation';

type Available = Exclude<C, { success: 'failure' }>;
type Incomplete = Exclude<C, { success: 'success' }>;

function isAvailable(computation: C): computation is Available {
    return computation.success !== 'failure';
}

function isFailure(computation: C): computation is Extract<C, { success: 'failure' }> {
    return computation.success === 'failure';
}

function isIncomplete(computation: C): computation is Incomplete {
    return computation.success !== 'success';
}

const props = defineProps<{
    computation: C;
    formatValue?: (value: Available['result']) => string;
    /** Hide available values and their default slot; failure labels and diagnostics remain. */
    hideValue?: boolean;
    missingLabel?: string;
    disableTooltip?: boolean;
    /** Optional partial-status label beside the interactive indicator; plain mode uses its status. */
    partialFlagLabel?: string;
}>();

defineSlots<{
    default(props: { result: Available['result']; computation: Available }): unknown;
    failure(props: { computation: Extract<C, { success: 'failure' }> }): unknown;
    indicator(props: { computation: Incomplete }): unknown;
    tooltip(props: { computation: Incomplete }): unknown;
    issue(props: { issue: z.core.$ZodIssue; errorIndex: number; issueIndex: number }): unknown;
    'ignored-input'(props: { input: C['ignoredInputs'][number]; index: number }): unknown;
}>();

const { t } = useI18n();
const { formatIssue } = useValidation();
const tooltipId = `computation-tooltip-${useId()}`;
const indicator = ref<HTMLButtonElement>();
const tooltipOpen = ref(false);
const pinned = ref(false);
const focused = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const hasIssues = computed(() =>
    props.computation.inputErrors.some((error) => error.issues.length),
);

function cancelHide() {
    clearTimeout(hideTimer);
    hideTimer = undefined;
}

function showTooltip() {
    if (props.disableTooltip) return;
    cancelHide();
    tooltipOpen.value = true;
}

function dismissTooltip() {
    cancelHide();
    pinned.value = false;
    tooltipOpen.value = false;
}

function scheduleHide() {
    cancelHide();
    if (pinned.value || focused.value) return;
    // Allow the pointer to cross the gap between the icon and the scrollable tooltip.
    hideTimer = setTimeout(dismissTooltip, 150);
}

function togglePinned() {
    if (pinned.value) dismissTooltip();
    else {
        pinned.value = true;
        showTooltip();
    }
}

function onFocus() {
    focused.value = true;
    showTooltip();
}

function isInsideTooltip(target: EventTarget | null): boolean {
    return target instanceof Node && document.getElementById(tooltipId)?.contains(target) === true;
}

function onBlur(event: FocusEvent) {
    focused.value = false;
    // Clicking the scrollbar or selecting text can move focus to the document body.
    if (!isInsideTooltip(event.relatedTarget) && !(pinned.value && event.relatedTarget === null)) {
        dismissTooltip();
    }
}

function onPointerDown(event: PointerEvent) {
    if (isInsideTooltip(event.target)) {
        pinned.value = true;
        return;
    }
    if (event.target instanceof Node && !indicator.value?.contains(event.target)) {
        dismissTooltip();
    }
}

function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') dismissTooltip();
}

function removeListeners() {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('blur', dismissTooltip);
}

watch(tooltipOpen, (open) => {
    removeListeners();
    if (open) {
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('blur', dismissTooltip);
    }
});

watch(() => props.computation.success, dismissTooltip);
watch(
    () => props.disableTooltip,
    () => {
        focused.value = false;
        dismissTooltip();
        removeListeners();
    },
);

onBeforeUnmount(() => {
    cancelHide();
    removeListeners();
});
</script>

<template>
    <span class="computation-result-display">
        <slot
            v-if="!hideValue && isAvailable(computation)"
            :result="computation.result"
            :computation="computation"
        >
            {{ formatValue ? formatValue(computation.result) : computation.result }}
        </slot>
        <slot v-else-if="isFailure(computation)" name="failure" :computation="computation">
            {{ missingLabel ?? t('mainNotApplicable') }}
        </slot>

        <span
            v-if="isIncomplete(computation) && disableTooltip"
            class="computation-result-display__status"
            :class="`computation-result-display__status--${computation.success}`"
        >
            {{ t(`computationResult.${computation.success}.status`) }}
        </span>
        <span v-else-if="computation.success === 'partial' && partialFlagLabel">{{
            ' ' + partialFlagLabel
        }}</span>
        <button
            v-if="isIncomplete(computation) && !disableTooltip"
            ref="indicator"
            type="button"
            class="computation-result-display__indicator"
            :class="`computation-result-display__indicator--${computation.success}`"
            :aria-label="t(`computationResult.${computation.success}.label`)"
            :aria-describedby="tooltipOpen ? tooltipId : undefined"
            @mouseenter="showTooltip"
            @mouseleave="scheduleHide"
            @focus="onFocus"
            @blur="onBlur"
            @click.stop="togglePinned"
        >
            <slot name="indicator" :computation="computation">
                <span class="material-icons" aria-hidden="true">info_outline</span>
            </slot>
            <QTooltip
                :id="tooltipId"
                :model-value="tooltipOpen"
                no-parent-event
                anchor="bottom middle"
                self="top middle"
                :offset="[0, 4]"
                max-width="min(360px, calc(100vw - 24px))"
                max-height="min(320px, 50vh)"
                class="computation-result-display__tooltip"
                @update:model-value="dismissTooltip"
                @mouseenter="showTooltip"
                @mouseleave="scheduleHide"
                @focusin="showTooltip"
                @focusout="onBlur"
            >
                <slot name="tooltip" :computation="computation">
                    <p class="computation-result-display__explanation">
                        {{ t(`computationResult.${computation.success}.explanation`) }}
                    </p>
                    <template
                        v-for="(error, errorIndex) in computation.inputErrors"
                        :key="errorIndex"
                    >
                        <section
                            v-if="error.issues.length"
                            class="computation-result-display__group"
                        >
                            <strong>{{
                                t('computationResult.validationError', { index: errorIndex + 1 })
                            }}</strong>
                            <ul class="computation-result-display__list">
                                <li v-for="(issue, issueIndex) in error.issues" :key="issueIndex">
                                    <slot
                                        name="issue"
                                        :issue="issue"
                                        :error-index="errorIndex"
                                        :issue-index="issueIndex"
                                    >
                                        <strong
                                            >{{
                                                issue.path.length
                                                    ? issue.path.map(String).join('.')
                                                    : t('computationResult.input')
                                            }}:</strong
                                        >
                                        {{ formatIssue(issue) }}
                                    </slot>
                                </li>
                            </ul>
                        </section>
                    </template>
                    <section
                        v-if="computation.ignoredInputs.length"
                        class="computation-result-display__group"
                    >
                        {{
                            t(
                                'computationResult.ignoredInputs',
                                { count: computation.ignoredInputs.length },
                                computation.ignoredInputs.length,
                            )
                        }}
                        <ul v-if="$slots['ignored-input']" class="computation-result-display__list">
                            <li v-for="(input, index) in computation.ignoredInputs" :key="index">
                                <slot name="ignored-input" :input="input" :index="index" />
                            </li>
                        </ul>
                    </section>
                    <p
                        v-if="!hasIssues && !computation.ignoredInputs.length"
                        class="computation-result-display__group"
                    >
                        {{ t('computationResult.noDetails') }}
                    </p>
                </slot>
            </QTooltip>
        </button>
    </span>
</template>

<style scoped>
.computation-result-display__indicator {
    display: inline-flex;
    vertical-align: middle;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
    padding: 2px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font: inherit;
}

.computation-result-display__indicator .material-icons {
    font-size: 18px;
}

.computation-result-display__indicator--partial,
.computation-result-display__status--partial {
    color: #946200;
}

.computation-result-display__indicator--failure,
.computation-result-display__status--failure {
    color: #c1001a;
}

.computation-result-display__status {
    margin-left: 4px;
    font-size: 0.85em;
    font-weight: normal;
}

.computation-result-display__indicator:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}

:global(.computation-result-display__tooltip) {
    pointer-events: auto !important;
    overflow: auto;
    overflow-wrap: anywhere;
    white-space: normal;
    font-size: 13px;
    font-weight: normal;
    line-height: 1.5;
    text-align: left;
}

.computation-result-display__explanation {
    margin: 0;
}

.computation-result-display__group {
    margin: 8px 0 0;
}

.computation-result-display__list {
    margin: 4px 0 0;
    padding-left: 18px;
}
</style>
