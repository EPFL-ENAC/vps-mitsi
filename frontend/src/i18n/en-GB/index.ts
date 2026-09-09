export default {
    // --- Welcome page ---
    welcomeEyebrow: 'Assessment workflow · LCA of an IT service',
    welcomeTitle: 'Assess the carbon footprint of your IT service',
    welcomeGoalLabel: 'Goals and means',
    welcomeGoalText:
        'MITSI is LCA-based and keeps track of carbon emissions into two specific sections: operational emissions, where all emissions occurring during the use phase are accounted, and embodied emissions, where emissions occurring in all the other stages (manufacturing, distribution and end-of-life) are gathered. The total emissions are computed for the whole IT service lifetime and is then converted into something more accessible for end-users: the amount of emissions in relation with the use of the assessed IT service for a defined period of time (for example, 1 hour of computation on a GPU cluster).',
    welcomeLcaLabel: 'About LCA',
    welcomeLcaText:
        'Life Cycle Assessment (LCA) is the methodology used here to estimate the environmental impacts of an IT service across its whole life cycle.',
    welcomeGuideLabel: 'How to proceed',
    welcomeGuideText:
        'To ensure that the assessment is carried out correctly, the “Scope of the assessment“ block must be completed first. Once completed, the other blocks can be edited. Other than that, there are no restrictions in the application regarding the order in which data is entered. The assessment must be carried out in the following order:',
    welcomeStepScope: 'Scope of the assessment',
    welcomeStepScopeHint: '(mandatory in order to unlock the other blocks)',
    welcomeStepInventory: 'Hardware inventory',
    welcomeStepEnergy: 'Energy consumption',
    welcomeFootnote:
        'Your draft is stored only in this browser. Export a JSON file to keep a copy or transfer it to another machine.',
    // --- Main layout (header, nav rail, footer) ---
    mainMenuAriaLabel: 'Menu',
    mainTagline: 'IT service carbon impact assessment',
    mainNavWelcome: 'Welcome',
    mainNavScope: 'Scope of the assessment',
    mainNavInventory: 'Hardware inventory',
    mainNavEnergy: 'Energy consumption',
    mainNavResults: 'Results',
    mainStatusComplete: 'Complete',
    mainStatusPartial: 'In progress',
    mainStatusNotStarted: 'Not started',
    mainFooterTotal: 'Total: {value}',
    mainFooterPerFu: 'Per functional unit: {value}',
    mainFooterSavedAt: 'Saved {timeAgo}',
    mainFooterDraftSaved: 'Draft saved in this browser',
    mainFooterExportedAt: 'Exported {timeAgo}',
    mainTimeAgoJustNow: 'just now',
    mainTimeAgoMinutes: '{n} min ago',
    mainTimeAgoHours: '{n} h ago',
    mainTimeAgoDays: '{n} d ago',
    mainUnitTonnesCo2e: 'tCO₂e',
    mainUnitGramsCo2e: 'gCO₂e',
    mainNotApplicable: '—',
};
