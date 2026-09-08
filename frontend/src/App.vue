<template>
    <router-view />
</template>

<script setup lang="ts">
import { useMitsiStore } from 'src/stores/mitsi';

const mitsi = useMitsiStore();
mitsi.loadFromStorage();

if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).mitsi = mitsi;
}
</script>
