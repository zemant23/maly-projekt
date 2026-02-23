document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const mapElement = document.getElementById('game-map');
    const powerDisplay = document.getElementById('power-display');
    const moneyDisplay = document.getElementById('money-display');
    const buildMenu = document.getElementById('build-menu');
    const cancelBuildBtn = document.getElementById('cancel-build');

    // --- Universe Panel DOM Elements ---
    const openUniverseBtn = document.getElementById('open-universe-btn');
    const universePanel = document.getElementById('universe-panel');
    const closeUniverseBtn = document.getElementById('close-universe-btn');
    const universeMap = document.getElementById('universe-map');
    const universeSidebar = document.getElementById('universe-sidebar');

    // --- Game Configuration ---
    const MAP_SIZE = 20;
    const TILE_SIZE = 40;
    const BASE_BUILDINGS = {
        wind_turbine: { name: 'Větrná elektrárna', cost: 100, power: 10, validTerrain: ['grass', 'rock'], description: 'Lze stavět na trávě/skále.' },
        hydro_plant: { name: 'Vodní elektrárna', cost: 500, power: 50, validTerrain: ['water'], description: 'Lze stavět na vodě.' },
        coal_plant: { name: 'Uhelná elektrárna', cost: 1000, power: 120, validTerrain: ['mountain', 'rock'], description: 'Lze stavět na horách/skále.' },
        solar_panel: { name: 'Solární panel', cost: 80, power: 8, validTerrain: ['grass', 'rock'], description: 'Lze stavět na trávě/skále.' },
        geothermal_plant: { name: 'Geotermální el.', cost: 2500, power: 250, validTerrain: ['mountain'], description: 'Lze stavět na horách.' },
        nuclear_plant: { name: 'Jaderná elektrárna', cost: 10000, power: 1000, validTerrain: ['grass'], requiresWater: true, description: 'Musí sousedit s vodou.' }
    };

    const INITIAL_UNIVERSE = {
        'sol': {
            id: 'sol', name: 'Sol', starType: 'sun-g', discovered: true, gridX: 2, gridY: 5,
            planets: [
                { 
                    key: 'sol-0', name: 'Země', type: 'terran', theme: 'earth', mapGrid: [], 
                    resources: ['Voda', 'Železo'], 
                    buildings: { 
                        wind_turbine: { name: 'Větrná elektrárna', cost: 100, power: 10, validTerrain: ['grass'], description: 'Čistá energie z větru.' },
                        hydro_plant: { name: 'Vodní elektrárna', cost: 500, power: 50, validTerrain: ['water'], description: 'Energie z proudící vody.' },
                        solar_panel: { name: 'Solární panel', cost: 80, power: 8, validTerrain: ['grass'], description: 'Energie ze slunce.' },
                        bio_reactor: { name: 'Bio-reaktor', cost: 300, power: 35, validTerrain: ['grass'], description: 'Výroba energie z biomasy.' },
                        tidal_generator: { name: 'Přílivový generátor', cost: 800, power: 70, validTerrain: ['water'], requiresLand: true, description: 'Energie z přílivu oceánů.' }
                    } 
                },
                { 
                    key: 'sol-1', name: 'Mars', type: 'rocky', theme: 'mars', mapGrid: [], 
                    resources: ['Železo', 'Křemík'], 
                    buildings: { 
                        solar_panel: { name: 'Marsovský panel', cost: 60, power: 25, validTerrain: ['rock'], description: 'Silnější slunce, méně atmosféry.' },
                        dust_turbine: { name: 'Prachová turbína', cost: 200, power: 18, validTerrain: ['rock'], description: 'Využívá marsovské prachové bouře.' },
                        regolith_reactor: { name: 'Regolitový reaktor', cost: 1500, power: 150, validTerrain: ['mountain'], description: 'Extrakce energie z marsovské půdy.' },
                        ice_miner: { name: 'Ledový důl', cost: 400, power: 40, validTerrain: ['mountain'], description: 'Těží energii z podpovrchového ledu.' }
                    } 
                }
            ]
        },
        'alpha-centauri': {
            id: 'alpha-centauri', name: 'Alpha Centauri', starType: 'sun-b', discovered: false, cost: 50000, gridX: 7, gridY: 3,
            planets: [
                { 
                    key: 'ac-0', name: 'Proxima b', type: 'rocky', theme: 'proxima', mapGrid: [], 
                    resources: ['Uhlík', 'Železo'], 
                    buildings: { 
                        radiation_collector: { name: 'Radiační kolektor', cost: 2000, power: 200, validTerrain: ['rock'], description: 'Sbírá vysokoenergetické záření.' },
                        magnetic_dynamo: { name: 'Magnetické dynamo', cost: 3500, power: 380, validTerrain: ['mountain'], description: 'Využívá silné magnetické pole.' },
                        crystal_harvester: { name: 'Krystalový sklízeč', cost: 1200, power: 120, validTerrain: ['rock'], description: 'Těží energetické krystaly.' }
                    } 
                },
                { 
                    key: 'ac-1', name: 'Proxima c', type: 'ice', theme: 'ice', mapGrid: [], 
                    resources: ['Voda', 'Metan'], 
                    buildings: { 
                        cryo_reactor: { name: 'Kryo-reaktor', cost: 1800, power: 280, validTerrain: ['ice'], description: 'Energie z teplotních rozdílů.' },
                        methane_burner: { name: 'Metanová spalovna', cost: 900, power: 95, validTerrain: ['ice'], description: 'Spaluje podpovrchový metan.' },
                        thermal_drill: { name: 'Termální vrt', cost: 2500, power: 320, validTerrain: ['mountain'], description: 'Dosahuje k teplému jádru planety.' },
                        ice_fusion: { name: 'Ledová fúze', cost: 5000, power: 600, validTerrain: ['water'], description: 'Fúzní reaktor chlazený ledem.' }
                    } 
                }
            ]
        },
        'sirius': {
            id: 'sirius', name: 'Sirius', starType: 'sun-b', discovered: false, cost: 120000, gridX: 5, gridY: 8,
            planets: [
                { 
                    key: 'sir-0', name: 'Sirius Prime', type: 'lava', theme: 'lava', mapGrid: [], 
                    resources: ['Wolfram', 'Platina'], 
                    buildings: { 
                        lava_tap: { name: 'Lávový kohoutek', cost: 4000, power: 500, validTerrain: ['rock'], description: 'Čerpá energii přímo z lávy.' },
                        plasma_extractor: { name: 'Plazmový extraktor', cost: 8000, power: 950, validTerrain: ['mountain'], description: 'Sbírá vysokoteplotní plazmu.' },
                        stellar_mirror: { name: 'Hvězdné zrcadlo', cost: 6000, power: 720, validTerrain: ['rock'], description: 'Odráží intenzivní záření Siria.' }
                    } 
                }
            ]
        },
        'tau-ceti': {
            id: 'tau-ceti', name: 'Tau Ceti', starType: 'sun-g', discovered: false, cost: 200000, gridX: 9, gridY: 6,
            planets: [
                { 
                    key: 'tc-0', name: 'Ceti Garden', type: 'jungle', theme: 'jungle', mapGrid: [], 
                    resources: ['Exotická flóra', 'Organika'], 
                    buildings: { 
                        bio_dome: { name: 'Bio-dóm', cost: 3000, power: 420, validTerrain: ['grass'], description: 'Kultivátor energetických rostlin.' },
                        photosynthesis_array: { name: 'Fotosyntetické pole', cost: 2200, power: 290, validTerrain: ['grass'], description: 'Napodobuje rostlinnou fotosyntézu.' },
                        spore_reactor: { name: 'Sporový reaktor', cost: 5500, power: 680, validTerrain: ['grass'], description: 'Fermentace exotických spor.' },
                        root_network: { name: 'Kořenová síť', cost: 4200, power: 550, validTerrain: ['grass'], description: 'Propojená síť energetických kořenů.' }
                    } 
                }
            ]
        }
    };

    // --- Game State ---
    let gameState = {};

    function setupNewGame() {
        gameState = {
            money: 1000000,
            power: 0,
            universe: JSON.parse(JSON.stringify(INITIAL_UNIVERSE)), // Deep copy to prevent mutation of initial state
            selectedSystemId: 'sol',
            currentPlanetKey: 'sol-0',
            selectedBuilding: null,
        };
        const earth = findPlanet('sol-0');
        generateMapData(earth);
        console.log("Nová hra vytvořena.");
    }

    // --- Game Logic ---

    async function saveGameState() {
        try {
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameState)
            });
        } catch (error) {
            console.error('Chyba při ukládání hry:', error);
        }
    }

    async function loadGameState() {
        try {
            const response = await fetch('/api/load');
            if (!response.ok) {
                console.log('Nenalezen žádný uložený stav.');
                return false;
            }
            const savedData = await response.json();
            if (Object.keys(savedData).length === 0) {
                console.log('Nalezen prázdný uložený stav.');
                return false;
            }
            
            gameState = savedData;
            console.log('Hra byla úspěšně načtena.');
            return true;

        } catch (error) {
            console.error('Chyba při načítání hry:', error);
            return false;
        }
    }

    function findPlanet(planetKey) {
        for (const system of Object.values(gameState.universe)) {
            const planet = system.planets.find(p => p.key === planetKey);
            if (planet) return planet;
        }
        return null;
    }

    function updateDisplays() {
        powerDisplay.textContent = gameState.power;
        moneyDisplay.textContent = Math.floor(gameState.money);
    }

    function generateMapData(planet) {
        if (!planet) return [];
        if (planet.mapGrid && planet.mapGrid.length > 0) return planet.mapGrid;

        const newGrid = [];
        for (let y = 0; y < MAP_SIZE; y++) {
            const row = [];
            for (let x = 0; x < MAP_SIZE; x++) {
                let terrain = 'grass'; // Default
                const noise = Math.random();
                if (planet.theme === 'mars') {
                    if (noise > 0.8) terrain = 'mountain';
                    else terrain = 'rock';
                } else if (planet.theme === 'ice') {
                     if (noise > 0.9) terrain = 'mountain';
                    else if (noise < 0.3) terrain = 'water';
                    else terrain = 'ice'; // Custom terrain
                } else if (planet.theme === 'proxima') {
                    if (noise > 0.85) terrain = 'mountain';
                    else terrain = 'rock';
                } else if (planet.theme === 'lava') {
                    if (noise > 0.75) terrain = 'mountain';
                    else terrain = 'rock';
                } else if (planet.theme === 'jungle') {
                    if (noise > 0.95) terrain = 'mountain';
                    else if (noise < 0.1) terrain = 'water';
                    else terrain = 'grass';
                } else { // Earth-like
                    if (noise > 0.85) terrain = 'mountain';
                    else if (noise < 0.15) terrain = 'water';
                    else terrain = 'grass';
                }
                row.push({ terrain, building: null });
            }
            newGrid.push(row);
        }
        planet.mapGrid = newGrid;
        return newGrid;
    }

    function renderMap() {
        const planet = findPlanet(gameState.currentPlanetKey);
        if (!planet || !planet.mapGrid || planet.mapGrid.length === 0) {
            console.error('Nelze vykreslit mapu: data planety nebo mřížka mapy chybí.');
            mapElement.innerHTML = '<p>Chyba načítání mapy. Zkuste obnovit stránku.</p>';
            return;
        };

        mapElement.className = 'tile-map'; // Reset classes
        mapElement.classList.add(`theme-${planet.theme}`);
        mapElement.innerHTML = '';
        mapElement.style.gridTemplateColumns = `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`;
        mapElement.style.gridTemplateRows = `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`;

        planet.mapGrid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const tile = document.createElement('div');
                tile.classList.add('tile', cell.terrain);
                tile.dataset.x = x;
                tile.dataset.y = y;

                if (cell.building) {
                    tile.innerHTML = `<svg class="building-icon"><use href="#svg-${cell.building}"></use></svg>`;
                }
                mapElement.appendChild(tile);
            });
        });
        renderBuildMenu(); // Re-render build menu for correct costs
    }

    function renderBuildMenu() {
        const planet = findPlanet(gameState.currentPlanetKey);
        if (!planet) return;
        
        buildMenu.innerHTML = `<h2>Stavět na: ${planet.name}</h2>`;
        Object.entries(planet.buildings).forEach(([id, building]) => {
            const button = document.createElement('button');
            button.classList.add('build-btn');
            button.dataset.building = id;
            button.innerHTML = `
                <div class="build-btn-icon"><svg><use href="#svg-${id}"></use></svg></div>
                <div class="build-btn-info">
                    <strong>${building.name}</strong>
                    <p>Cena: ${building.cost}$ | Výkon: ${building.power}W</p>
                    <small>${building.description}</small>
                </div>`;
            buildMenu.appendChild(button);
        });
        buildMenu.appendChild(cancelBuildBtn);
    }

    function isValidPlacement(x, y) {
        const planet = findPlanet(gameState.currentPlanetKey);
        if (!gameState.selectedBuilding || !planet) return { valid: false };

        const cell = planet.mapGrid[y][x];
        const buildingInfo = planet.buildings[gameState.selectedBuilding];
        
        if (cell.building) return { valid: false, message: 'Toto políčko je již obsazené.' };
        if (!buildingInfo.validTerrain.includes(cell.terrain)) return { valid: false, message: 'Nevhodný terén.' };
        if (buildingInfo.requiresWater && !isAdjacentToWater(x, y, planet.mapGrid)) return { valid: false, message: 'Musí sousedit s vodou.' };
        if (buildingInfo.requiresLand && !isAdjacentToLand(x, y, planet.mapGrid)) return { valid: false, message: 'Musí sousedit s pevninou.' };
        if (gameState.money < buildingInfo.cost) return { valid: false, message: 'Nemáte dostatek peněz.' };

        return { valid: true };
    }
    
    function isAdjacentToWater(x, y, grid) {
        const neighbors = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
        return neighbors.some(([ny, nx]) => grid[ny]?.[nx]?.terrain === 'water');
    }

    function isAdjacentToLand(x, y, grid) {
        const neighbors = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
        return neighbors.some(([ny, nx]) => {
            const terrain = grid[ny]?.[nx]?.terrain;
            return terrain && terrain !== 'water';
        });
    }


    function handleMapClick(event) {
        const tile = event.target.closest('.tile');
        if (!tile || !gameState.selectedBuilding) return;

        const x = parseInt(tile.dataset.x, 10);
        const y = parseInt(tile.dataset.y, 10);
        const planet = findPlanet(gameState.currentPlanetKey);
        const placementCheck = isValidPlacement(x, y);

        if (placementCheck.valid) {
            const buildingInfo = planet.buildings[gameState.selectedBuilding];
            gameState.money -= buildingInfo.cost;
            planet.mapGrid[y][x].building = gameState.selectedBuilding;
            cancelBuilding();
            calculateAndApplyResources();
            renderMap();
        } else if (placementCheck.message) {
            alert(placementCheck.message);
        }
    }

    function handleBuildMenuClick(event) {
        const button = event.target.closest('.build-btn');
        if (!button) return;
        gameState.selectedBuilding = button.dataset.building;
        document.querySelectorAll('.build-btn.selected').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
    }
    
    function cancelBuilding() {
        gameState.selectedBuilding = null;
        document.querySelectorAll('.build-btn.selected').forEach(btn => btn.classList.remove('selected'));
    }

    function calculateAndApplyResources() {
        let totalPower = 0;
        Object.values(gameState.universe).forEach(system => {
            if (system.discovered) {
                system.planets.forEach(planet => {
                    if (planet.mapGrid && planet.mapGrid.length > 0) {
                        planet.mapGrid.flat().forEach(cell => {
                            if (cell.building) {
                                totalPower += planet.buildings[cell.building].power;
                            }
                        });
                    }
                });
            }
        });
        
        gameState.power = Math.floor(totalPower);
        gameState.money += Math.floor(totalPower / 10);
        updateDisplays();
    }

    function renderUniverseMap() {
        universeMap.innerHTML = '';
        Object.values(gameState.universe).forEach(system => {
            const systemDiv = document.createElement('div');
            systemDiv.className = `star-system ${system.starType}`;
            systemDiv.classList.toggle('discovered', system.discovered);
            systemDiv.classList.toggle('undiscovered', !system.discovered);
            if (system.id === gameState.selectedSystemId) {
                systemDiv.classList.add('selected');
            }
            // Position using grid coordinates
            systemDiv.style.gridColumn = system.gridX;
            systemDiv.style.gridRow = system.gridY;
            systemDiv.addEventListener('click', () => selectStarService(system.id));
            universeMap.appendChild(systemDiv);
        });
        // Also render the sidebar for the currently selected one
        selectStarService(gameState.selectedSystemId);
    }

    function selectStarService(systemId) {
        const systemData = Object.values(gameState.universe).find(s => s.id === systemId);
        if (!systemData) return;

        gameState.selectedSystemId = systemId;
        
        // Visually update selection without full re-render
        document.querySelectorAll('.star-system.selected').forEach(s => s.classList.remove('selected'));
        // This is a bit inefficient, but fine for this scale
        const allSystems = Array.from(universeMap.children);
        for(let i = 0; i < allSystems.length; i++) {
            // We don't have a direct way to link the div to the system id, so we just have to rely on order
            const system = Object.values(gameState.universe)[i];
            if (system && system.id === systemId) {
                allSystems[i].classList.add('selected');
                break;
            }
        }

        if (!systemData.discovered) {
            universeSidebar.innerHTML = `<h3>Neznámý systém</h3><p>Cena průzkumu: ${systemData.cost}$</p><button id="discover-btn">Prozkoumat</button>`;
            document.getElementById('discover-btn').addEventListener('click', () => discoverSystem(systemId));
        } else {
            let planetsHTML = systemData.planets.map(p => `
                <li class="planet-item">
                    <h4>${p.name}</h4>
                    <p>Typ: ${p.type}</p>
                    <button class="travel-btn" data-planet-key="${p.key}">Cestovat</button>
                </li>`).join('');
            universeSidebar.innerHTML = `<h3>${systemData.name}</h3><ul class="planet-list">${planetsHTML}</ul>`;
            document.querySelectorAll('.travel-btn').forEach(btn => {
                btn.addEventListener('click', (e) => switchPlanet(e.target.dataset.planetKey));
            });
        }
    }

    function discoverSystem(systemId) {
        const system = Object.values(gameState.universe).find(s => s.id === systemId);
        if (gameState.money >= system.cost) {
            gameState.money -= system.cost;
            system.discovered = true;
            selectStarService(systemId);
        } else {
            alert("Nedostatek peněz na průzkum.");
        }
    }

    function switchPlanet(planetKey) {
        const planet = findPlanet(planetKey);
        if (!planet) return;
        
        gameState.currentPlanetKey = planetKey;
        if (!planet.mapGrid || planet.mapGrid.length === 0) {
            generateMapData(planet);
        }
        
        universePanel.classList.add('hidden');
        renderMap();
    }


    async function init() {
        // Zkontroluj přihlášení
        try {
            const meRes = await fetch('/api/me');
            if (!meRes.ok) { window.location.href = '/login'; return; }
            const meData = await meRes.json();
            const playerName = document.getElementById('player-name');
            const logoutBtn = document.getElementById('logout-btn');
            if (playerName) playerName.textContent = meData.username;
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/login';
                });
            }
        } catch (e) { window.location.href = '/login'; return; }

        const loaded = await loadGameState();
        if (!loaded) { setupNewGame(); }

        renderMap();
        updateDisplays();

        openUniverseBtn.addEventListener('click', () => {
            universePanel.classList.remove('hidden');
            renderUniverseMap();
        });
        closeUniverseBtn.addEventListener('click', () => universePanel.classList.add('hidden'));

        buildMenu.addEventListener('click', handleBuildMenuClick);
        cancelBuildBtn.addEventListener('click', cancelBuilding);
        mapElement.addEventListener('click', handleMapClick);

        setInterval(calculateAndApplyResources, 1000);
        setInterval(saveGameState, 15000);
        console.log("Hra Energy Tycoon byla spuštěna.");
    }

    init();
});