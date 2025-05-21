let editingSpellRow = null;

function openModal() {
    document.getElementById('statsModal').style.display = 'block';


    // Set the values based off current values

    document.getElementById('inputName').value = document.getElementById('characterName').innerText;
    document.getElementById('classSelect').value = document.getElementById('displayClass').innerText;
    document.getElementById('inputDescription').value = document.getElementById('classDescription').innerText;
    document.getElementById('inputIntelligence').value = document.getElementById('intelligence').innerText;
    document.getElementById('inputPower').value = document.getElementById('power').innerText;
    document.getElementById('inputFortitude').value = document.getElementById('fortitude').innerText;
    document.getElementById('inputSpeed').value = document.getElementById('speed').innerText;
    document.getElementById('inputMagic').value = document.getElementById('magic').innerText;
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

    // I need to update max/ current HP, same with max/current mana
    //updateMaxHP();
    //updateMaxMana();
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

function saveStats() {
    const stats = [{
            id: 'inputIntelligence',
            display: 'intelligence',
            max: 100
        },
        {
            id: 'inputPower',
            display: 'power',
            max: 100
        },
        {
            id: 'inputFortitude',
            display: 'fortitude',
            max: 100
        },
        {
            id: 'inputSpeed',
            display: 'speed',
            max: 100
        },
        {
            id: 'inputMagic',
            display: 'magic',
            max: 100
        }
    ];

    for (const stat of stats) {
        const input = document.getElementById(stat.id).value;
        if (!validateStat(input, stat.max)) {
            alert(`${stat.display.charAt(0).toUpperCase() + stat.display.slice(1)} must be between 0 and ${stat.max}`);
            return;
        }
        setStatValue(stat.display, input);
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

    // Update the character name and class + description here
    document.getElementById('characterName').innerText = document.getElementById('inputName').value;
    document.getElementById('displayClass').innerText = document.getElementById('classSelect').value;
    document.getElementById('classDescription').innerText = document.getElementById('inputDescription').value;

    document.getElementById('characterDesc').innerText = document.getElementById('classSelect').value + " - " + document.getElementById('inputDescription').value;

    updateDerivedStats();

    closeModal();
}

function updateDerivedStats() {
    const intelligence = parseInt(document.getElementById('intelligence').innerText) || 0;
    const power = parseInt(document.getElementById('power').innerText) || 0;
    const fortitude = parseInt(document.getElementById('fortitude').innerText) || 0;
    const magic = parseInt(document.getElementById('magic').innerText) || 0;
    const speed = parseInt(document.getElementById('speed').innerText) || 0;

    const maxHP = fortitude * 5;
    const maxMana = magic * 10;
    const cunning = Math.floor(speed / 20);

    document.getElementById('maxHP').innerText = maxHP;
    document.getElementById('currentHP').innerText = maxHP;
    document.getElementById('maxMana').innerText = maxMana;
    document.getElementById('currentMana').innerText = maxMana;
    document.getElementById('cunningActions').innerText = cunning;

    // Update the values of all of my skills here too
    setStatValue('alchemy', Math.floor(intelligence / 10) - 4);
    setStatValue('summoning', Math.floor(intelligence / 10) - 4);
    setStatValue('illusion', Math.floor(intelligence / 10) - 4);
    setStatValue('rune_crafting', Math.floor(intelligence / 10) - 4);
    setStatValue('athletics', Math.floor(power / 10) - 4);
    setStatValue('constitution', Math.floor(fortitude / 10) - 4);
    setStatValue('dodge', Math.min(20, 20 - Math.floor(speed / 10) + 4));

    // Retrigger any modifiers for skills
    const skillModifiers = document.querySelectorAll(".skill-modifier");

    skillModifiers.forEach(input => {
        updateSkill(input);
    });

    updateSpellButtons();
}

function updateSpellButtons() {
    const currentMana = parseInt(document.getElementById('currentMana').innerText);
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
    let dmg = parseInt(document.getElementById('damageTaken').value) || 0;
    let current = parseInt(document.getElementById('currentHP').innerText);
    document.getElementById('currentHP').innerText = Math.max(0, current - dmg);
    // Clear the input
    document.getElementById('damageTaken').value = 0;
}

function useCunningAction() {
    let ca = parseInt(document.getElementById('cunningActions').innerText);
    if (ca > 0) document.getElementById('cunningActions').innerText = ca - 1;
}

function rest() {
    const note = document.getElementById('restNote').value;
    console.log('Rest note:', note);
    // Add your custom logic here
    // Restore hp and mana by a % based on rest duration and level of fort + MR
    document.getElementById('restNote').value = "";
    resetModifiers();
}

function longRest() {
    document.getElementById('currentHP').innerText = document.getElementById('maxHP').innerText;
    document.getElementById('currentMana').innerText = document.getElementById('maxMana').innerText;

    resetModifiers();
    updateDerivedStats();
}

function handleImageUpload() {
    const input = document.getElementById('imageUpload');
    const image = document.getElementById('characterImage');
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            image.src = e.target.result;
            image.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function openSpellModal(context) {

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
    const damage = document.getElementById('spellDamage').value;

    if (editingSpellRow) {
        const cells = editingSpellRow.getElementsByTagName('td');
        cells[0].innerText = name;
        cells[1].innerText = effect;
        cells[2].innerText = cost;
        cells[3].innerText = damage;
        editingSpellRow = null;
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${name}</td>
      <td>${effect}</td>
      <td>${cost}</td>
      <td>${damage}</td>
      <td>
        <button onclick="castSpell(this)" class="cast-button">Cast</button>
        <button onclick="editSpell(this)">Edit</button>
        <button class="delete-button" onclick="deleteSpell(this)">Delete</button>
      </td>
    `;
        document.getElementById('spellTableBody').appendChild(row);
    }

    closeSpellModal();
}

function editSpell(button) {
    const row = button.parentElement.parentElement;
    const cells = row.getElementsByTagName('td');

    document.getElementById('spellName').value = cells[0].innerText;
    document.getElementById('spellEffect').value = cells[1].innerText;
    document.getElementById('spellCost').value = cells[2].innerText;
    document.getElementById('spellDamage').value = cells[3].innerText;

    editingSpellRow = row;
    openSpellModal();
}

function castSpell(button) {
    const row = button.parentElement.parentElement;
    const cells = row.getElementsByTagName('td');

    let cost = cells[2].innerText;
    let currMana = document.getElementById('currentMana').innerHTML;

    document.getElementById('currentMana').innerHTML = currMana - cost;
    updateSpellButtons();
}

function deleteSpell(button) {
    const row = button.parentElement.parentElement;
    row.remove();
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
        characterImage: document.getElementById('characterImage').src || null
    };

    const spellRows = document.querySelectorAll('#spellTableBody tr');
    spellRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        characterData.spells.push({
            name: cells[0].innerText,
            effect: cells[1].innerText,
            cost: cells[2].innerText,
            damage: cells[3].innerText
        });
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
    document.getElementById('classDescription').innerText = data.description || '';
    document.getElementById('characterDesc').innerText = `${data.class} - ${data.description}`;

    setStatValue('intelligence', data.stats.intelligence);
    setStatValue('power', data.stats.power);
    setStatValue('fortitude', data.stats.fortitude);
    setStatValue('speed', data.stats.speed);
    setStatValue('magic', data.stats.magic);
    setStatValue('attunement', data.stats.attunement);

    updateDerivedStats();

    const spellTable = document.getElementById('spellTableBody');
    spellTable.innerHTML = '';
    (data.spells || []).forEach(spell => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${spell.name}</td>
      <td>${spell.effect}</td>
      <td>${spell.cost}</td>
      <td>${spell.damage}</td>
      <td>
        <button onclick="castSpell(this)" class="cast-button">Cast</button>
        <button onclick="editSpell(this)">Edit</button>
        <button class="delete-button" onclick="deleteSpell(this)">Delete</button>
      </td>
    `;
        spellTable.appendChild(row);
    });

    if (data.characterImage) {
        const image = document.getElementById('characterImage');
        image.src = data.characterImage;
        image.style.display = 'block';
    }

    updateSpellButtons();
}