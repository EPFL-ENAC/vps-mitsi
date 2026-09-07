<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">Welcome to MITSI</div>
        <p class="q-mb-sm">
            MITSI is an open-source, LCA-based web tool to assess the carbon emissions of IT
            services. It tracks emissions in two sections:
        </p>
        <ul class="q-mb-md">
            <li><b>Operational emissions</b> — during the use phase.</li>
            <li><b>Embodied emissions</b> — manufacturing, distribution and end-of-life.</li>
        </ul>

        <p class="q-mb-sm">
            To ensure the assessment is carried out correctly, the <b>Scope of the assessment</b>
            block must be completed first. Once it is valid, the other blocks can be edited.
        </p>
        <ol>
            <li>
                <router-link to="/scope">Scope of the assessment</router-link> (mandatory — unlocks
                the other blocks)
            </li>
            <li><router-link to="/inventory">Hardware inventory</router-link></li>
            <li><router-link to="/energy">Energy consumption</router-link></li>
            <li><router-link to="/results">Results</router-link></li>
        </ol>
    </div>
</template>

<script setup lang="ts">
// Placeholder — full Welcome page is built in a later stage.
</script>
