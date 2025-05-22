let editingSpellRow = null;

function openModal() {
    document.getElementById('statsModal').style.display = 'block';


    // Set the values based off current values

    document.getElementById('inputName').value = document.getElementById('characterName').innerText;
    document.getElementById('classSelect').value = document.getElementById('displayClass').innerText;
    document.getElementById('inputDescription').value = document.getElementById('classDescription').innerText;
    document.getElementById('inputIntelligence').value = document.getElementById('intelligence').dataset.base;
    document.getElementById('inputPower').value = document.getElementById('power').dataset.base;
    document.getElementById('inputFortitude').value = document.getElementById('fortitude').dataset.base;
    document.getElementById('inputSpeed').value = document.getElementById('speed').dataset.base;
    document.getElementById('inputMagic').value = document.getElementById('magic').dataset.base;
    document.getElementById('inputAttunement').value = document.getElementById('attunement').innerText;

    toggleAttunement();
}

function closeModal() {
    document.getElementById('statsModal').style.display = 'none';
}

document.addEventListener("DOMContentLoaded", () => {
    const modifiers = document.querySelectorAll(".modifier");

    modifiers.forEach(input => {
        input.addEventListener("input", () => updateStat(input));
    });

    const skillModifiers = document.querySelectorAll(".skill-modifier");

    skillModifiers.forEach(input => {
        input.addEventListener("input", () => updateSkill(input));
    });
});

// Generic stat update function
function updateStat(input) {
    const statId = input.id.replace("-mod", "");
    const statElem = document.getElementById(statId);
    const base = parseInt(statElem.dataset.base, 10);
    const mod = parseInt(input.value, 10) || 0;
    statElem.textContent = base + mod;

    // Update skills, temp HP, and temp mana
    refreshSkills();
    updateTempHP();
    updateTempMana();
}

function updateTempHP() {
    const fortMod = parseInt(document.getElementById('fortitude-mod').value) || 0;

    const tempHP = fortMod > 0 ? fortMod * 5 : 0;
    document.getElementById('tempHP').innerText = tempHP;
    const tempHPContainer = document.getElementById('tempHPContainer');
    tempHPContainer.style.display = tempHP > 0 ? 'inline' : 'none';
}

function updateTempMana() {
    const magicMod = parseInt(document.getElementById('magic-mod').value) || 0;

    const tempMana = magicMod > 0 ? magicMod * 10 : 0;
    document.getElementById('tempMana').innerText = tempMana;
    const tempManaContainer = document.getElementById('tempManaContainer');
    tempManaContainer.style.display = tempMana > 0 ? 'inline' : 'none';

    updateSpellButtons();
}

function updateSkill(input) {
    const skillId = input.id.replace("-mod", "");
    const skillElem = document.getElementById(skillId);
    const base = parseInt(skillElem.dataset.base, 10);
    const mod = parseInt(input.value, 10) || 0;
    skillElem.textContent = base + mod;
}

// Reset all modifiers and restore base stat values
function resetModifiers() {
    const modifiers = document.querySelectorAll(".modifier");
    modifiers.forEach(input => {
        input.value = "";
        updateStat(input);
    });
}

function toggleAttunement() {
    const classValue = document.getElementById('classSelect').value;
    const attunementInput = document.getElementById('attunementContainer');
    const attunementDisplay = document.getElementById('attunementDisplay');

    if (classValue === 'Spirit Guardian') {
        attunementInput.style.display = 'block';
        attunementDisplay.style.display = 'flex';
    } else {
        attunementInput.style.display = 'none';
        attunementDisplay.style.display = 'none';
    }
}

function validateStat(value, max) {
    const num = parseInt(value);
    return !isNaN(num) && num >= 0 && num <= max;
}

function setStatValue(statId, newBaseValue) {
    const statElem = document.getElementById(statId);
    if (!statElem) return;

    // Update base value attribute
    statElem.dataset.base = newBaseValue;

    // Check for an associated modifier input
    const modInput = document.getElementById(`${statId}-mod`);
    const modifier = modInput ? parseInt(modInput.value || "0", 10) : 0;

    // Update displayed value with base + modifier
    statElem.textContent = newBaseValue + modifier;
}

function getStatValue(statId) {
    const statElem = document.getElementById(statId);
    if (!statElem) return 0;

    return statElem.innerHTML;
}

function saveStats() {
    const stats = [{
        id: 'inputIntelligence',
        display: 'intelligence',
        max: 100
    }, {
        id: 'inputPower',
        display: 'power',
        max: 100
    }, {
        id: 'inputFortitude',
        display: 'fortitude',
        max: 100
    }, {
        id: 'inputSpeed',
        display: 'speed',
        max: 100
    }, {
        id: 'inputMagic',
        display: 'magic',
        max: 100
    }];

    for (const stat of stats) {
        const input = document.getElementById(stat.id).value;
        if (!validateStat(input, stat.max)) {
            alert(`${stat.display.charAt(0).toUpperCase() + stat.display.slice(1)} must be between 0 and ${stat.max}`);
            return;
        }
        setStatValue(stat.display, +input);
    }

    const classValue = document.getElementById('classSelect').value;
    if (classValue === 'Spirit Guardian') {
        const attunementVal = document.getElementById('inputAttunement').value;
        if (!validateStat(attunementVal, 20)) {
            alert("Attunement must be between 0 and 20");
            return;
        }
        document.getElementById('attunement').innerText = attunementVal;
    }

    // Update the character name and class + description
    document.getElementById('characterName').innerText = document.getElementById('inputName').value;
    document.getElementById('displayClass').innerText = document.getElementById('classSelect').value;
    document.getElementById('classDescription').innerText = document.getElementById('inputDescription').value;

    document.getElementById('characterDesc').innerText = document.getElementById('classSelect').value + " - " + document.getElementById('inputDescription').value;

    updateDerivedStats();

    closeModal();
}

function updateDerivedStats() {
    const fortitude = parseInt(document.getElementById('fortitude').dataset.base) || 0;
    const magic = parseInt(document.getElementById('magic').dataset.base) || 0;
    const speed = parseInt(document.getElementById('speed').dataset.base) || 0;

    const maxHP = fortitude * 5;
    const maxMana = magic * 10;
    const cunning = Math.floor(speed / 20);

    document.getElementById('maxHP').innerText = maxHP;
    document.getElementById('currentHP').innerText = maxHP;
    document.getElementById('maxMana').innerText = maxMana;
    document.getElementById('currentMana').innerText = maxMana;
    document.getElementById('cunningActions').innerText = cunning;

    // Update the values of all of my skills here too
    refreshSkills();

    // Retrigger any modifiers for skills
    const skillModifiers = document.querySelectorAll(".skill-modifier");

    skillModifiers.forEach(input => {
        updateSkill(input);
    });

    updateSpellButtons();
    updateBodyBackground();
}


function refreshSkills() {
    const intelligence = parseInt(document.getElementById('intelligence').innerText) || 0;
    const power = parseInt(document.getElementById('power').innerText) || 0;
    const fortitude = parseInt(document.getElementById('fortitude').innerText) || 0;
    const speed = parseInt(document.getElementById('speed').innerText) || 0;
    const aura = parseInt(document.getElementById('aura').innerText) || 0;

    const currentHP = parseInt(document.getElementById('currentHP').innerText) || 0;
    const maxHP = parseInt(document.getElementById('maxHP').innerText) || 1; // Avoid divide by 0
    const hpRatio = currentHP / maxHP;
    const penalty = Math.floor((1 - hpRatio) / 0.25); // -1 per 25% missing

    setStatValue('alchemy', Math.floor(intelligence / 10) - 4 - penalty);
    setStatValue('arcana', Math.floor(intelligence / 10) - 4 - penalty);
    setStatValue('curse', Math.floor(intelligence / 10) - 4 - penalty);
    setStatValue('illusion', Math.floor(intelligence / 10) - 4 - penalty);
    setStatValue('rune_crafting', Math.floor(intelligence / 10) - 4 - penalty);
    setStatValue('summoning', Math.floor(intelligence / 10) - 4 - penalty);
    setStatValue('athletics', Math.floor(power / 10) - 4 - penalty);
    setStatValue('beast_handling', Math.floor(power / 10) - 4 - penalty);
    setStatValue('constitution', Math.floor(fortitude / 10) - 4 - penalty);
    setStatValue('diplomacy', Math.floor(intelligence / 10) + aura - 4 - penalty);
    setStatValue('resolve', Math.floor(intelligence / 10) + Math.floor(fortitude / 10) - 4 - (penalty * 2));
    setStatValue('stealth', Math.floor(speed / 10) - 4 - penalty);

    setStatValue('dodge', Math.min(20, 20 - Math.floor(speed / 10) + 4 + penalty));
}


function updateSpellButtons() {
    const currentMana = parseInt(document.getElementById('currentMana').innerText) + document.getElementById('tempMana').innerText;
    const spellRows = document.querySelectorAll('#spellTableBody tr');
    spellRows.forEach(row => {
        const cost = parseInt(row.cells[2].innerText);
        const castButton = row.querySelector('.cast-button');
        if (castButton) {
            castButton.disabled = cost > currentMana;
        }
    });
}

function takeDamage() {
    let damage = parseInt(document.getElementById('damageTaken').value);
    if (isNaN(damage) || damage <= 0) return;

    // Calculate Fortitude-based damage reduction
    const fort = parseInt(document.getElementById('fortitude').getAttribute('data-base')) || 0;
    const fortMod = parseInt(document.getElementById('fortitude-mod').value) || 0;
    const totalFort = fort + fortMod;
    let damageReduction = 0;

    if (totalFort > 20) {
        damageReduction = Math.min(40, 40 * ((totalFort - 20) / 80) ** 0.6);
    }

    let reducedDamage = Math.ceil(damage * (1 - damageReduction / 100));

    let currentHP = parseInt(document.getElementById('currentHP').innerText);
    let tempHP = parseInt(document.getElementById('tempHP').innerText);

    if (tempHP > 0) {
        if (reducedDamage <= tempHP) {
            tempHP -= reducedDamage;
            reducedDamage = 0;
        } else {
            reducedDamage -= tempHP;
            tempHP = 0;
        }
        document.getElementById('tempHP').innerText = tempHP;
        if (tempHP === 0) {
            document.getElementById('tempHPContainer').style.display = 'none';
        }
    }

    currentHP = Math.max(currentHP - reducedDamage, 0);
    document.getElementById('currentHP').innerText = currentHP;
    document.getElementById('damageTaken').value = '';

    // Possibly apply any damage skill penalties
    refreshSkills();
    updateBodyBackground();
}

function updateBodyBackground() {
    const currentHP = parseInt(document.getElementById('currentHP').innerText) || 0;
    const maxHP = parseInt(document.getElementById('maxHP').innerText) || 1;

    const missingRatio = 1 - (currentHP / maxHP);
    const intensity = Math.pow(missingRatio, 2); // Sharper effect at low HP

    // From light gray (#f4f4f4) → maroon (#800000)
    const baseR = 244, baseG = 244, baseB = 244;
    const targetR = 128, targetG = 0, targetB = 0;

    const r = Math.floor(baseR + (targetR - baseR) * intensity);
    const g = Math.floor(baseG + (targetG - baseG) * intensity);
    const b = Math.floor(baseB + (targetB - baseB) * intensity);

    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

function useMana(cost) {

    if (isNaN(cost) || cost <= 0) return;

    let currentMana = parseInt(document.getElementById('currentMana').innerText);
    let tempMana = parseInt(document.getElementById('tempMana').innerText);

    if (tempMana > 0) {
        if (cost <= tempMana) {
            tempMana -= cost;
            cost = 0;
        } else {
            cost -= tempMana;
            tempMana = 0;
        }
        document.getElementById('tempMana').innerText = tempMana;
        if (tempMana === 0) {
            document.getElementById('tempManaContainer').style.display = 'none';
        }
    }

    currentMana = Math.max(currentMana - cost, 0);
    document.getElementById('currentMana').innerText = currentMana;

    updateSpellButtons();
}

function useCunningAction() {
    let ca = parseInt(document.getElementById('cunningActions').innerText);
    if (ca > 0) document.getElementById('cunningActions').innerText = ca - 1;
}

function rest() {
    const duration = +document.getElementById('restDuration').value;
    if (isNaN(duration) || duration <= 0) {
        alert("Please enter a valid rest duration (in hours).");
        return;
    }

    const maxHP = parseInt(document.getElementById('maxHP').innerText);
    const currentHP = parseInt(document.getElementById('currentHP').innerText);
    const maxMana = parseInt(document.getElementById('maxMana').innerText);
    const currentMana = parseInt(document.getElementById('currentMana').innerText);

    const fortitude = getStatValue('fortitude');
    const magicReserves = getStatValue('magic');

    // Calculate percentage restore per hour
    const hpRegenPerHour = 5 + Math.floor(fortitude / 10); // e.g., Fortitude 20 = +2%
    const manaRegenPerHour = 5 + Math.floor(magicReserves / 10);

    const hpRestore = Math.floor((hpRegenPerHour * duration / 100) * maxHP);
    const manaRestore = Math.floor((manaRegenPerHour * duration / 100) * maxMana);

    const newHP = Math.min(maxHP, currentHP + hpRestore);
    const newMana = Math.min(maxMana, currentMana + manaRestore);

    document.getElementById('currentHP').innerText = newHP;
    document.getElementById('currentMana').innerText = newMana;

    // Clear the input
    document.getElementById('restDuration').value = "";

    resetModifiers();
    refreshSkills();
    updateBodyBackground();
}

function longRest() {
    document.getElementById('currentHP').innerText = document.getElementById('maxHP').innerText;
    document.getElementById('currentMana').innerText = document.getElementById('maxMana').innerText;

    resetModifiers();
    updateDerivedStats();

    // Reset powers
    powers.forEach(power => {
        power.remainingUses = power.maxUses;
    });
    renderPowers();
}

function restoreHP(amount) {
    const current = document.getElementById('currentHP');
    const max = parseInt(document.getElementById('maxHP').innerText);
    let newHP = parseInt(current.innerText) + amount;
    current.innerText = Math.min(newHP, max);
    
    refreshSkills();
    updateBodyBackground();
  }
  
  function restoreMana(amount) {
    const current = document.getElementById('currentMana');
    const max = parseInt(document.getElementById('maxMana').innerText);
    let newMana = parseInt(current.innerText) + amount;
    current.innerText = Math.min(newMana, max);

    updateSpellButtons();
  }

function auraLoss() {
    document.getElementById('aura').innerText = +document.getElementById('aura').innerText - 1;
    refreshSkills();
}

function auraFarm() {
    document.getElementById('aura').innerText = +document.getElementById('aura').innerText + 1;
    refreshSkills();
}

function handleImageUpload() {
    const input = document.getElementById('imageUpload');
    const image = document.getElementById('characterImage');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            image.onload = function () {
                image.style.display = 'block';

                const maxWidth = 800;
                const scaleFactor = Math.min(1, maxWidth / image.naturalWidth);

                image.width = image.naturalWidth * scaleFactor;
                image.height = image.naturalHeight * scaleFactor;
            };

            image.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }
}

function openSpellModal() {

    if (!editingSpellRow) {
        document.getElementById('spellForm').reset();
    }

    document.getElementById('spellModal').style.display = 'block';
}

function closeSpellModal() {
    editingSpellRow = null;
    document.getElementById('spellModal').style.display = 'none';
}

function saveSpell() {
    const name = document.getElementById('spellName').value;
    const effect = document.getElementById('spellEffect').value;
    const cost = document.getElementById('spellCost').value;
    const castTimeDuration = document.getElementById('spellCastTimeDuration').value;
    const range = document.getElementById('spellRange').value;
    const damage = document.getElementById('spellDamage').value;

    if (editingSpellRow) {
        const cells = editingSpellRow.getElementsByTagName('td');
        cells[0].innerText = name;
        cells[1].innerText = effect;
        cells[2].innerText = cost;
        cells[3].innerText = castTimeDuration;
        cells[4].innerText = range;
        cells[5].innerText = damage;
        editingSpellRow = null;
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
    <td>${name}</td>
    <td>${effect}</td>
    <td>${cost}</td>
    <td>${castTimeDuration}</td>
    <td>${range}</td>
    <td>${damage}</td>
      <td>
        <button onclick="castSpell(this)" class="cast-button">Cast</button>
        <button onclick="editSpell(this)">Edit</button>
        <button class="delete-button" onclick="deleteSpell(this)">Delete</button>
      </td>
    `;
        document.getElementById('spellTableBody').appendChild(row);
    }

    updateSpellButtons();

    closeSpellModal();
}

function editSpell(button) {
    const row = button.parentElement.parentElement;
    const cells = row.getElementsByTagName('td');

    document.getElementById('spellName').value = cells[0].innerText;
    document.getElementById('spellEffect').value = cells[1].innerText;
    document.getElementById('spellCost').value = cells[2].innerText;
    document.getElementById('spellCastTimeDuration').value = cells[3].innerText;
    document.getElementById('spellRange').value = cells[4].innerText;
    document.getElementById('spellDamage').value = cells[5].innerText;

    editingSpellRow = row;
    openSpellModal();
}

function castSpell(button) {
    const row = button.parentElement.parentElement;
    const cells = row.getElementsByTagName('td');

    let cost = cells[2].innerText;
    useMana(cost)
}

function deleteSpell(button) {
    const row = button.parentElement.parentElement;
    row.remove();
}

function addInventoryItem() {
    const tbody = document.getElementById("inventoryBody");

    const tr = document.createElement("tr");

    const descTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Item description";
    descTd.appendChild(input);

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = () => tr.remove();
    actionTd.appendChild(delBtn);

    tr.appendChild(descTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
}

let potions = []; // Stores potions as objects

function openPotionModal() {
  document.getElementById('potionModal').style.display = 'block';
  renderPotions();
}

function closePotionModal() {
  document.getElementById('potionModal').style.display = 'none';
}

function addPotion() {
  potions.push({ type: 'HP', amount: 10 });
  renderPotions();
}

function renderPotions() {
  const tbody = document.getElementById('potionTableBody');
  tbody.innerHTML = '';
  potions.forEach((potion, index) => {
    const row = document.createElement('tr');

    // Type
    const typeCell = document.createElement('td');
    const typeSelect = document.createElement('select');
    ['HP', 'Mana'].forEach(optionVal => {
      const option = document.createElement('option');
      option.value = optionVal;
      option.text = optionVal;
      if (potion.type === optionVal) option.selected = true;
      typeSelect.appendChild(option);
    });
    typeSelect.onchange = () => { potion.type = typeSelect.value; };
    typeCell.appendChild(typeSelect);

    // Amount
    const amountCell = document.createElement('td');
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.value = potion.amount;
    amountInput.onchange = () => { potion.amount = parseInt(amountInput.value) || 0; };
    amountCell.appendChild(amountInput);

    // Actions
    const actionCell = document.createElement('td');
    const consumeBtn = document.createElement('button');
    consumeBtn.innerText = 'Consume';
    consumeBtn.onclick = () => {
      if (potion.type === 'HP') restoreHP(potion.amount);
      else restoreMana(potion.amount);
      potions.splice(index, 1);
      renderPotions();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = 'Delete';
    deleteBtn.onclick = () => {
      potions.splice(index, 1);
      renderPotions();
    };

    actionCell.appendChild(consumeBtn);
    actionCell.appendChild(deleteBtn);

    row.appendChild(typeCell);
    row.appendChild(amountCell);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
}

let powers = []; // stores all powers

function addPower(name, description, maxUses) {
    const power = {
        name,
        description,
        maxUses,
        remainingUses: maxUses
    };
    powers.push(power);
    renderPowers();
}

function renderPowers() {
    const tbody = document.getElementById('powersTableBody');
    tbody.innerHTML = ''; // Clear

    powers.forEach((power, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${power.name}</td>
      <td>${power.description}</td>
      <td>${power.remainingUses} / ${power.maxUses}</td>
      <td>
        <button onclick="usePower(${index})" ${power.remainingUses <= 0 ? 'disabled' : ''}>Use</button>
        <button onclick="deletePower(${index})">Delete</button>
      </td>
    `;
        tbody.appendChild(row);
    });
}

function usePower(index) {
    if (powers[index].remainingUses > 0) {
        powers[index].remainingUses--;
        renderPowers();
    }
}

function deletePower(index) {
    powers.splice(index, 1);
    renderPowers();
}

function openPowerModal() {
    document.getElementById('powerForm').reset();
    document.getElementById('powerModal').style.display = 'block';
}

function closePowerModal() {
    document.getElementById('powerModal').style.display = 'none';
}

function savePower() {
    const name = document.getElementById('powerName').value.trim();
    const description = document.getElementById('powerDescription').value.trim();
    const uses = parseInt(document.getElementById('powerUses').value, 10);

    if (!name || !description || isNaN(uses) || uses < 1) {
        alert('Please fill out all fields correctly.');
        return;
    }

    addPower(name, description, uses);
    closePowerModal();
}



function saveToFile() {
    const characterData = {
        name: document.getElementById('characterName').innerText,
        class: document.getElementById('displayClass').innerText,
        description: document.getElementById('classDescription').innerText,
        stats: {
            intelligence: document.getElementById('intelligence').innerText,
            power: document.getElementById('power').innerText,
            fortitude: document.getElementById('fortitude').innerText,
            speed: document.getElementById('speed').innerText,
            magic: document.getElementById('magic').innerText,
            attunement: document.getElementById('attunement').innerText,
        },
        currentHP: document.getElementById('currentHP').innerText,
        maxHP: document.getElementById('maxHP').innerText,
        currentMana: document.getElementById('currentMana').innerText,
        maxMana: document.getElementById('maxMana').innerText,
        cunningActions: document.getElementById('cunningActions').innerText,
        spells: [],
        powers: powers,
        characterImage: document.getElementById('characterImage').src || null,
        inventory: [],
        potions: potions,
        currency: document.getElementById('currency').value || "0"
    };

    // Skill Modifiers
    characterData.skills = {};
    document.querySelectorAll('#skillsDisplay .stat-main').forEach(mainDiv => {
        const id = mainDiv.id;
        const modInput = document.getElementById(`${id}-mod`);
        const mod = modInput ? parseInt(modInput.value) || 0 : 0;

        characterData.skills[id] = {
            mod
        };
    });

    // Spells
    const spellRows = document.querySelectorAll('#spellTableBody tr');
    spellRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        characterData.spells.push({
            name: cells[0].innerText,
            effect: cells[1].innerText,
            cost: cells[2].innerText,
            castTimeDuration: cells[3].innerText,
            range: cells[4].innerText,
            damage: cells[5].innerText
        });
    });

    // Inventory
    const inventoryRows = document.querySelectorAll('#inventoryBody tr');
    inventoryRows.forEach(row => {
        const input = row.querySelector('input[type="text"]');
        if (input && input.value.trim() !== "") {
            characterData.inventory.push({
                description: input.value.trim()
            });
        }
    });

    const blob = new Blob([JSON.stringify(characterData, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = characterData.name.replace(/\s+/g, '_') + '_character.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadFromFile() {
    document.getElementById('loadFileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            loadCharacterData(data);
        } catch (err) {
            alert('Failed to load file: Invalid JSON format.');
        }
    };
    reader.readAsText(file);
}

function loadCharacterData(data) {
    document.getElementById('characterName').innerText = data.name || '';
    document.getElementById('displayClass').innerText = data.class || '';
    document.getElementById('classSelect').value = data.class || '';
    document.getElementById('classDescription').innerText = data.description || '';
    document.getElementById('characterDesc').innerText = `${data.class} - ${data.description}`;

    setStatValue('intelligence', +data.stats.intelligence);
    setStatValue('power', +data.stats.power);
    setStatValue('fortitude', +data.stats.fortitude);
    setStatValue('speed', +data.stats.speed);
    setStatValue('magic', +data.stats.magic);
    setStatValue('attunement', +data.stats.attunement);

    updateDerivedStats();

    const spellTable = document.getElementById('spellTableBody');
    spellTable.innerHTML = '';
    (data.spells || []).forEach(spell => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${spell.name}</td>
      <td>${spell.effect}</td>
      <td>${spell.cost}</td>
      <td>${spell.castTimeDuration}</td>
      <td>${spell.range}</td>
      <td>${spell.damage}</td>
      <td>
        <button onclick="castSpell(this)" class="cast-button">Cast</button>
        <button onclick="editSpell(this)">Edit</button>
        <button class="delete-button" onclick="deleteSpell(this)">Delete</button>
      </td>
    `;
        spellTable.appendChild(row);
    });

    powers = data.powers;
    potions = data.potions || [];

    if (data.characterImage) {
        const image = document.getElementById('characterImage');
        image.src = data.characterImage;
        image.style.display = 'block';
    }

    // Currency
    document.getElementById('currency').value = +data.currency || 0;

    // Inventory
    // Inventory
    const inventoryBody = document.getElementById('inventoryBody');
    inventoryBody.innerHTML = '';
    (data.inventory || []).forEach(item => {
        const tr = document.createElement('tr');

        const descTd = document.createElement('td');
        const input = document.createElement('input');
        input.type = "text";
        input.value = item.description || '';
        input.placeholder = "Item description";
        descTd.appendChild(input);

        const actionTd = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.textContent = "Delete";
        delBtn.onclick = () => tr.remove();
        actionTd.appendChild(delBtn);

        tr.appendChild(descTd);
        tr.appendChild(actionTd);
        inventoryBody.appendChild(tr);
    });

    // Skill Modifiers
    if (data.skills) {
        Object.entries(data.skills).forEach(([id, values]) => {
            const modInput = document.getElementById(`${id}-mod`);

            if (modInput) {
                modInput.value = values.mod ?? 0;
                updateSkill(modInput);
            }
        })
    }

    renderPowers();
    updateSpellButtons();
    toggleAttunement();
}

function showTab(containerId) {
    // Hide all content blocks
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active-tab');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected content
    document.getElementById(containerId).classList.add('active-tab');

    // Highlight the correct button
    const tabIndex = ['spellsContainer', 'powersContainer', 'inventoryContainer'].indexOf(containerId);
    if (tabIndex !== -1) {
        document.querySelectorAll('.tab-button')[tabIndex].classList.add('active');
    }
}