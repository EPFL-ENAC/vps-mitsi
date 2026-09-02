<template>
    <div class="qr-wrap">
        <div class="qr-card">
            <img src="alplakes_qrcode.svg" alt="Alplakes" class="qr-img" />
            <!-- TODO: Replace with actual QR code -->
            <div class="qr-label text-primary">{{ t('qrLabel') }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.qr-wrap {
    display: flex;
    justify-content: center;
    padding: 120px 0 24px;
}

.qr-card {
    width: 20rem;
    border-radius: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.08) 0%,
        rgba(255, 255, 255, 0.05) 100%
    );
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.qr-img {
    width: 100%;
    aspect-ratio: 1;
}

.qr-label {
    font-size: 1.25rem;
    font-weight: 500;
}

@media (max-width: 640px) {
    .qr-wrap {
        padding-top: 72px;
    }
}
</style>
