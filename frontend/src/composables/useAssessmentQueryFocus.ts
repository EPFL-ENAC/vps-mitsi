import { onMounted, watch, type ComponentPublicInstance } from 'vue';
import { useRouter } from 'vue-router';
import { z } from 'zod';

type FocusableSection = ComponentPublicInstance & {
    focusField(field: string, rowId?: string): boolean;
};

const queryValue = z.string().min(1).optional().catch(undefined);
const navigationQuerySchema = z.object({ selected: queryValue, row: queryValue });

export function useAssessmentQueryFocus(
    showRow?: (rowId: string, field?: string) => Promise<void> | undefined,
) {
    const router = useRouter();
    const { currentRoute } = router;
    const sections = new Set<FocusableSection>();

    function registerSection(instance: Element | ComponentPublicInstance | null): void {
        if (instance) sections.add(instance as FocusableSection);
    }

    function clearRowSelection(rowId: string): void {
        const route = currentRoute.value;
        if (navigationQuerySchema.parse(route.query).row !== rowId) return;

        const query = { ...route.query };
        delete query.row;
        delete query.selected;

        void router.replace({ path: route.path, query, hash: route.hash });
    }

    onMounted(() => {
        watch(
            currentRoute,
            ({ query }) => {
                const { selected, row } = navigationQuerySchema.parse(query);

                if (row && showRow) return showRow(row, selected);
                if (!selected) return;

                for (const section of sections) {
                    if (section.focusField(selected, row)) break;
                }
            },
            { immediate: true, flush: 'post' },
        );
    });

    return { registerSection, clearRowSelection };
}
