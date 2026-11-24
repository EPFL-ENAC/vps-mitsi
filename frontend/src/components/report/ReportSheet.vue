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
    --page-margins-x: 15mm;
    --page-margins-y: 12mm;

    width: 297mm;
    min-height: 210mm;
    padding: var(--page-margins-y) var(--page-margins-x) calc(var(--page-margins-y) + 8mm);
    margin: 0 auto 30px auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    /* Never clip: wide charts/tables must stay fully visible on screen and paper. */
    overflow: visible;
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    isolation: isolate;
    background: #ffffff;
}

.report-sheet__header {
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 4mm;
    margin-bottom: 5mm;
}

.report-sheet__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
    overflow-wrap: anywhere;
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
    /* Zero page margins suppress Chromium's native headers/footers. */
    @page {
        size: A4 landscape;
        margin: 0;
    }

    /* Block layout paginates reliably; margins live as sheet padding. */
    .report-sheet {
        display: block !important;
        width: 100% !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 10mm 14mm !important;
        box-shadow: none !important;
        overflow: visible !important;

        page-break-after: always;
        break-after: page;
        page-break-inside: auto;
        break-inside: auto;

        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }

    .report-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
    }

    .report-sheet__footer {
        display: none !important;
    }

    /* Keep headings attached to their content across child components. */
    .report-sheet__header,
    .report-sheet :deep(h2),
    .report-sheet :deep(.text-subtitle1),
    .report-sheet :deep(.text-subtitle2) {
        page-break-after: avoid;
        break-after: avoid;
    }

    /* `inline-block` keeps tables and categories unbreakable in Chromium print. */
    .report-sheet :deep(.q-markup-table),
    .report-sheet :deep(.q-table__container),
    .report-sheet :deep(.results-category) {
        display: inline-block !important;
        width: 100% !important;
        overflow: visible !important;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .report-sheet :deep(.q-table__middle) {
        overflow: visible !important;
    }

    .report-sheet__content > *:last-child {
        margin-bottom: 0 !important;
    }

    .report-sheet__content :deep(tr) {
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .report-sheet__content :deep(thead) {
        display: table-header-group;
    }
}
</style>
