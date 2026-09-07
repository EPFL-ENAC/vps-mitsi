import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('layouts/MainLayout.vue'),
        children: [
            {
                path: '',
                name: 'welcome',
                component: () => import('pages/WelcomePage.vue'),
            },
            {
                path: 'scope',
                name: 'scope',
                component: () => import('pages/ScopePage.vue'),
            },
            {
                path: 'inventory',
                name: 'inventory',
                component: () => import('pages/HardwareInventoryPage.vue'),
            },
            {
                path: 'energy',
                name: 'energy',
                component: () => import('pages/EnergyConsumptionPage.vue'),
            },
            {
                path: 'results',
                name: 'results',
                component: () => import('pages/ResultsPage.vue'),
            },
        ],
    },

    // Always leave this as last one,
    // but you can also remove it
    {
        path: '/:catchAll(.*)*',
        component: () => import('pages/ErrorNotFound.vue'),
    },
];

export default routes;
