import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserPreferencesStore = defineStore('userPreferences', () => {
    const colorBlind = ref(false);

    return {
        colorBlind,
    };
});
