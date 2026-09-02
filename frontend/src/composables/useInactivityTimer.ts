import { onMounted, onUnmounted, readonly, ref, type Ref } from 'vue';

export interface UseInactivityTimerOptions {
    timeoutMs: number;
    events?: readonly string[];
    immediate?: boolean;
}

export interface UseInactivityTimerReturn {
    isIdle: Readonly<Ref<boolean>>;
    start: () => void;
    stop: () => void;
    reset: () => void;
    onInactivityThresholdReached: (callback: () => void) => void;
    onActivityResumed: (callback: () => void) => void;
}

const DEFAULT_ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'touchmove',
    'scroll',
    'wheel',
] as const;

export function useInactivityTimer(options: UseInactivityTimerOptions): UseInactivityTimerReturn {
    const activityEvents = options.events ?? DEFAULT_ACTIVITY_EVENTS;
    const immediate = options.immediate ?? true;

    const isIdle = ref(false);
    const inactivityThresholdCallbacks: Array<() => void> = [];
    const activityResumedCallbacks: Array<() => void> = [];

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isRunning = false;

    function clearInactivityTimeout() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    }

    function scheduleInactivityTimeout() {
        clearInactivityTimeout();

        timeout = setTimeout(() => {
            isIdle.value = true;
            timeout = null;
            inactivityThresholdCallbacks.forEach((callback) => callback());
        }, options.timeoutMs);
    }

    function handleActivity() {
        if (!isRunning) {
            return;
        }

        const wasIdle = isIdle.value;
        isIdle.value = false;

        if (wasIdle) {
            activityResumedCallbacks.forEach((callback) => callback());
        }

        scheduleInactivityTimeout();
    }

    function start() {
        if (isRunning || typeof window === 'undefined') {
            return;
        }

        isRunning = true;
        activityEvents.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });
        scheduleInactivityTimeout();
    }

    function stop() {
        if (!isRunning || typeof window === 'undefined') {
            return;
        }

        clearInactivityTimeout();
        activityEvents.forEach((event) => {
            window.removeEventListener(event, handleActivity);
        });
        isRunning = false;
    }

    function reset() {
        isIdle.value = false;

        if (isRunning) {
            scheduleInactivityTimeout();
        }
    }

    function onInactivityThresholdReached(callback: () => void) {
        inactivityThresholdCallbacks.push(callback);
    }

    function onActivityResumed(callback: () => void) {
        activityResumedCallbacks.push(callback);
    }

    onMounted(() => {
        if (immediate) {
            start();
        }
    });

    onUnmounted(() => {
        stop();
    });

    return {
        isIdle: readonly(isIdle),
        start,
        stop,
        reset,
        onInactivityThresholdReached,
        onActivityResumed,
    };
}
