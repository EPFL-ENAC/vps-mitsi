import { ref } from 'vue';
import type { HardwareItem } from 'src/models/HardwareItem/schema';
import type { DatacenterDraft } from 'src/models/Datacenter/schema';

export type DialogMode = 'view' | 'edit';

// ── Hardware Dialog State ────────────────────────────────────────────────────
const hardwareDialogOpen = ref(false);
const hardwareDialogMode = ref<DialogMode>('view');
const hardwareSelectedRow = ref<HardwareItem | null>(null);

export function useHardwareDialog() {
    const open = (row: HardwareItem, mode: DialogMode = 'edit'): void => {
        hardwareSelectedRow.value = row;
        hardwareDialogMode.value = mode;
        hardwareDialogOpen.value = true;
    };

    const close = (): void => {
        hardwareDialogOpen.value = false;
        hardwareSelectedRow.value = null;
    };

    return {
        dialogOpen: hardwareDialogOpen,
        dialogMode: hardwareDialogMode,
        selectedRow: hardwareSelectedRow,
        open,
        close,
    };
}

// ── Energy Datacenter Dialog State ───────────────────────────────────────────
const energyDialogOpen = ref(false);
const energyDialogMode = ref<DialogMode>('view');
const energySelectedRow = ref<DatacenterDraft | null>(null);

export function useEnergyDialog() {
    const open = (row: DatacenterDraft, mode: DialogMode = 'edit'): void => {
        energySelectedRow.value = row;
        energyDialogMode.value = mode;
        energyDialogOpen.value = true;
    };

    const close = (): void => {
        energyDialogOpen.value = false;
        energySelectedRow.value = null;
    };

    return {
        dialogOpen: energyDialogOpen,
        dialogMode: energyDialogMode,
        selectedRow: energySelectedRow,
        open,
        close,
    };
}
