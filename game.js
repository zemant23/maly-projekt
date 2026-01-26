document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const mapElement = document.getElementById('game-map');
    const powerDisplay = document.getElementById('power-display');
    const moneyDisplay = document.getElementById('money-display');
    const buildMenu = document.getElementById('build-menu');
    const cancelBuildBtn = document.getElementById('cancel-build');
    const researchPointsDisplay = document.getElementById('research-points-display');

    // --- Research Panel DOM Elements ---
    const openResearchBtn = document.getElementById('open-research-btn');
    const researchPanel = document.getElementById('research-panel');
    const closeResearchBtn = document.getElementById('close-research-btn');
    const researchPointsPanelDisplay = document.getElementById('research-points-panel-display');
    const investResearchBtn = document.getElementById('invest-research-btn');
    const researchStatusText = document.querySelector('.research-status');
    const skillTreeContainer = document.getElementById('skill-tree-container');

    // --- Game Configuration ---
    const SKILLS = {
        improved_wind_turbines: {
            id: 'improved_wind_turbines',
            name: 'Vylepšené větrné turbíny',
            description: 'Zvyšuje výkon větrných elektráren o 10%.',
            cost: 3,
            effect: { type: 'building_power_boost', building: 'wind_turbine', value: 0.10 },
            unlocked: false,
            prerequisites: []
        },
        photovoltaic_innovation: {
            id: 'photovoltaic_innovation',
            name: 'Fotovoltaická inovace',
            description: 'Zvyšuje výkon solárních panelů o 15%.',
            cost: 5,
            effect: { type: 'building_power_boost', building: 'solar_panel', value: 0.15 },
            unlocked: false,
            prerequisites: ['improved_wind_turbines']
        },
        construction_subsidies: {
            id: 'construction_subsidies',
            name: 'Stavební dotace',
            description: 'Snižuje cenu všech budov o 5%.',
            cost: 4,
            effect: { type: 'building_cost_reduction', value: 0.05 },
            unlocked: false,
            prerequisites: ['improved_wind_turbines']
        },
        efficient_mining: {
            id: 'efficient_mining',
            name: 'Efektivní těžba',
            description: 'Zvyšuje výkon uhelných elektráren o 10%.',
            cost: 3,
            effect: { type: 'building_power_boost', building: 'coal_plant', value: 0.10 },
            unlocked: false,
            prerequisites: []
        }
    };

    const MAP_SIZE = 20;
    const TILE_SIZE = 40;
    const BUILDINGS = {
        wind_turbine: { name: 'Větrná elektrárna', cost: 100, power: 10, validTerrain: ['grass'], description: 'Lze stavět na trávě.' },
        hydro_plant: { name: 'Vodní elektrárna', cost: 500, power: 50, validTerrain: ['water'], description: 'Lze stavět na vodě.' },
        coal_plant: { name: 'Uhelná elektrárna', cost: 1000, power: 120, validTerrain: ['mountain'], description: 'Lze stavět na horách.' },
        solar_panel: { name: 'Solární panel', cost: 80, power: 8, validTerrain: ['grass'], description: 'Lze stavět na trávě.' },
        geothermal_plant: { name: 'Geotermální el.', cost: 2500, power: 250, validTerrain: ['mountain'], description: 'Lze stavět na horách.' },
        nuclear_plant: { name: 'Jaderná elektrárna', cost: 10000, power: 1000, validTerrain: ['grass'], requiresWater: true, description: 'Musí sousedit s vodou.' }
    };

    // --- Game State ---
    let gameState = {
        money: 1000,
        power: 0,
        researchPoints: 0,
        activeEffects: [],
        mapGrid: [],
        selectedBuilding: null,
        researching: false
    };

    // --- Game Logic ---

    function updateDisplays() {
        powerDisplay.textContent = gameState.power;
        moneyDisplay.textContent = gameState.money;
        researchPointsDisplay.textContent = gameState.researchPoints;
        researchPointsPanelDisplay.textContent = gameState.researchPoints;
    }

    function generateMapData() {
        gameState.mapGrid = [];
        for (let y = 0; y < MAP_SIZE; y++) {
            const row = [];
            for (let x = 0; x < MAP_SIZE; x++) {
                let terrain = 'grass';
                const noise = Math.random();
                if (noise > 0.85) terrain = 'mountain';
                else if (noise < 0.15) terrain = 'water';
                row.push({ terrain, building: null });
            }
            gameState.mapGrid.push(row);
        }
    }

    function renderMap() {
        mapElement.innerHTML = '';
        mapElement.style.gridTemplateColumns = `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`;
        mapElement.style.gridTemplateRows = `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`;

        gameState.mapGrid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const tile = document.createElement('div');
                tile.classList.add('tile', cell.terrain);
                tile.dataset.x = x;
                tile.dataset.y = y;

                if (cell.building) {
                    tile.innerHTML = `<svg class="building-icon"><use href="#svg-${cell.building}"></use></svg>`;
                }

                if (gameState.selectedBuilding && !isValidPlacement(x, y).valid) {
                    tile.classList.add('forbidden');
                }

                mapElement.appendChild(tile);
            });
        });
    }
    
    function renderBuildMenu() {
        const buildMenuContainer = document.getElementById('build-menu');
        const cancelButton = document.getElementById('cancel-build');
        
        // Clear existing buttons except the title and cancel button
        buildMenuContainer.innerHTML = '<h2>Stavět</h2>';
    
        Object.entries(BUILDINGS).forEach(([id, building]) => {
            const button = document.createElement('button');
            button.classList.add('build-btn');
            button.dataset.building = id;
            
            button.innerHTML = `
                <div class="build-btn-icon">
                    <svg><use href="#svg-${id}"></use></svg>
                </div>
                <div class="build-btn-info">
                    <strong>${building.name}</strong>
                    <p>Cena: ${building.cost}$ | Výkon: ${building.power}W</p>
                    <small>${building.description}</small>
                </div>
            `;
            
            buildMenuContainer.appendChild(button);
        });
    
        // Re-append the cancel button at the end
        buildMenuContainer.appendChild(cancelButton);
    }

    function isValidPlacement(x, y) {
        if (!gameState.selectedBuilding) return { valid: false, message: 'Není vybrána žádná budova.' };

        const cell = gameState.mapGrid[y][x];
        if (cell.building) return { valid: false, message: 'Toto políčko je již obsazené.' };
        
        const buildingInfo = BUILDINGS[gameState.selectedBuilding];
        if (!buildingInfo.validTerrain.includes(cell.terrain)) {
            return { valid: false, message: `Tuto budovu nelze postavit na terénu: ${cell.terrain}.` };
        }

        if (buildingInfo.requiresWater) {
            const neighbors = [
                gameState.mapGrid[y-1]?.[x],
                gameState.mapGrid[y+1]?.[x],
                gameState.mapGrid[y]?.[x-1],
                gameState.mapGrid[y]?.[x+1]
            ];
            if (!neighbors.some(n => n?.terrain === 'water')) {
                return { valid: false, message: 'Tato budova musí sousedit s vodou.' };
            }
        }
        
        let actualCost = buildingInfo.cost;
        const costReductionEffect = gameState.activeEffects.find(effect => effect.type === 'building_cost_reduction');
        if (costReductionEffect) {
            actualCost = Math.round(actualCost * (1 - costReductionEffect.value));
        }

        if (gameState.money < actualCost) {
            return { valid: false, message: 'Nemáte dostatek peněz.' };
        }

        return { valid: true, message: '' };
    }

    function handleBuildMenuClick(event) {
        const button = event.target.closest('.build-btn');
        if (!button) return;

        document.querySelectorAll('.build-btn.selected').forEach(btn => btn.classList.remove('selected'));

        const buildingType = button.dataset.building;
        gameState.selectedBuilding = buildingType;
        button.classList.add('selected');
        
        renderMap();
    }

    function handleMapClick(event) {
        const tile = event.target.closest('.tile');
        if (!tile || !gameState.selectedBuilding) return;

        const x = parseInt(tile.dataset.x, 10);
        const y = parseInt(tile.dataset.y, 10);
        
        const placementCheck = isValidPlacement(x, y);
        if (placementCheck.valid) {
            const buildingInfo = BUILDINGS[gameState.selectedBuilding];
            
            let actualCost = buildingInfo.cost;
            const costReductionEffect = gameState.activeEffects.find(effect => effect.type === 'building_cost_reduction');
            if (costReductionEffect) {
                actualCost = Math.round(actualCost * (1 - costReductionEffect.value));
            }

            gameState.money -= actualCost;
            gameState.mapGrid[y][x].building = gameState.selectedBuilding;
            
            cancelBuilding();
            
            calculateAndApplyResources();
            renderMap();
        } else {
            alert(placementCheck.message);
        }
    }
    
    function cancelBuilding() {
        gameState.selectedBuilding = null;
        document.querySelectorAll('.build-btn.selected').forEach(btn => btn.classList.remove('selected'));
        renderMap();
    }

    function renderSkillTree() {
        skillTreeContainer.innerHTML = '';
        Object.values(SKILLS).forEach(skill => {
            const skillCard = document.createElement('div');
            skillCard.classList.add('skill-card');
            skillCard.dataset.skillId = skill.id;

            let statusClass = '';
            let canUnlock = true;

            if (skill.prerequisites && skill.prerequisites.length > 0) {
                for (const prereqId of skill.prerequisites) {
                    if (!SKILLS[prereqId].unlocked) {
                        canUnlock = false;
                        break;
                    }
                }
            }

            if (skill.unlocked) {
                statusClass = 'unlocked';
            } else if (canUnlock && gameState.researchPoints >= skill.cost) {
                statusClass = 'can-unlock';
                skillCard.addEventListener('click', () => unlockSkill(skill.id));
            } else {
                statusClass = 'locked';
            }
            skillCard.classList.add(statusClass);

            skillCard.innerHTML = `
                <h4>${skill.name}</h4>
                <p>${skill.description}</p>
                <small>${skill.unlocked ? 'Odemčeno' : `Cena: ${skill.cost} RP`}</small>
            `;
            skillTreeContainer.appendChild(skillCard);
        });
    }

    function unlockSkill(skillId) {
        const skill = SKILLS[skillId];
        if (!skill || skill.unlocked || gameState.researchPoints < skill.cost) {
            alert('Nelze odemknout tuto dovednost.');
            return;
        }

        if (skill.prerequisites && skill.prerequisites.length > 0) {
            for (const prereqId of skill.prerequisites) {
                if (!SKILLS[prereqId].unlocked) {
                    alert('Nejsou splněny všechny předpoklady pro odemknutí této dovednosti.');
                    return;
                }
            }
        }

        gameState.researchPoints -= skill.cost;
        skill.unlocked = true;
        gameState.activeEffects.push(skill.effect);

        calculateAndApplyResources();
        renderSkillTree();
        updateDisplays();
    }

    function calculateAndApplyResources() {
        let totalPower = 0;
        let moneyPerSecond = 0;

        gameState.mapGrid.flat().forEach(cell => {
            if (cell.building) {
                let powerOutput = BUILDINGS[cell.building].power;
                
                gameState.activeEffects.forEach(effect => {
                    if (effect.type === 'building_power_boost' && effect.building === cell.building) {
                        powerOutput *= (1 + effect.value);
                    }
                });
                totalPower += powerOutput;
            }
        });
        
        moneyPerSecond = Math.floor(totalPower / 10);

        gameState.power = Math.floor(totalPower);
        gameState.money += moneyPerSecond;

        updateDisplays();
    }

    function init() {
        buildMenu.addEventListener('click', handleBuildMenuClick);
        cancelBuildBtn.addEventListener('click', cancelBuilding);
        mapElement.addEventListener('click', handleMapClick);

        openResearchBtn.addEventListener('click', () => {
            researchPanel.classList.remove('hidden');
            renderSkillTree();
            updateDisplays();
        });
        closeResearchBtn.addEventListener('click', () => {
            researchPanel.classList.add('hidden');
        });

        investResearchBtn.addEventListener('click', () => {
            const cost = parseInt(investResearchBtn.dataset.cost);
            const rpAward = parseInt(investResearchBtn.dataset.rp);
            const researchTime = 5000;

            if (gameState.researching || gameState.money < cost) {
                alert(gameState.researching ? 'Výzkum již probíhá!' : 'Nemáte dostatek peněz na investici do výzkumu!');
                return;
            }

            gameState.money -= cost;
            gameState.researching = true;
            researchStatusText.textContent = `Výzkum probíhá... (${researchTime / 1000}s)`;
            updateDisplays();

            setTimeout(() => {
                gameState.researchPoints += rpAward;
                gameState.researching = false;
                researchStatusText.textContent = '';
                updateDisplays();
                renderSkillTree();
            }, researchTime);
        });

        generateMapData();
        renderMap();
        renderBuildMenu(); // Render the build menu dynamically
        updateDisplays();

        setInterval(calculateAndApplyResources, 1000);

        console.log("Hra Energy Tycoon byla spuštěna.");
    }

    init();
});