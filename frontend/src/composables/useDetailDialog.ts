import { defineStore, storeToRefs } from 'pinia';
import { ref } from 'vue';
import type { HardwareItem } from 'src/models/HardwareItem/schema';
import type { DatacenterDraft } from 'src/models/Datacenter/schema';

export type DialogMode = 'view' | 'edit';

/** Shared master-detail dialog state, one slice per detail table. */
const useDetailDialogStore = defineStore('detailDialog', () => {
    // ── Hardware Dialog State ────────────────────────────────────────────────
    const hardwareDialogOpen = ref(false);
    const hardwareDialogMode = ref<DialogMode>('view');
    const hardwareSelectedRow = ref<HardwareItem | null>(null);

    function openHardware(row: HardwareItem, mode: DialogMode = 'edit'): void {
        hardwareSelectedRow.value = row;
        hardwareDialogMode.value = mode;
        hardwareDialogOpen.value = true;
    }

    function closeHardware(): void {
        hardwareDialogOpen.value = false;
        hardwareSelectedRow.value = null;
    }

    // ── Energy Datacenter Dialog State ───────────────────────────────────────
    const energyDialogOpen = ref(false);
    const energyDialogMode = ref<DialogMode>('view');
    const energySelectedRow = ref<DatacenterDraft | null>(null);

    function openEnergy(row: DatacenterDraft, mode: DialogMode = 'edit'): void {
        energySelectedRow.value = row;
        energyDialogMode.value = mode;
        energyDialogOpen.value = true;
    }

    function closeEnergy(): void {
        energyDialogOpen.value = false;
        energySelectedRow.value = null;
    }

    return {
        hardwareDialogOpen,
        hardwareDialogMode,
        hardwareSelectedRow,
        openHardware,
        closeHardware,
        energyDialogOpen,
        energyDialogMode,
        energySelectedRow,
        openEnergy,
        closeEnergy,
    };
});

export function useHardwareDialog() {
    const store = useDetailDialogStore();
    const { hardwareDialogOpen, hardwareDialogMode, hardwareSelectedRow } = storeToRefs(store);

    return {
        dialogOpen: hardwareDialogOpen,
        dialogMode: hardwareDialogMode,
        selectedRow: hardwareSelectedRow,
        open: store.openHardware,
        close: store.closeHardware,
    };
}

export function useEnergyDialog() {
    const store = useDetailDialogStore();
    const { energyDialogOpen, energyDialogMode, energySelectedRow } = storeToRefs(store);

    return {
        dialogOpen: energyDialogOpen,
        dialogMode: energyDialogMode,
        selectedRow: energySelectedRow,
        open: store.openEnergy,
        close: store.closeEnergy,
    };
}
