export default {
    // --- Common ---
    backToHome: 'Home',
    back: 'Back',
    live: 'LIVE',
    question: 'QUESTION',

    lemanLive: 'Live from Lake Geneva',
    lastMeasurement: 'Latest measurement at {time}',

    // --- 404 ---
    notFoundMessage: 'Oops, nothing here...',
    goHome: 'Back to home',

    // --- Header ---
    headerAirTemp: 'AIR',
    headerWaterTemp: 'WATER',
    headerWind: 'WIND',
    headerWave: 'WAVE',

    // --- Home page ---
    homeEyebrow: 'WELCOME',
    homeTitle: 'Lake Geneva, live, before your eyes.',
    homeSubtitle:
        'Dive to 100 metres, track plankton hour by hour, and observe the link between air and water with real-time data from the LéXPLORE scientific platform.',

    // --- Home nav cards ---
    homeLiveLabel: 'LIVE',
    homeLiveTitle: 'More LIVE data',
    homeLiveSubtitle:
        'Water temperature at all depths, location of zooplankton, and microalgae, measured live.',
    homeDiscoveryLabel: 'DISCOVERY',
    homeDiscoveryTitle: 'The last 10 days of Lake Geneva',
    homeDiscoverySubtitle: 'How the water, air, and waves have moved over the last 10 days.',
    homeGamesLabel: 'GAMES',
    homeGamesTitle: 'Become a Léxplorer',
    homeGamesSubtitle: 'The Plankton Adventure and Hot-or-Cold: two games to understand the lake.',

    // --- Live Data Picker ---
    livePickerEyebrow: '01 · LIVE',
    livePickerTitle: 'Test other live data!',
    livePickerSubtitle:
        'Choose what you want to observe in the lake. All values are currently being measured by the LéXPLORE platform.',

    // --- Live Data nav ---
    liveNavTempDepth: 'Temperature at depth',
    liveNavTempDepthShort: 'Air → 100m',
    liveNavZooDepth: 'Zooplankton depth',
    liveNavZooDepthShort: 'Day/night migration',
    liveNavAlgaeConc: 'Microalgae concentration',

    // --- Temperature Over Depth (Live) ---
    tempDepthEyebrow: '01 · LIVE - Temperature at depth',
    tempDepthTitle: 'The deeper you go, the colder the water gets.',
    tempDepthAir: 'Air',
    tempDepthLoading: 'Preparing the temperature depth plot. This may take a few seconds...',
    tempDepthQ1: 'Do you notice a temperature difference between the air and the water?',
    tempDepthQ2: 'Is it colder at 10 m or at 60 m?',

    // --- Zooplankton Depth (Live) ---
    zooDepthEyebrow: '01 · LIVE - Zooplankton depth',
    zooDepthTitle: 'It rises at night, it descends by day.',
    zooDepthSubtitle:
        'Animal plankton migrates every day, moving from the bottom to hide from fish, toward the surface at night to feed on microalgae.',
    zooDepthLoading: 'Preparing the zooplankton depth plot. This may take a few seconds...',
    zooDepthQ1: 'At what depth do you see the plankton right now?',

    // --- Algae Concentration (Live) ---
    algaeConcEyebrow: '01 · LIVE - Microalgae concentration',
    algaeConcTitle: 'Microscopic algae.',
    algaeConcSubtitle:
        'Microalgae, or phytoplankton, need sunlight to grow. They are the first link in the food chain, but when they are too numerous, the lake water turns green and cloudy.',
    algaeConcLoading: 'Preparing the microalgae concentration plot. This may take a few seconds...',
    algaeConcQ1: 'At what depth is the plankton concentration highest?',

    // --- Changes Picker ---
    changesPickerEyebrow: '02 · CHANGES',
    changesPickerTitle: 'Changes in Lake Geneva',
    changesPickerSubtitle: 'Choose what you want to observe in the lake.',

    // --- Changes nav ---
    changesNavWindTitle: 'The effect of wind on the lake',
    changesNavWindShort: 'Wind',
    changesNavWindSubtitle:
        'Discover how wind influences water movement at the surface of Lake Geneva.',
    changesNavGrowthTitle: 'Is it growing?',
    changesNavGrowthShort: 'Growth',
    changesNavGrowthSubtitle:
        'Observe how life in the lake evolves and if certain organisms are developing.',

    // --- Wind Change Page ---
    windChangeEyebrow: '02 · Discovery',
    windChangeTitle: 'The effect of wind on the lake.',
    windChangeTrackTemperature: 'Air and water temperatures (°C)',
    windChangeTrackAirTemp: 'Air',
    windChangeTrackWaterTemp: 'Water',
    windChangeTrackWindDirection: 'Wind direction',
    windChangeTrackWindSpeed: 'Wind speed (km/h)',
    windChangeTrackPrecipitation: 'Precipitation (mm/h)',
    windChangeTrackWaveHeight: 'Wave height (m)',
    windChangeQ1: 'How do gusts of wind affect the surface of the lake?',
    windChangeQ2: 'Is the air warmer or colder than the water?',

    // --- Chlorophyll Change Page ---
    chloroChangeEyebrow: '02 · Discovery',
    chloroChangeTitle: 'Light and chlorophyll in the lake.',
    chloroChangeTrackIrradiance: 'Solar energy (W/m²)',
    chloroChangeTrackTemperature: 'Air and water temperatures (°C)',
    chloroChangeTrackAirTemp: 'Air',
    chloroChangeTrackWaterTemp: 'Water',
    chloroChangeTrackChlorophyll: 'Average Chlorophyll A (0–20 m)',
    chloroChangeQ1: 'Does warmer weather lead to more algae?',

    // --- Game Picker ---
    gamePickerEyebrow: '03 · GAMES',
    gamePickerTitle: 'Games about life in Lake Geneva',
    gamePickerSubtitle:
        'Choose what you want to observe in the lake. All values are currently being measured by the LéXPLORE platform.',

    // --- Game nav ---
    gameNavPlanctonTitle: 'Plankton Adventure',
    gameNavPlanctonShort: 'Day/night migration',
    gameNavPlanctonSubtitle:
        'Follow the zooplankton as it moves up and down in the lake, hour by hour.',
    gameNavTempTitle: 'Hot or Cold?',
    gameNavTempShort: 'Lake seasons',
    gameNavTempSubtitle: '3 months of temperature by depth. Find the zone that never warms up.',

    // --- Temperature Game ---
    tempGameEyebrow: '02 · Hot or Cold?',
    tempGameTitle: "Lake Geneva's temperature by depth over the past year",
    tempGameSubtitle: 'Slide across the grid to explore.',
    tempGameProfileKicker: 'At cursor → temperature by depth',
    tempGameLoading: 'Preparing the temperature plot. This may take a few seconds...',
    tempGameQ1: 'To what depth does solar energy warm the water in Lake Geneva?',
    tempGameQ2: 'At what depth does the water always stay colder than 10°C?',

    // --- Plankton Game ---
    planctonGameEyebrow: '01 · Plankton Adventure',
    planctonGameTitle: 'Observe Zooplankton migration over the last 2 days.',
    planctonGameSubtitle: 'Observe the movement of zooplankton throughout the day.',
    planctonGameLoading: 'Preparing the plankton migration plot. This may take a few seconds...',
    planctonGameQ1: 'Do you think animal plankton likes light?',

    // --- Plots ---
    plotDepthProfileAria: 'Depth profile graph',
    plotPlanktonAria: 'Zooplankton depth',
    plotSurface: 'Surface',
    plotNoHeatmapData: 'No heatmap data available',
    plotDepthLabel: 'Depth',
    plotTemperatureLabel: 'Temperature',

    // --- PlotAppendix ---
    plotMeasuredOn: 'Measured on',
    plotLocation: 'Lake Geneva',

    // --- QrCode ---
    qrLabel: 'Find out more',

    // --- Format fallbacks ---
    na: 'N/A',

    // --- Institutions ---
    instEawag: 'Eawag',
    instUnil: 'UNIL',
    instEpfl: 'EPFL',

    // --- PlanktonAdventurePlot depth labels ---
    planktonDepthSurface: 'Surface',

    sliderInfoText: 'Move the red slider to explore the lake at different times.',
};
