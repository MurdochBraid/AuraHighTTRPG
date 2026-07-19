'use strict';

/* =========================================================================
   CHARACTER STATE MODEL
   -------------------------------------------------------------------------
   `state` is the single source of truth for the whole character sheet.
   The DOM is never read to figure out "what the character currently is" —
   it only ever displays whatever is in `state`. All game math lives in
   computeDerived(), a pure function of `state`, so it's easy to test,
   reason about, and reuse (e.g. for saving/loading, or a future stat page).

   Flow for every user action:
     1. mutate `state`
     2. commit() -> recompute derived values, re-render DOM, autosave
   ========================================================================= */

const STAT_KEYS = ['intelligence', 'power', 'fortitude', 'speed', 'magic'];

const SKILL_KEYS = [
    'alchemy', 'arcana', 'curse', 'illusion', 'rune_crafting', 'summoning',
    'athletics', 'beast_handling', 'constitution', 'diplomacy', 'dodge',
    'perception', 'resolve', 'stealth',
];

// Each skill's "auto" base, computed from effective ability scores + the
// current HP penalty. `perception` has no formula — it's purely manual,
// matching the original sheet's behavior.
const SKILL_FORMULAS = {
    alchemy: (e, p) => Math.floor(e.intelligence / 10) - 4 - p,
    arcana: (e, p) => Math.floor(e.intelligence / 10) - 4 - p,
    curse: (e, p) => Math.floor(e.intelligence / 10) - 4 - p,
    illusion: (e, p) => Math.floor(e.intelligence / 10) - 4 - p,
    rune_crafting: (e, p) => Math.floor(e.intelligence / 10) - 4 - p,
    summoning: (e, p) => Math.floor(e.intelligence / 10) - 4 - p,
    athletics: (e, p) => Math.floor(e.power / 10) - 4 - p,
    beast_handling: (e, p) => Math.floor(e.power / 10) - 4 - p,
    constitution: (e, p) => Math.floor(e.fortitude / 10) - 4 - p,
    diplomacy: (e, p, aura) => Math.floor(e.intelligence / 10) + aura - 4 - p,
    resolve: (e, p) => Math.floor(e.intelligence / 10) + Math.floor(e.fortitude / 10) - 4 - (p * 2),
    stealth: (e, p) => Math.floor(e.speed / 10) - 4 - p,
    dodge: (e, p) => Math.min(20, 20 - Math.floor(e.speed / 10) + 4 + p),
    perception: null,
};

function createDefaultState() {
    return {
        meta: {
            name: '',
            class: 'Caster',
            description: '',
            imageSrc: null,
        },
        stats: {
            intelligence: 10, power: 10, fortitude: 10, speed: 10, magic: 10,
            attunement: 0,
            aura: 0,
        },
        // Temporary combat modifiers entered next to each ability score.
        modifiers: { intelligence: 0, power: 0, fortitude: 0, speed: 0, magic: 0 },
        resources: {
            hp: { current: 60, temp: 0 },
            mana: { current: 100, temp: 0 },
            cunningActions: { current: 0 },
        },
        skillModifiers: Object.fromEntries(SKILL_KEYS.map(k => [k, 0])),
        spells: [],
        powers: [],   // { name, description, maxUses, remainingUses }
        potions: [],  // { type: 'HP'|'Mana', ingredientQuality, qualityModifier }
        inventory: [], // { description }
        currency: 0,
        lore: '',
    };
}

let state = createDefaultState();
let derived = null;

/* ---------- Derived values (pure function of state) ---------- */

function computeDerived(s) {
    const eff = {};
    STAT_KEYS.forEach(key => { eff[key] = s.stats[key] + s.modifiers[key]; });

    const maxHP = s.stats.fortitude * 5 + s.stats.power;
    const maxMana = s.stats.magic * 10;
    const cunningMax = Math.floor(s.stats.speed / 20);

    const hpRatio = maxHP > 0 ? s.resources.hp.current / maxHP : 1;
    const penalty = Math.floor((1 - hpRatio) / 0.25); // -1 per 25% HP missing

    const skillBase = {};
    SKILL_KEYS.forEach(key => {
        const formula = SKILL_FORMULAS[key];
        skillBase[key] = formula ? formula(eff, penalty, s.stats.aura) : 0;
    });

    const skillTotal = {};
    SKILL_KEYS.forEach(key => { skillTotal[key] = skillBase[key] + s.skillModifiers[key]; });

    return { eff, maxHP, maxMana, cunningMax, hpRatio, penalty, skillBase, skillTotal };
}

function recompute() {
    derived = computeDerived(state);
}

/** Every mutation ends with commit(): recompute -> render -> autosave. */
function commit() {
    recompute();
    renderAll();
    persist();
}

/* Ability-score temp modifiers refresh the temp HP/Mana pools. These pools
   are real state (not purely derived) because damage/spending can deplete
   them independently until the modifier is changed again. */
function refreshTempHP() {
    state.resources.hp.temp = state.modifiers.fortitude > 0 ? state.modifiers.fortitude * 5 : 0;
}
function refreshTempMana() {
    state.resources.mana.temp = state.modifiers.magic > 0 ? state.modifiers.magic * 10 : 0;
}

/* =========================================================================
   RENDERING — one-way data flow: state -> DOM
   ========================================================================= */

function byId(id) { return document.getElementById(id); }

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function renderAll() {
    renderMeta();
    renderStatsAndSkills();
    renderResources();
    renderSpells();
    renderPowers();
    renderPotions();
    renderInventory();
    renderMisc();
    updateBodyBackground();
    updateSpellButtons();
}

function renderMeta() {
    byId('characterName').innerText = state.meta.name;
    byId('displayClass').innerText = state.meta.class;
    byId('classDescription').innerText = state.meta.description;
    byId('characterDesc').innerText = `${state.meta.class} - ${state.meta.description}`;

    const img = byId('characterImage');
    if (state.meta.imageSrc) {
        img.src = state.meta.imageSrc;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
}

function renderStatsAndSkills() {
    STAT_KEYS.forEach(key => { byId(key).textContent = derived.eff[key]; });
    byId('attunement').innerText = state.stats.attunement;
    byId('aura').innerText = state.stats.aura;

    SKILL_KEYS.forEach(key => { byId(key).textContent = derived.skillTotal[key]; });

    const isSpiritGuardian = state.meta.class === 'Spirit Guardian';
    byId('attunementDisplay').style.display = isSpiritGuardian ? 'flex' : 'none';
}

function renderResources() {
    byId('currentHP').innerText = state.resources.hp.current;
    byId('maxHP').innerText = derived.maxHP;
    byId('tempHP').innerText = state.resources.hp.temp;
    byId('tempHPContainer').style.display = state.resources.hp.temp > 0 ? 'inline' : 'none';

    byId('currentMana').innerText = state.resources.mana.current;
    byId('maxMana').innerText = derived.maxMana;
    byId('tempMana').innerText = state.resources.mana.temp;
    byId('tempManaContainer').style.display = state.resources.mana.temp > 0 ? 'inline' : 'none';

    byId('cunningActions').innerText = state.resources.cunningActions.current;
}

function renderSpells() {
    const tbody = byId('spellTableBody');
    tbody.innerHTML = '';
    state.spells.forEach((spell, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.innerHTML = `
      <td>${escapeHtml(spell.name)}</td>
      <td>${escapeHtml(spell.effect)}</td>
      <td>${escapeHtml(spell.cost)}</td>
      <td>${escapeHtml(spell.castTimeDuration)}</td>
      <td>${escapeHtml(spell.range)}</td>
      <td>${escapeHtml(spell.damage)}</td>
      <td>
        <button onclick="castSpell(this)" class="cast-button">Cast</button>
        <button onclick="editSpell(this)">Edit</button>
        <button class="delete-button" onclick="deleteSpell(this)">Delete</button>
      </td>`;
        tbody.appendChild(row);
    });
}

function renderPowers() {
    const tbody = byId('powersTableBody');
    tbody.innerHTML = '';
    state.powers.forEach((power, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${escapeHtml(power.name)}</td>
      <td>${escapeHtml(power.description)}</td>
      <td>${power.remainingUses} / ${power.maxUses}</td>
      <td>
        <button onclick="usePower(${index})" ${power.remainingUses <= 0 ? 'disabled' : ''}>Use</button>
        <button onclick="deletePower(${index})">Delete</button>
      </td>`;
        tbody.appendChild(row);
    });
}

function renderPotions() {
    const tbody = byId('potionTableBody');
    tbody.innerHTML = '';
    state.potions.forEach((potion, index) => {
        const row = document.createElement('tr');

        const typeCell = document.createElement('td');
        const typeSelect = document.createElement('select');
        ['HP', 'Mana'].forEach(optionVal => {
            const option = document.createElement('option');
            option.value = optionVal;
            option.text = optionVal;
            if (potion.type === optionVal) option.selected = true;
            typeSelect.appendChild(option);
        });
        typeSelect.onchange = () => { potion.type = typeSelect.value; persist(); };
        typeCell.appendChild(typeSelect);

        const qualityCell = document.createElement('td');
        const qualityInput = document.createElement('input');
        qualityInput.type = 'number';
        qualityInput.placeholder = 'Quality';
        qualityInput.value = potion.ingredientQuality;
        qualityInput.onchange = () => {
            potion.ingredientQuality = parseInt(qualityInput.value, 10) || 50;
            persist();
        };

        const modifierInput = document.createElement('input');
        modifierInput.type = 'number';
        modifierInput.placeholder = 'Modifier';
        modifierInput.value = potion.qualityModifier;
        modifierInput.onchange = () => {
            potion.qualityModifier = parseInt(modifierInput.value, 10) || 10;
            persist();
        };

        qualityCell.appendChild(qualityInput);
        qualityCell.appendChild(modifierInput);

        const actionCell = document.createElement('td');
        const consumeBtn = document.createElement('button');
        consumeBtn.innerText = 'Consume';
        consumeBtn.onclick = () => {
            const q = potion.ingredientQuality || 100;
            const qm = potion.qualityModifier || 20;
            if (potion.type === 'HP') {
                restoreHP(Math.round(500 * (100 / q) * (20 / qm)));
            } else {
                restoreMana(Math.round(1000 * (100 / q) * (20 / qm)));
            }
            state.potions.splice(index, 1);
            commit();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.onclick = () => { state.potions.splice(index, 1); commit(); };

        actionCell.appendChild(consumeBtn);
        actionCell.appendChild(deleteBtn);

        row.appendChild(typeCell);
        row.appendChild(qualityCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

function renderInventory() {
    const tbody = byId('inventoryBody');
    tbody.innerHTML = '';
    state.inventory.forEach((item, index) => {
        const tr = document.createElement('tr');

        const descTd = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Item description';
        input.value = item.description;
        input.addEventListener('change', () => {
            state.inventory[index].description = input.value;
            persist();
        });
        descTd.appendChild(input);

        const actionTd = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => { state.inventory.splice(index, 1); commit(); };
        actionTd.appendChild(delBtn);

        tr.appendChild(descTd);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
    });
}

function renderMisc() {
    byId('currency').value = state.currency;
    byId('lore').value = state.lore;
}

function updateBodyBackground() {
    const missingRatio = 1 - derived.hpRatio;
    const intensity = Math.pow(Math.max(0, missingRatio), 2);
    const baseR = 30, baseG = 30, baseB = 30;
    const targetR = 128, targetG = 0, targetB = 0;
    const r = Math.floor(baseR + (targetR - baseR) * intensity);
    const g = Math.floor(baseG + (targetG - baseG) * intensity);
    const b = Math.floor(baseB + (targetB - baseB) * intensity);
    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

function updateSpellButtons() {
    const availableMana = state.resources.mana.current + state.resources.mana.temp;
    document.querySelectorAll('#spellTableBody tr').forEach(row => {
        const spell = state.spells[+row.dataset.index];
        const cost = parseInt(spell.cost, 10) || 0;
        const btn = row.querySelector('.cast-button');
        if (btn) btn.disabled = cost > availableMana;
    });
}

/* =========================================================================
   ACTIONS — mutate state, then commit()
   ========================================================================= */

function validateStat(value, max) {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && num <= max;
}
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

/* ----- Stats modal ----- */

function openModal() {
    byId('statsModal').style.display = 'block';
    byId('inputName').value = state.meta.name;
    byId('classSelect').value = state.meta.class;
    byId('inputDescription').value = state.meta.description;
    byId('inputIntelligence').value = state.stats.intelligence;
    byId('inputPower').value = state.stats.power;
    byId('inputFortitude').value = state.stats.fortitude;
    byId('inputSpeed').value = state.stats.speed;
    byId('inputMagic').value = state.stats.magic;
    byId('inputAttunement').value = state.stats.attunement;
    toggleAttunement();
}

function closeModal() {
    byId('statsModal').style.display = 'none';
}

// Live preview while the modal is open: toggling the class dropdown shows/
// hides both the modal's attunement field and the main page's attunement
// stat, before Save is pressed (matches original behavior).
function toggleAttunement() {
    const isSpiritGuardian = byId('classSelect').value === 'Spirit Guardian';
    byId('attunementContainer').style.display = isSpiritGuardian ? 'block' : 'none';
    byId('attunementDisplay').style.display = isSpiritGuardian ? 'flex' : 'none';
}

function saveStats() {
    const fields = [
        { input: 'inputIntelligence', key: 'intelligence', max: 250 },
        { input: 'inputPower', key: 'power', max: 250 },
        { input: 'inputFortitude', key: 'fortitude', max: 250 },
        { input: 'inputSpeed', key: 'speed', max: 250 },
        { input: 'inputMagic', key: 'magic', max: 250 },
    ];

    const newStats = {};
    for (const field of fields) {
        const value = byId(field.input).value;
        if (!validateStat(value, field.max)) {
            alert(`${capitalize(field.key)} must be between 0 and ${field.max}`);
            return;
        }
        newStats[field.key] = +value;
    }

    const classValue = byId('classSelect').value;
    let attunement = state.stats.attunement;
    if (classValue === 'Spirit Guardian') {
        const attunementVal = byId('inputAttunement').value;
        if (!validateStat(attunementVal, 20)) {
            alert('Attunement must be between 0 and 20');
            return;
        }
        attunement = +attunementVal;
    }

    Object.assign(state.stats, newStats);
    state.stats.attunement = attunement;
    state.meta.name = byId('inputName').value;
    state.meta.class = classValue;
    state.meta.description = byId('inputDescription').value;

    // Editing base stats fully restores HP/Mana/Cunning Actions, matching
    // the original sheet's behavior (think: leveling up).
    const fresh = computeDerived(state);
    state.resources.hp.current = fresh.maxHP;
    state.resources.mana.current = fresh.maxMana;
    state.resources.cunningActions.current = fresh.cunningMax;

    closeModal();
    commit();
}

/* ----- Ability score / skill modifiers ----- */

function resetModifiers() {
    STAT_KEYS.forEach(key => {
        state.modifiers[key] = 0;
        const input = byId(`${key}-mod`);
        if (input) input.value = '';
    });
    refreshTempHP();
    refreshTempMana();
}

function wireModifierInputs() {
    document.querySelectorAll('.modifier').forEach(input => {
        input.addEventListener('input', () => {
            const key = input.id.replace('-mod', '');
            state.modifiers[key] = parseInt(input.value, 10) || 0;
            if (key === 'fortitude') refreshTempHP();
            if (key === 'magic') refreshTempMana();
            commit();
        });
    });

    document.querySelectorAll('.skill-modifier').forEach(input => {
        input.addEventListener('input', () => {
            const key = input.id.replace('-mod', '');
            state.skillModifiers[key] = parseInt(input.value, 10) || 0;
            commit();
        });
    });
}

/* ----- HP / Mana / Cunning Actions ----- */

function restoreHP(amount) {
    state.resources.hp.current = Math.min(state.resources.hp.current + amount, derived.maxHP);
}
function restoreMana(amount) {
    state.resources.mana.current = Math.min(state.resources.mana.current + amount, derived.maxMana);
}

function takeDamage() {
    const damage = parseInt(byId('damageTaken').value, 10);
    if (isNaN(damage) || damage <= 0) return;

    const totalFort = derived.eff.fortitude;
    let damageReduction = 0;
    if (totalFort > 20) {
        damageReduction = Math.min(40, 40 * ((totalFort - 20) / 80) ** 0.6);
    }
    let reducedDamage = Math.ceil(damage * (1 - damageReduction / 100));

    if (state.resources.hp.temp > 0) {
        if (reducedDamage <= state.resources.hp.temp) {
            state.resources.hp.temp -= reducedDamage;
            reducedDamage = 0;
        } else {
            reducedDamage -= state.resources.hp.temp;
            state.resources.hp.temp = 0;
        }
    }

    state.resources.hp.current = Math.max(state.resources.hp.current - reducedDamage, 0);
    byId('damageTaken').value = '';
    commit();
}

function healButton() {
    const amount = parseInt(byId('damageTaken').value, 10) || 0;
    restoreHP(amount);
    byId('damageTaken').value = '';
    commit();
}

function useMana(rawCost) {
    let cost = parseInt(rawCost, 10);
    if (isNaN(cost) || cost <= 0) return;

    if (state.resources.mana.temp > 0) {
        if (cost <= state.resources.mana.temp) {
            state.resources.mana.temp -= cost;
            cost = 0;
        } else {
            cost -= state.resources.mana.temp;
            state.resources.mana.temp = 0;
        }
    }
    state.resources.mana.current = Math.max(state.resources.mana.current - cost, 0);
    commit();
}

function sapMana() {
    const amount = parseInt(byId('manaInput').value, 10) || 0;
    useMana(amount);
    byId('manaInput').value = '';
}

function restoreManaButton() {
    const amount = parseInt(byId('manaInput').value, 10) || 0;
    restoreMana(amount);
    byId('manaInput').value = '';
    commit();
}

function useCunningAction() {
    if (state.resources.cunningActions.current > 0) {
        state.resources.cunningActions.current -= 1;
        commit();
    }
}

function regainCunningActions() {
    state.resources.cunningActions.current = derived.cunningMax;
    commit();
}

function rest() {
    const duration = +byId('restDuration').value;
    if (isNaN(duration) || duration <= 0) {
        alert('Please enter a valid rest duration (in hours).');
        return;
    }

    const hpRegenPerHour = 5 + Math.floor(derived.eff.fortitude / 10);
    const manaRegenPerHour = 5 + Math.floor(derived.eff.magic / 10);

    const hpRestore = Math.floor((hpRegenPerHour * duration / 100) * derived.maxHP);
    const manaRestore = Math.floor((manaRegenPerHour * duration / 100) * derived.maxMana);

    state.resources.hp.current = Math.min(derived.maxHP, state.resources.hp.current + hpRestore);
    state.resources.mana.current = Math.min(derived.maxMana, state.resources.mana.current + manaRestore);

    byId('restDuration').value = '';
    resetModifiers();
    commit();
}

function longRest() {
    state.resources.hp.current = derived.maxHP;
    state.resources.mana.current = derived.maxMana;
    resetModifiers();
    state.powers.forEach(power => { power.remainingUses = power.maxUses; });
    commit();
}

/* ----- Aura ----- */

function auraLoss() { state.stats.aura -= 1; commit(); }
function auraFarm() { state.stats.aura += 1; commit(); }

/* ----- Image upload ----- */

function handleImageUpload() {
    const file = byId('imageUpload').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        const probe = new Image();
        probe.onload = () => {
            state.meta.imageSrc = e.target.result;
            commit();

            const maxWidth = 800;
            const scaleFactor = Math.min(1, maxWidth / probe.naturalWidth);
            const displayed = byId('characterImage');
            displayed.width = probe.naturalWidth * scaleFactor;
            displayed.height = probe.naturalHeight * scaleFactor;
        };
        probe.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/* ----- Spells ----- */

let editingSpellIndex = null;

function openSpellModal() {
    if (editingSpellIndex === null) byId('spellForm').reset();
    byId('spellModal').style.display = 'block';
}

function closeSpellModal() {
    editingSpellIndex = null;
    byId('spellModal').style.display = 'none';
}

function saveSpell() {
    const spell = {
        name: byId('spellName').value,
        effect: byId('spellEffect').value,
        cost: byId('spellCost').value,
        castTimeDuration: byId('spellCastTimeDuration').value,
        range: byId('spellRange').value,
        damage: byId('spellDamage').value,
    };

    if (editingSpellIndex !== null) {
        state.spells[editingSpellIndex] = spell;
        editingSpellIndex = null;
    } else {
        state.spells.push(spell);
    }

    closeSpellModal();
    commit();
}

function editSpell(button) {
    const index = +button.closest('tr').dataset.index;
    const spell = state.spells[index];

    byId('spellName').value = spell.name;
    byId('spellEffect').value = spell.effect;
    byId('spellCost').value = spell.cost;
    byId('spellCastTimeDuration').value = spell.castTimeDuration;
    byId('spellRange').value = spell.range;
    byId('spellDamage').value = spell.damage;

    editingSpellIndex = index;
    openSpellModal();
}

function castSpell(button) {
    const index = +button.closest('tr').dataset.index;
    useMana(state.spells[index].cost);
}

function deleteSpell(button) {
    const index = +button.closest('tr').dataset.index;
    state.spells.splice(index, 1);
    commit();
}

/* ----- Inventory ----- */

function addInventoryItem() {
    state.inventory.push({ description: '' });
    commit();
}

/* ----- Potions ----- */

function openPotionModal() { byId('potionModal').style.display = 'block'; }
function closePotionModal() { byId('potionModal').style.display = 'none'; }

function addPotion() {
    state.potions.push({ type: 'HP', ingredientQuality: 50, qualityModifier: 10 });
    commit();
}

/* ----- Powers ----- */

function openPowerModal() {
    byId('powerForm').reset();
    byId('powerModal').style.display = 'block';
}
function closePowerModal() { byId('powerModal').style.display = 'none'; }

function savePower() {
    const name = byId('powerName').value.trim();
    const description = byId('powerDescription').value.trim();
    const uses = parseInt(byId('powerUses').value, 10);

    if (!name || !description || isNaN(uses) || uses < 1) {
        alert('Please fill out all fields correctly.');
        return;
    }

    state.powers.push({ name, description, maxUses: uses, remainingUses: uses });
    closePowerModal();
    commit();
}

function usePower(index) {
    if (state.powers[index].remainingUses > 0) {
        state.powers[index].remainingUses -= 1;
        commit();
    }
}

function deletePower(index) {
    state.powers.splice(index, 1);
    commit();
}

/* ----- Dice roller (stateless — not part of the character model) ----- */

function rollDice() {
    const count = parseInt(byId('diceCount').value, 10) || 1;
    const sides = parseInt(byId('diceType').value, 10);
    const coward = byId('cowardMode').checked || count <= 1;

    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
    let finalRolls = [...rolls];

    if (!coward) {
        const bonusRoll = Math.ceil(Math.random() * sides);
        const half = sides / 2;
        if (bonusRoll > half) {
            finalRolls.splice(finalRolls.indexOf(Math.min(...finalRolls)), 1);
        } else {
            finalRolls.splice(finalRolls.indexOf(Math.max(...finalRolls)), 1);
        }
        finalRolls.push(bonusRoll);
    }

    const total = finalRolls.reduce((a, b) => a + b, 0);
    showDiceResult(`[${finalRolls.join(', ')}] = ${total}`);
}

function showDiceResult(message) {
    const popup = byId('diceResultPopup');
    popup.innerText = message;
    popup.style.display = 'block';
    setTimeout(() => { popup.style.display = 'none'; }, 5000);
}

/* ----- Misc fields (currency / lore) ----- */

function wireMiscInputs() {
    byId('currency').addEventListener('change', e => {
        state.currency = +e.target.value || 0;
        persist();
    });
    byId('lore').addEventListener('input', e => {
        state.lore = e.target.value;
        persist();
    });
}

/* ----- Tabs (pure UI, not part of the data model) ----- */

function showTab(containerId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

    byId(containerId).classList.add('active-tab');

    const order = ['spellsContainer', 'powersContainer', 'inventoryContainer', 'loreContainer'];
    const tabIndex = order.indexOf(containerId);
    if (tabIndex !== -1) {
        document.querySelectorAll('.tab-button')[tabIndex].classList.add('active');
    }
}

/* =========================================================================
   SAVE / LOAD — now trivial, because state IS the file format
   ========================================================================= */

// Save files (and old-format exports) can have stats/resources as strings
// (the pre-refactor script read them out of the DOM via .innerText). Always
// coerce to numbers here — "10" + 0 is the string "100", not the number 10.
function toNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const num = typeof value === 'number' ? value : parseInt(value, 10);
    return Number.isFinite(num) ? num : fallback;
}

function normalizeNumberMap(loadedMap, base) {
    const result = { ...base };
    Object.keys(base).forEach(key => {
        if (loadedMap && loadedMap[key] !== undefined) {
            result[key] = toNumber(loadedMap[key], base[key]);
        }
    });
    return result;
}

// The pre-refactor export format stored HP/Mana/Cunning Actions as flat
// top-level fields (currentHP, maxHP, ...) instead of nested under
// `resources`. Support both shapes so old exports still load correctly.
function normalizeResources(loaded, base) {
    const hpSource = loaded.resources?.hp ?? { current: loaded.currentHP, temp: 0 };
    const manaSource = loaded.resources?.mana ?? { current: loaded.currentMana, temp: 0 };
    const cunningSource = loaded.resources?.cunningActions ?? { current: loaded.cunningActions };

    return {
        hp: {
            current: toNumber(hpSource.current, base.hp.current),
            temp: toNumber(hpSource.temp, base.hp.temp),
        },
        mana: {
            current: toNumber(manaSource.current, base.mana.current),
            temp: toNumber(manaSource.temp, base.mana.temp),
        },
        cunningActions: {
            current: toNumber(cunningSource.current, base.cunningActions.current),
        },
    };
}

// v1 exports stored these as flat top-level fields (name, class,
// description, characterImage) rather than nested under `meta`, and used
// `characterImage` instead of `imageSrc` for the portrait. Support both.
function normalizeMeta(loaded, base) {
    const source = loaded.meta ?? {
        name: loaded.name,
        class: loaded.class,
        description: loaded.description,
        imageSrc: loaded.characterImage,
    };
    return {
        name: source.name ?? base.name,
        class: source.class ?? base.class,
        description: source.description ?? base.description,
        imageSrc: source.imageSrc ?? base.imageSrc,
    };
}

function normalizeState(loaded) {
    const base = createDefaultState();
    return {
        meta: normalizeMeta(loaded, base.meta),
        stats: normalizeNumberMap(loaded.stats, base.stats),
        modifiers: normalizeNumberMap(loaded.modifiers, base.modifiers),
        resources: normalizeResources(loaded, base.resources),
        skillModifiers: normalizeNumberMap(loaded.skillModifiers, base.skillModifiers),
        spells: Array.isArray(loaded.spells) ? loaded.spells : [],
        powers: Array.isArray(loaded.powers) ? loaded.powers : [],
        potions: Array.isArray(loaded.potions) ? loaded.potions : [],
        inventory: Array.isArray(loaded.inventory) ? loaded.inventory : [],
        currency: toNumber(loaded.currency, base.currency),
        lore: loaded.lore ?? '',
    };
}

function saveToFile() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.meta.name || 'character').replace(/\s+/g, '_')}_character.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadFromFile() {
    byId('loadFileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            state = normalizeState(JSON.parse(e.target.result));
            editingSpellIndex = null;
            commit();
        } catch (err) {
            alert('Failed to load file: Invalid JSON format.');
        }
    };
    reader.readAsText(file);
}

/* ----- Autosave (localStorage) ----- */

const AUTOSAVE_KEY = 'ttrpgCharacterState_v2';

function persist() {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    } catch (err) {
        console.error('Autosave failed:', err);
    }
}

function loadPersisted() {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return;
    try {
        state = normalizeState(JSON.parse(saved));
    } catch (err) {
        console.error('Failed to parse autosave, starting fresh.', err);
    }
}

/* =========================================================================
   INIT
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    loadPersisted();
    wireModifierInputs();
    wireMiscInputs();
    commit();
});