<template>
    <div class="welcome q-pa-lg">
        <div class="welcome__hero">
            <div class="welcome__eyebrow">{{ $t('welcomeEyebrow') }}</div>
            <h1 class="text-h3 q-mb-sm">{{ $t('welcomeTitle') }}</h1>
        </div>

        <q-separator spaced />

        <h2 class="text-h5 q-mb-sm">{{ $t('welcomeGoalLabel') }}</h2>
        <p class="text-body1 text-grey-8 welcome__para">{{ $t('welcomeGoalText') }}</p>

        <h2 class="text-h5 q-mt-lg q-mb-sm">{{ $t('welcomeLcaLabel') }}</h2>
        <p class="text-body1 text-grey-8 welcome__para">{{ $t('welcomeLcaText') }}</p>

        <q-separator spaced />

        <h2 class="text-h5 q-mb-sm">{{ $t('welcomeGuideLabel') }}</h2>
        <p class="text-body1 text-grey-8 welcome__para">{{ $t('welcomeGuideText') }}</p>

        <ol class="welcome__steps">
            <li>
                <router-link to="/scope" class="welcome__link">
                    {{ $t('welcomeStepScope') }}
                </router-link>
                <span class="welcome__hint">{{ $t('welcomeStepScopeHint') }}</span>
            </li>
            <li>
                <router-link to="/inventory" class="welcome__link">
                    {{ $t('welcomeStepInventory') }}
                </router-link>
            </li>
            <li>
                <router-link to="/energy" class="welcome__link">
                    {{ $t('welcomeStepEnergy') }}
                </router-link>
            </li>
        </ol>

        <q-separator spaced />

        <p class="text-caption text-grey-6 welcome__para">{{ $t('welcomeFootnote') }}</p>
    </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.welcome {
    max-width: 820px;
    margin: 0 auto;
}

.welcome__hero {
    max-width: 74ch;
}

.welcome__eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #78828f;
    margin-bottom: 8px;
}

.welcome__para {
    max-width: 74ch;
}

.welcome__steps {
    margin: 0;
    padding-left: 24px;
}

.welcome__steps li {
    padding: 6px 0;
}

.welcome__link {
    color: #0072b2;
    text-decoration: none;
    font-weight: 500;
}

.welcome__link:hover {
    text-decoration: underline;
}

.welcome__hint {
    color: #78828f;
    font-size: 0.875em;
    margin-left: 6px;
}
</style>
