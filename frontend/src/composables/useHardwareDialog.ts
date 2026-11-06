import { ref } from 'vue';
import type { HardwareItem } from 'src/models/HardwareItem/schema';

export type DialogMode = 'view' | 'edit';

const dialogOpen = ref(false);
const dialogMode = ref<DialogMode>('view');
const selectedRow = ref<HardwareItem | null>(null);

export function useHardwareDialog() {
    const open = (row: HardwareItem, mode: DialogMode = 'edit'): void => {
        selectedRow.value = row;
        dialogMode.value = mode;
        dialogOpen.value = true;
    };

    const close = (): void => {
        dialogOpen.value = false;
        selectedRow.value = null;
    };

    return { dialogOpen, dialogMode, selectedRow, open, close };
}
