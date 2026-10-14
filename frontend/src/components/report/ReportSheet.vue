<template>
    <section class="report-sheet">
        <header v-if="title" class="report-sheet__header">
            <h2 class="report-sheet__title">{{ title }}</h2>
        </header>

        <div class="report-sheet__content">
            <slot />
        </div>

        <footer class="report-sheet__footer" />
    </section>
</template>

<script setup lang="ts">
defineProps<{
    title?: string;
}>();
</script>

<style scoped lang="scss">
.report-sheet {
    --page-margins-x: 20mm;
    --page-margins-y: 15mm;

    width: 210mm;
    min-height: 297mm;
    padding: var(--page-margins-y) var(--page-margins-x);
    margin: 0 auto 30px auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    isolation: isolate;
    background: #ffffff;
}

.report-sheet__header {
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 8mm;
    margin-bottom: 8mm;
}

.report-sheet__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
}

.report-sheet__content {
    flex: 1 1 auto;
}

.report-sheet__footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: calc(var(--page-margins-y) * 0.5) var(--page-margins-x);
    text-align: right;
    font-size: 4mm;
    color: #757575;
}

.report-sheet__footer::after {
    counter-increment: report-page;
    content: counter(report-page);
}

@media print {
    @page {
        size: A4 portrait;
        margin: 0;
    }

    .report-sheet {
        width: 210mm !important;
        min-height: 297mm !important;
        height: auto !important;
        margin: 0 !important;
        padding: var(--page-margins-y) var(--page-margins-x) !important;
        box-shadow: none !important;
        overflow: visible !important;

        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;

        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }

    .report-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
    }
    .report-sheet > * {
        page-break-inside: avoid;
        break-inside: avoid-page;
    }
}
</style>
