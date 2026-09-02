<template>
    <section class="questions-grid">
        <article v-for="item in props.items" :key="item.id" class="question-card">
            <h3 class="question-title">
                {{ item.title }}
            </h3>
        </article>
    </section>
</template>

<script setup lang="ts">
interface QuestionCardItem {
    id: string;
    kicker: string;
    title: string;
}

const props = withDefaults(
    defineProps<{
        items: QuestionCardItem[];
        kickerClass?: string;
    }>(),
    {
        kickerClass: 'text-primary',
    },
);
</script>

<style scoped>
.questions-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    margin-top: 7rem;
    padding-bottom: 2rem;
}

.question-card {
    min-height: 136px;
    padding: 1.5rem;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 24px;
    background: linear-gradient(90deg, rgb(255 255 255 / 8%) 0%, rgb(255 255 255 / 4%) 100%);
}

.question-kicker {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    font-weight: 800;
    text-transform: uppercase;
}

.question-title {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1.05;
}

@media (max-width: 900px) {
    .questions-grid {
        grid-template-columns: 1fr;
        margin-top: 4rem;
    }
}
</style>
