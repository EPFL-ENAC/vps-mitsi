<template>
    <div class="cards-list">
        <component
            v-for="item in items"
            :key="item.id"
            :is="getLinkComponent(item)"
            v-bind="getLinkProps(item)"
            class="feature-card-link text-white"
        >
            <q-card flat bordered class="feature-card">
                <q-card-section class="feature-row">
                    <div
                        v-if="hasImageMedia(item)"
                        class="feature-media"
                        :style="{
                            '--media-width': `${mediaWidth}px`,
                            background: item.mediaBackground,
                        }"
                    >
                        <img
                            :src="item.imageSrc"
                            :alt="item.imageAlt ?? ''"
                            class="feature-media-image"
                            :class="`feature-media-image--${item.imageFit ?? 'cover'}`"
                        />
                    </div>

                    <div v-else class="feature-media" :class="item.textClass">
                        <q-icon :name="item.icon" size="64px" />
                    </div>

                    <div class="feature-content">
                        <div class="feature-kicker" :class="item.textClass">
                            <span v-if="item.id && props.showIdInKicker"> {{ item.id }} · </span>
                            <span>{{ t(item.shortLabel) }}</span>
                        </div>

                        <div class="feature-title">
                            {{ t(item.title) }}
                        </div>

                        <div v-if="item.subtitle" class="feature-subtitle text-grey-5">
                            {{ t(item.subtitle) }}
                        </div>
                    </div>

                    <div
                        class="feature-action"
                        :class="`bg-${item.actionColor ?? item.color}`"
                        aria-hidden="true"
                    >
                        <q-icon name="chevron_right" size="24px" color="black" />
                    </div>
                </q-card-section>
            </q-card>
        </component>
    </div>
</template>

<script setup lang="ts">
import type { NavMenuItem } from 'src/navigation/navMenuItem';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        items: NavMenuItem[];
        showIdInKicker?: boolean;
        mediaWidth?: number;
    }>(),
    {
        showIdInKicker: true,
        mediaWidth: 126,
    },
);

const hasImageMedia = (item: NavMenuItem) => Boolean(item.imageSrc);

const isExternalLink = (item: NavMenuItem) => {
    if (!item.href) {
        return false;
    }

    return (
        item.target === '_blank' ||
        /^(https?:)?\/\//.test(item.href) ||
        item.href.startsWith('mailto:') ||
        item.href.startsWith('tel:')
    );
};

const getLinkComponent = (item: NavMenuItem) => {
    return isExternalLink(item) ? 'a' : RouterLink;
};

const getLinkProps = (item: NavMenuItem) => {
    if (isExternalLink(item)) {
        return {
            href: item.href,
            target: item.target,
            rel: item.target === '_blank' ? 'noopener noreferrer' : undefined,
        };
    }

    return {
        to: item.href,
    };
};
</script>

<style scoped>
.cards-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.feature-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
}

.feature-card {
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgb(255 255 255 / 12%);
    background: linear-gradient(90deg, rgb(255 255 255 / 9%) 0%, rgb(255 255 255 / 6%) 100%);
    backdrop-filter: blur(10px);
    box-shadow: 0 12px 30px rgb(0 0 0 / 20%);
    transition:
        transform 0.18s ease,
        border-color 0.18s ease,
        background 0.18s ease,
        box-shadow 0.18s ease;
}

.feature-card-link:hover .feature-card {
    transform: translateY(-2px);
    border-color: rgb(255 255 255 / 20%);
    background: linear-gradient(90deg, rgb(255 255 255 / 12%) 0%, rgb(255 255 255 / 8%) 100%);
    box-shadow: 0 16px 34px rgb(0 0 0 / 26%);
}

.feature-card-link:focus-visible {
    outline: 2px solid rgb(255 255 255 / 55%);
    outline-offset: 4px;
    border-radius: 24px;
}

.feature-row {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 22px 20px 22px 24px;
}

.feature-media {
    width: 96px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
}

.feature-media-image {
    display: block;
    width: 100%;
    height: 100%;
}

.feature-media-image--cover {
    object-fit: cover;
}

.feature-media-image--contain {
    object-fit: contain;
}

.feature-content {
    flex: 1;
    min-width: 0;
}

.feature-content--with-media {
    padding: 22px 20px 22px 24px;
}

.feature-kicker {
    margin-bottom: 6px;
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.04em;
}

.feature-title {
    font-size: clamp(1.55rem, 2.8vw, 2.2rem);
    line-height: 1.1;
    font-weight: 800;
}

.feature-subtitle {
    margin-top: 6px;
    font-size: 1rem;
    line-height: 1.35;
}

.feature-action {
    width: 56px;
    height: 56px;
    min-width: 56px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    transition: transform 0.18s ease;
}

.feature-card-link:hover .feature-action {
    transform: translateX(2px);
}

@media (max-width: 640px) {
    .feature-row {
        padding: 18px 16px;
        gap: 14px;
    }

    .feature-row--with-media {
        padding: 0 16px 0 0;
        min-height: 120px;
    }

    .feature-content--with-media {
        padding: 18px 16px 18px 18px;
    }

    .feature-title {
        font-size: 1.35rem;
    }

    .feature-subtitle {
        font-size: 0.92rem;
    }

    .feature-action {
        width: 48px;
        height: 48px;
        min-width: 48px;
    }
}
</style>
