<template>
    <q-layout view="hHh LpR lFf">
        <AppHeader />

        <q-drawer v-model="leftDrawerOpen" :breakpoint="0" :width="314" bordered />

        <q-page-container>
            <q-page class="leman-page text-white">
                <div class="layout-content">
                    <div class="page-shell">
                        <router-view />
                    </div>
                </div>
            </q-page>
        </q-page-container>

        <AppFooter />
    </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from 'src/components/navigation/AppHeader.vue';
import AppFooter from 'src/components/navigation/AppFooter.vue';
import { useInactivityTimer } from 'src/composables/useInactivityTimer';

const leftDrawerOpen = ref(false);
const router = useRouter();
const route = useRoute();

const { onInactivityThresholdReached } = useInactivityTimer({
    timeoutMs: 60_000,
});

onInactivityThresholdReached(() => {
    if (route.path !== '/') {
        void router.push('/');
    }
});
</script>

<style scoped lang="scss">
.leman-page {
    background:
        radial-gradient(circle at top center, rgba(0, 210, 255, 0.14), transparent 38%),
        linear-gradient(180deg, #073640 0%, #03161b 55%, #00090c 100%);

    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.layout-content {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.page-shell {
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 4rem;
    flex: 1;
}

.app-footer {
    width: 100%;
    padding: 32px 24px 40px;
}

.footer-logos {
    max-width: 1080px;
    margin: 0 auto;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
}

.footer-logo {
    height: 28px;
    width: auto;
    object-fit: contain;
    opacity: 0.9;
}

@media (max-width: 640px) {
    .page-shell {
        padding: 36px 16px 24px;
    }

    .app-footer {
        padding: 24px 16px 32px;
    }

    .footer-logos {
        gap: 20px;
        padding-top: 20px;
    }

    .footer-logo {
        height: 22px;
    }
}
</style>
