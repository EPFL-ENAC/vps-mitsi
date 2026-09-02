<template>
    <q-header class="header">
        <div class="header__inner">
            <div class="header__top">
                <div class="header__logo">
                    <img src="/fondation_vps-mitsi.svg" alt="FONDATION vps-mitsi logo" />
                </div>

                <div class="header-logos">
                    <img
                        v-for="logo in logos"
                        :key="logo.name"
                        :src="logo.src"
                        :alt="logo.name"
                        class="header-logo"
                    />
                </div>
            </div>

            <q-separator dark class="header__separator" />

            <div class="header__stats">
                <PulsatingLiveDot :last-measurement-time="weatherStore.data?.timestamps.at(-1)" />

                <div class="stats">
                    <div class="stat">
                        <div class="stat__label">{{ t('headerAirTemp') }}</div>
                        <div class="stat__row">
                            <IconizedValue
                                :value="weatherStore.data?.airTemperature.at(-1)"
                                unit="°C"
                                :force-height="dialSize"
                                :fade-end-percent="50"
                            >
                                <TemperatureThermometer
                                    :value="weatherStore.data?.airTemperature.at(-1)"
                                    :size="dialSize"
                                    :min-value="-10"
                                    :max-value="30"
                                    unit="°C"
                                    :font-scale="0"
                                />
                            </IconizedValue>
                        </div>
                    </div>

                    <q-separator vertical class="stats__separator" color="white" />

                    <div class="stat">
                        <div class="stat__label">{{ t('headerWaterTemp') }}</div>
                        <div class="stat__row">
                            <IconizedValue
                                :value="lakeStore.data?.surfaceTemperature.at(-1)"
                                unit="°C"
                                :force-height="dialSize"
                                :fade-end-percent="50"
                            >
                                <TemperatureThermometer
                                    :value="lakeStore.data?.surfaceTemperature.at(-1)"
                                    :size="dialSize"
                                    :min-value="-10"
                                    :max-value="30"
                                    unit="°C"
                                    :font-scale="0"
                                />
                            </IconizedValue>
                        </div>
                    </div>

                    <q-separator vertical class="stats__separator" color="white" />

                    <div class="stat">
                        <div class="stat__label">{{ t('headerWind') }}</div>
                        <div class="stat__row">
                            <IconizedValue
                                :value="weatherStore.data?.windSpeed.at(-1)"
                                unit="km/h"
                                :fade-end-percent="40"
                            >
                                <q-icon name="air" size="7rem" class="iconized-value__icon flip" />
                            </IconizedValue>
                            <WindCompass
                                :wind-direction-deg="weatherStore.data?.windDirectionDegrees.at(-1)"
                                :wind-speed="weatherStore.data?.windSpeed.at(-1)"
                                :size="dialSize"
                            />
                            <!-- <DialValue
                                :value="weatherStore.data?.windSpeed.at(-1)"
                                :size="dialSize"
                            /> -->
                        </div>
                    </div>

                    <q-separator vertical class="stats__separator" color="white" />

                    <div class="stat">
                        <div class="stat__label">{{ t('headerWave') }}</div>

                        <!--<WaveHeightDial
                            :value="buoyStore.data?.height.at(-1)"
                            :size="dialSize"
                            :max-value="10"
                            unit="cm"
                        /> -->
                        <div class="stat__row">
                            <IconizedValue :value="buoyStore.data?.height.at(-1)" unit="cm">
                                <q-icon name="water" size="7rem" class="iconized-value__icon" />
                            </IconizedValue>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </q-header>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useWeatherStore, useLakeStore, useBuoyStore } from 'src/stores/lexplore';
import TemperatureThermometer from '../dials/TemperatureThermometer.vue';
import WindCompass from '../dials/WindCompass.vue';
import PulsatingLiveDot from '../PulsatingLiveDot.vue';
import IconizedValue from '../dials/IconizedValue.vue';

const weatherStore = useWeatherStore();
const lakeStore = useLakeStore();
const buoyStore = useBuoyStore();
const { t } = useI18n();

const logos = [
    { name: 'Eawag', src: '/logos/eawag.svg' },
    { name: 'UNIL', src: '/logos/unil.svg' },
    { name: 'UNIGE', src: '/logos/unige.svg' },
    { name: 'Carrtel', src: '/logos/carrtel.svg' },
    { name: 'EPFL', src: '/logos/epfl_blue.svg' },
];

const dialSize = 176;
</script>

<style scoped lang="scss">
.header {
    background: linear-gradient(90deg, #02181d, #05343c, #02181d);
    color: white;
}

.header__inner {
    padding: 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.header__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.header__logo {
    display: flex;
    gap: 2rem;
    align-items: center;
    color: #00c6df;
}

.header__top img {
    height: 2rem;
    width: auto;
}

.header__logo img {
    height: 3rem;
}

.header-logos {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
}

.header__brand {
    font-weight: 700;
    line-height: 1;
}

.header__subtitle {
    line-height: 1.1;
}

.header__langs {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
}

.header__separator {
    opacity: 0.25;
}

.header__stats {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2rem;
    align-items: flex-start;
}

.stats {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat__row {
    flex: 1;
    display: flex;
    gap: 2rem;
    align-items: center;
}

.stat__label {
    text-align: center;
    opacity: 0.7;
    font-size: 1.25rem;
    font-weight: 600;
}

.stats__separator {
    opacity: 0.25;
}

.flip {
    transform: scaleX(-1);
}
</style>
