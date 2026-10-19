<template>
    <router-view />
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

const surveyData = useSurveyDataStore();

surveyData.loadFromStorage();
</script>
