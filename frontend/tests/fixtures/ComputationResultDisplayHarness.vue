<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import ComputationResultDisplay from '../../src/components/ComputationResultDisplay.vue';
import { ComputationResult } from '../../src/utils/computation';
import { formatKg } from '../../src/utils/format';

const error = z
    .object({ rows: z.array(z.object({ quantity: z.number().min(1) })) })
    .safeParse({ rows: [{ quantity: 0 }] }).error!;
const partial = ref<ComputationResult<number, { name: string }>>(
    ComputationResult.partial(0, [error, error], [{ name: 'Server A' }, { name: 'Server B' }]),
);
const longResult = ComputationResult.partial(
    12,
    Array.from({ length: 30 }, () => error),
);
const failure = ComputationResult.failure();
const objectResult = ComputationResult.success({ estimate: 5, unit: 'kg' });

function complete() {
    partial.value = ComputationResult.success(0);
}
</script>

<template>
    <main class="q-pa-lg">
        <h1 class="text-h5">Computation result display</h1>
        <p>Typed slots, diagnostics and keyboard interaction</p>
        <button type="button" @click="complete">Complete computation</button>
        <table class="q-mt-md">
            <tbody>
                <tr>
                    <th class="text-left q-pr-lg">Partial with named inputs</th>
                    <td class="text-right">
                        <ComputationResultDisplay :computation="partial">
                            <template #default="{ result, computation }">
                                {{ result.toFixed(2) }} kg ({{ computation.success }})
                            </template>
                            <template #ignored-input="{ input, index }">
                                {{ index + 1 }}: {{ input.name }}
                            </template>
                        </ComputationResultDisplay>
                    </td>
                </tr>
                <tr>
                    <th class="text-left q-pr-lg">Long diagnostics</th>
                    <td class="text-right">
                        <ComputationResultDisplay
                            :computation="longResult"
                            :format-value="formatKg"
                        />
                    </td>
                </tr>
                <tr>
                    <th class="text-left q-pr-lg">Missing result</th>
                    <td class="text-right"><ComputationResultDisplay :computation="failure" /></td>
                </tr>
                <tr>
                    <th class="text-left q-pr-lg">Object result</th>
                    <td class="text-right">
                        <ComputationResultDisplay :computation="objectResult">
                            <template #default="{ result }"
                                >{{ result.estimate.toFixed(2) }} {{ result.unit }}</template
                            >
                        </ComputationResultDisplay>
                    </td>
                </tr>
            </tbody>
        </table>
        <button type="button" class="q-mt-md">Next control</button>
    </main>
</template>
