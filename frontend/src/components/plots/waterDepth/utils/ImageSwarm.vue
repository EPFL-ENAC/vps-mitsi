<template>
    <div
        class="image-swarm"
        :style="{
            width: `${props.spreadX}px`,
            height: `${props.spreadY}px`,
        }"
    >
        <div
            v-for="item in swarmPoints"
            :key="item.id"
            class="image-swarm__item"
            :style="{
                left: '50%',
                top: '50%',
                width: `${item.size}px`,
                height: `${item.size}px`,
                opacity: item.opacity,
                '--swarm-x': `${item.x}px`,
                '--swarm-y': `${item.y}px`,
                '--swarm-scale': item.scale,
                '--swarm-rotation': `${item.rotation}deg`,
                '--drift-x': `${item.driftX}px`,
                '--drift-y': `${item.driftY}px`,
                '--drift-rotation': `${item.driftRotation}deg`,
                '--drift-duration': `${item.duration}s`,
                '--drift-delay': `${item.delay}s`,
            }"
        >
            <img :src="src" :alt="alt" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { randomBetween, randomGaussian } from 'src/utils/math';
import { computed } from 'vue';

type DistributionMode = 'gaussian' | 'ellipse';

type BaseSwarmPoint = {
    id: number;
    nx: number;
    ny: number;
    size: number;
    scale: number;
    rotation: number;
    opacity: number;
    driftX: number;
    driftY: number;
    driftRotation: number;
    duration: number;
    delay: number;
};

type SwarmPoint = BaseSwarmPoint & {
    x: number;
    y: number;
};

const props = withDefaults(
    defineProps<{
        src: string;
        alt?: string;
        count?: number;
        spreadX?: number;
        spreadY?: number;
        distribution?: DistributionMode;
        minSize?: number;
        maxSize?: number;
        minOpacity?: number;
        maxOpacity?: number;
        rotationRange?: number;
        minDriftX?: number;
        maxDriftX?: number;
        minDriftY?: number;
        maxDriftY?: number;
        minDriftRotation?: number;
        maxDriftRotation?: number;
        minDuration?: number;
        maxDuration?: number;
    }>(),
    {
        alt: '',
        count: 5,
        spreadX: 60,
        spreadY: 60,
        distribution: 'gaussian',
        minSize: 28,
        maxSize: 48,
        minOpacity: 0.55,
        maxOpacity: 1,
        rotationRange: 40,
        minDriftX: 4,
        maxDriftX: 14,
        minDriftY: 6,
        maxDriftY: 18,
        minDriftRotation: 2,
        maxDriftRotation: 8,
        minDuration: 10,
        maxDuration: 20,
    },
);

function createBaseAnimatedPoint(index: number, nx: number, ny: number): BaseSwarmPoint {
    const size = randomBetween(props.minSize, props.maxSize);
    const scale = randomBetween(0.85, 1.15);
    const rotation = randomBetween(-props.rotationRange / 2, props.rotationRange / 2);
    const opacity = randomBetween(props.minOpacity, props.maxOpacity);

    const driftX = randomBetween(props.minDriftX, props.maxDriftX) * (Math.random() > 0.5 ? 1 : -1);
    const driftY = randomBetween(props.minDriftY, props.maxDriftY) * (Math.random() > 0.5 ? 1 : -1);
    const driftRotation =
        randomBetween(props.minDriftRotation, props.maxDriftRotation) *
        (Math.random() > 0.5 ? 1 : -1);

    const duration = randomBetween(props.minDuration, props.maxDuration);
    const delay = -randomBetween(0, duration);

    return {
        id: index,
        nx,
        ny,
        size,
        scale,
        rotation,
        opacity,
        driftX,
        driftY,
        driftRotation,
        duration,
        delay,
    };
}

function createBaseGaussianPoint(index: number): BaseSwarmPoint {
    const nx = randomGaussian(0, 1);
    const ny = randomGaussian(0, 1);

    return createBaseAnimatedPoint(index, nx, ny);
}

function createBaseEllipsePoint(index: number): BaseSwarmPoint {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());

    const nx = Math.cos(angle) * radius;
    const ny = Math.sin(angle) * radius;

    return createBaseAnimatedPoint(index, nx, ny);
}

function generateBasePoints(distribution: DistributionMode, count: number): BaseSwarmPoint[] {
    return Array.from({ length: count }, (_, index) => {
        if (distribution === 'ellipse') {
            return createBaseEllipsePoint(index);
        }

        return createBaseGaussianPoint(index);
    });
}

const basePoints = computed(() => generateBasePoints(props.distribution, props.count));

const swarmPoints = computed<SwarmPoint[]>(() => {
    return basePoints.value.map((point) => ({
        ...point,
        x: point.nx * props.spreadX,
        y: point.ny * props.spreadY,
    }));
});
</script>

<style scoped>
.image-swarm {
    position: absolute;
    pointer-events: none;
    overflow: visible;
}

.image-swarm__item {
    position: absolute;
    transform-origin: center;
    filter: drop-shadow(0 0 4px rgb(255 255 255 / 20%));
    animation-name: image-swarm-drift;
    animation-duration: var(--drift-duration);
    animation-delay: var(--drift-delay);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    will-change: transform;
}

.image-swarm__item img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

@keyframes image-swarm-drift {
    0% {
        transform: translate(-50%, -50%) translate(var(--swarm-x), var(--swarm-y))
            rotate(calc(var(--swarm-rotation) - var(--drift-rotation))) scale(var(--swarm-scale))
            translate(0, 0);
    }

    25% {
        transform: translate(-50%, -50%) translate(var(--swarm-x), var(--swarm-y))
            rotate(calc(var(--swarm-rotation) - 0.5 * var(--drift-rotation)))
            scale(var(--swarm-scale))
            translate(calc(0.6 * var(--drift-x)), calc(-0.35 * var(--drift-y)));
    }

    50% {
        transform: translate(-50%, -50%) translate(var(--swarm-x), var(--swarm-y))
            rotate(calc(var(--swarm-rotation) + var(--drift-rotation))) scale(var(--swarm-scale))
            translate(var(--drift-x), calc(-1 * var(--drift-y)));
    }

    75% {
        transform: translate(-50%, -50%) translate(var(--swarm-x), var(--swarm-y))
            rotate(calc(var(--swarm-rotation) + 0.35 * var(--drift-rotation)))
            scale(var(--swarm-scale))
            translate(calc(-0.45 * var(--drift-x)), calc(-0.5 * var(--drift-y)));
    }

    100% {
        transform: translate(-50%, -50%) translate(var(--swarm-x), var(--swarm-y))
            rotate(calc(var(--swarm-rotation) - var(--drift-rotation))) scale(var(--swarm-scale))
            translate(0, 0);
    }
}
</style>
