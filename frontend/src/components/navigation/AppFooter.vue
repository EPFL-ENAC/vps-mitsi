<template>
    <q-footer class="footer">
        <div class="footer__wrapper">
            <div>
                <AppNav />
            </div>
            <div class="footer__langs">
                <q-btn
                    v-for="option in languageOptions"
                    :key="option.value"
                    size="2rem"
                    flat
                    round
                    dense
                    class="footer__lang-btn"
                    :class="{ 'footer__lang-btn--active': locale === option.value }"
                    @click="locale = option.value"
                >
                    <img
                        :src="`/flags/${option.value}.svg`"
                        :alt="option.value"
                        class="footer__flag"
                    />
                </q-btn>
            </div>
        </div>
    </q-footer>
</template>

<script setup lang="ts">
import AppNav from './AppNav.vue';
import { useI18n } from 'vue-i18n';
const { locale } = useI18n();

const languageOptions = [{ value: 'fr' }, { value: 'en-GB' }, { value: 'de' }, { value: 'it' }];
</script>

<style scoped lang="scss">
.footer {
    background: linear-gradient(90deg, #02181d, #05343c, #02181d);
    color: white;
}

.footer__wrapper {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.footer__langs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    padding: 0.25rem;
}

.footer__lang-btn--active {
    background: rgba(255, 255, 255, 0.25);
}

.footer__flag {
    border-radius: 50%;
    width: 4rem;
    aspect-ratio: 1 / 1;
    object-fit: cover;
}
</style>
