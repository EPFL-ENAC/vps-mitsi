<template>
    <router-view />
</template>

<script setup lang="ts">
import { useMitsiStore } from 'src/stores/mitsi';

const mitsi = useMitsiStore();
mitsi.loadFromStorage();
</script>
