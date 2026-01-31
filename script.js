/**
 * CONSTANTS & CONFIG
 */
const CONFIG = {
  BASE_URL: "https://raw.githubusercontent.com/sdroimod/magic-rampage-inventory/refs/heads/main",
  API: {
    ITEMS: "items.json",
    CLASSES: "classes.json",
    SKILLS: "skilltree.json"
  },
  TYPE_ORDER: { weapon: 0, armor: 1, artifact: 2, supply: 99, accessory: 4 },
  ELEMENTS: ["darkness", "earth", "fire", "water", "air", "light", "neutral"],
  DEFAULT_ICONS: {
    weapon: "⚔️",
    armor: "🛡️",
    artifact: "💍",
    class: ""
  }
};

/**
 * STATE
 */
const State = {
  items: [],
  classes: [],
  skills: [],
  activeSkills: [],
  currentClass: null,
  equipped: { armor: null, artifact: null, weapon: null },
  sortedItems: [],

  calculateStat(range, level, maxLevel) {
    if (!range) return 0;
    const [min, max] = range;
    if (level <= 0 || maxLevel <= 0) return min;
    return Math.round(min + ((max - min) / maxLevel) * level);
  }
};

/**
 * UI CACHE
 */
const UI = {
  inventory: document.getElementById("inventory"),
  invCount: document.getElementById("inv-count"),
  slots: {
    class: document.querySelector('.equip-slot[data-type="class"]'),
    armor: document.querySelector('.equip-slot[data-type="armor"]'),
    artifact: document.querySelector('.equip-slot[data-type="artifact"]'),
    weapon: document.querySelector('.equip-slot[data-type="weapon"]'),
  },
  info: {
    armor: document.querySelector('[data-info="armor"]'),
    artifact: document.querySelector('[data-info="artifact"]'),
    weapon: document.querySelector('[data-info="weapon"]'),
    class: document.getElementById("class-name-display"),
    totalArmor: document.getElementById("val-total-armor"),
    totalDmg: document.getElementById("val-total-damage")
  },
  modal: {
    overlay: document.getElementById("modal-overlay"),
    header: document.querySelector(".modal-header"),
    body: document.querySelector(".modal-body"),
    footer: document.querySelector(".modal-footer"),
    closeBtn: document.querySelector(".close-btn"),
    box: document.querySelector(".modal-box")
  }
};

/**
 * INITIALIZATION
 */
async function initApp() {
  try {
    const fetchJson = (file) => fetch(`${CONFIG.BASE_URL}/${file}`).then(res => res.json());

    const [items, classes, skills] = await Promise.all([
      fetchJson(CONFIG.API.ITEMS),
      fetchJson(CONFIG.API.CLASSES),
      fetchJson(CONFIG.API.SKILLS)
    ]);

    State.items = items;
    State.classes = classes;
    State.skills = skills;

    renderInventory();
    setupEventListeners();

    // Auto load Ranger
    const defaultClass = State.classes.find(c => c.class.toLowerCase() === "ranger");
    if (defaultClass) equipClass(defaultClass);

    UI.invCount.textContent = `${items.length} items`;

  } catch (err) {
    console.error(err);
    UI.inventory.innerHTML = `<div style="color:#e74c3c; text-align:center; padding:20px">Failed to load data.</div>`;
  }
}

/**
 * RENDER
 */
function renderInventory() {
  const sortedItems = State.items
    .filter(i => i.type !== "supply")
    .sort((a, b) => {
      const typeDiff = (CONFIG.TYPE_ORDER[a.type] || 99) - (CONFIG.TYPE_ORDER[b.type] || 99);
      return typeDiff !== 0 ? typeDiff : a.name.localeCompare(b.name);
    });

  const fragment = document.createDocumentFragment();

  sortedItems.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item-slot";
    div.dataset.index = index;

    const img = document.createElement("img");
    img.src = `${CONFIG.BASE_URL}/${item.sprite}`;
    img.loading = "lazy";
    img.alt = item.name;
    img.onerror = () => { img.src = "sprites/placeholder.png"; };

    div.appendChild(img);
    fragment.appendChild(div);
  });

  UI.inventory.innerHTML = "";
  UI.inventory.appendChild(fragment);
  State.sortedItems = sortedItems;
}

/**
 * EVENTS
 */
function setupEventListeners() {
  UI.inventory.addEventListener("click", (e) => {
    const slot = e.target.closest(".item-slot");
    if (!slot) return;
    const item = State.sortedItems[slot.dataset.index];
    if (item) openItemModal(item, false);
  });

  UI.slots.class.addEventListener("click", openClassModal);

  ['weapon', 'armor', 'artifact'].forEach(type => {
    UI.slots[type].addEventListener("click", () => {
      const item = State.equipped[type];
      if (item) openItemModal(item, true);
    });
  });

  document.getElementById("btn-skilltree").addEventListener("click", openSkillTreeModal);

  // Modal actions
  const hideModal = () => UI.modal.overlay.classList.add("hidden");
  UI.modal.closeBtn.addEventListener("click", hideModal);
  UI.modal.overlay.addEventListener("click", (e) => {
    if (e.target === UI.modal.overlay) hideModal();
  });
}

/**
 * MODALS
 */
function openModal(title, bodyHTML = "") {
  UI.modal.header.textContent = title;
  if(typeof bodyHTML === 'string') UI.modal.body.innerHTML = bodyHTML;
  else {
      UI.modal.body.innerHTML = "";
      UI.modal.body.appendChild(bodyHTML);
  }
  UI.modal.footer.innerHTML = ""; // Clear footer by default
  UI.modal.overlay.classList.remove("hidden");
}

function openClassModal() {
  const grid = document.createElement("div");
  grid.className = "class-grid";

  State.classes.forEach(cls => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline";
    btn.textContent = capitalize(cls.class.replace(/-/g, ' '));
    btn.onclick = () => {
      equipClass(cls);
      UI.modal.overlay.classList.add("hidden");
    };
    grid.appendChild(btn);
  });
  
  openModal("Select Class", grid);
}

function openItemModal(item, isEquipped = false) {
  // Defaults
  if (item.currentLevel === undefined) item.currentLevel = 0;
  if (!item.element) item.element = "neutral";
  if (!item.originalElement) item.originalElement = item.element;

  const renderContent = () => {
    const maxLvl = item.levelMax || 0;
    const isWeapon = item.type === "weapon";
    let statVal = 0;
    
    if (isWeapon) statVal = State.calculateStat(item.stats.damage, item.currentLevel, maxLvl);
    else if (item.stats && item.stats.armor) statVal = State.calculateStat(item.stats.armor, item.currentLevel, maxLvl);

    const elColor = getElementColor(item.element);
    
    let html = `
      <div style="text-align:center; margin-bottom:15px;">
        <img src="${CONFIG.BASE_URL}/${item.sprite}" style="height:64px; filter:drop-shadow(0 0 10px ${elColor})">
      </div>
      <div class="stat-row">
        <span>Element</span>
        <span>
            <strong style="color:${elColor}">${capitalize(item.element)}</strong>
            ${item.originalElement === 'neutral' ? `<button id="btn-change-el" class="btn btn-sm btn-outline" style="margin-left:5px">Change</button>` : ''}
        </span>
      </div>
      <div class="stat-row">
        <span>Level</span>
        <strong>${item.currentLevel} / ${maxLvl}</strong>
      </div>
      <div class="stat-row">
        <span>${isWeapon ? 'Damage' : 'Armor'}</span>
        <strong style="font-size:1.1em; color:#fff">${statVal}</strong>
      </div>
    `;

    if (item.boosts) {
      html += `<div style="margin-top:15px; padding-top:10px; border-top:1px dashed #333">`;
      for (let [k, v] of Object.entries(item.boosts)) {
        if (v !== 1) html += `<div class="boost-tag"><span style="color:#888; text-transform:capitalize">${k}</span><span style="color:${CONFIG.ELEMENTS.includes(k) ? getElementColor(k) : '#ffb142'}">+${Math.round((v - 1) * 100)}%</span></div>`;
      }
      html += `</div>`;
    }
    return html;
  };

  openModal(item.name);
  
  const refresh = () => {
    UI.modal.body.innerHTML = renderContent();
    const changeBtn = document.getElementById('btn-change-el');
    if (changeBtn) {
      changeBtn.onclick = () => showElementPicker(item, () => {
         refresh();
         if (isEquipped) updateStats();
      });
    }
  };
  refresh();

  // Footer Actions
  const footerDiv = document.createElement("div");
  footerDiv.style.width = "100%";
  footerDiv.style.display = "flex";
  footerDiv.style.flexDirection = "column";
  footerDiv.style.gap = "10px";

  // Upgrade Controls
  if (item.levelMax > 0) {
     const upgRow = document.createElement("div");
     upgRow.style.display = "flex"; upgRow.style.gap = "5px";
     
     const mkBtn = (txt, fn) => {
         const b = document.createElement("button");
         b.className = "btn btn-outline btn-sm";
         b.style.flex = "1";
         b.textContent = txt;
         b.onclick = () => { fn(); refresh(); };
         return b;
     };
     upgRow.append(
         mkBtn("-", () => { item.currentLevel = Math.max(0, item.currentLevel - 1); if(isEquipped) updateStats(); }),
         mkBtn("+", () => { item.currentLevel = Math.min(item.levelMax, item.currentLevel + 1); if(isEquipped) updateStats(); }),
         mkBtn("Max", () => { item.currentLevel = item.levelMax; if(isEquipped) updateStats(); })
     );
     footerDiv.appendChild(upgRow);
  }

  // Equip/Unequip Action
  const actionBtn = document.createElement("button");
  actionBtn.className = isEquipped ? "btn btn-outline btn-block" : "btn btn-primary btn-block";
  actionBtn.textContent = isEquipped ? "Unequip" : "Equip";
  if(isEquipped) {
      actionBtn.style.borderColor = "#e74c3c"; 
      actionBtn.style.color = "#e74c3c";
  }
  
  actionBtn.onclick = () => {
      if(isEquipped) unequipItem(item.type);
      else equipItem(item);
      UI.modal.overlay.classList.add("hidden");
  };
  footerDiv.appendChild(actionBtn);

  UI.modal.footer.appendChild(footerDiv);
}

function showElementPicker(item, callback) {
    const div = document.createElement("div");
    div.className = "el-select-grid";
    CONFIG.ELEMENTS.forEach(el => {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline btn-sm";
        btn.textContent = capitalize(el);
        btn.style.color = getElementColor(el);
        btn.onclick = () => {
            item.element = el;
            callback();
        };
        div.appendChild(btn);
    });
    UI.modal.body.innerHTML = "";
    UI.modal.body.appendChild(div);
}

function openSkillTreeModal() {
    const div = document.createElement("div");
    div.className = "class-grid"; // Reusing grid style
    
    State.skills.forEach(skill => {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline";
        const isActive = State.activeSkills.includes(skill.target);
        if(isActive) btn.classList.add("active");
        
        btn.innerHTML = `<span style="font-size:0.9em">${skill.target.toUpperCase()}</span> <br> <span style="font-size:0.8em; color:#ffb142">+${Math.round((skill.boost-1)*100)}%</span>`;
        
        btn.onclick = () => {
             const idx = State.activeSkills.indexOf(skill.target);
             if(idx > -1) {
                 State.activeSkills.splice(idx, 1);
                 btn.classList.remove("active");
             } else {
                 State.activeSkills.push(skill.target);
                 btn.classList.add("active");
             }
             updateStats();
        };
        div.appendChild(btn);
    });
    openModal("Skill Tree", div);
}

/**
 * LOGIC
 */
function equipClass(cls) {
  State.currentClass = cls;
  UI.info.class.textContent = `Class: ${capitalize(cls.class.replace(/-/g, ' '))}`;
  UI.slots.class.innerHTML = `<img src="${CONFIG.BASE_URL}/sprites/class/${cls.class}.png">`;
  updateStats();
}

function equipItem(item) {
  State.equipped[item.type] = item;
  
  // Update Slot Visually
  const slot = UI.slots[item.type];
  slot.innerHTML = `<img src="${CONFIG.BASE_URL}/${item.sprite}">`;
  slot.classList.add("has-item");
  
  // Update Text Info
  const color = getElementColor(item.element || "neutral");
  UI.info[item.type].innerHTML = `${capitalize(item.type)}: <span style="color:${color}">${item.name}</span>`;
  
  updateStats();
}

function unequipItem(type) {
  State.equipped[type] = null;
  
  const slot = UI.slots[type];
  slot.innerHTML = `<span class="slot-placeholder">${CONFIG.DEFAULT_ICONS[type]}</span>`;
  slot.classList.remove("has-item");
  
  UI.info[type].textContent = `${capitalize(type)}: -`;
  updateStats();
}

function updateStats() {
  const { armor, artifact, weapon } = State.equipped;
  const _class = State.currentClass;

  // Armor Calculation
  let totalArmor = 0;
  if (armor && armor.stats.armor) {
    totalArmor += State.calculateStat(armor.stats.armor, armor.currentLevel, armor.levelMax);
  }
  if (artifact && artifact.stats && artifact.stats.armor) {
    let artArmor = State.calculateStat(artifact.stats.armor, artifact.currentLevel, artifact.levelMax);
    if(artifact.boosts.armor) totalArmor = Math.round(totalArmor * artifact.boosts.armor);
    totalArmor += artArmor;
  }
  if (_class && _class.boosts) {
    totalArmor = Math.round(totalArmor * _class.boosts.armor);
  }

  // Damage Calculation
  let totalDmg = 0;
  if (weapon && weapon.stats.damage) {
    let baseDmg = State.calculateStat(weapon.stats.damage, weapon.currentLevel, weapon.levelMax);

    // Boost Logic
    const applyBoost = (source) => {
        if(source && source.boosts) {
            if(weapon.subType && source.boosts[weapon.subType]) baseDmg = Math.round(baseDmg * source.boosts[weapon.subType]);
            if(source.boosts.magic) baseDmg = Math.round(baseDmg * source.boosts.magic);
        }
    };

    applyBoost(armor);
    applyBoost(artifact);
    applyBoost(_class);

    if (weapon.subType) {
      State.activeSkills.forEach(target => {
        if (target === weapon.subType) {
          const skill = State.skills.find(s => s.target === target);
          if (skill) baseDmg = Math.round(baseDmg * skill.boost);
        }
      });
    }
    totalDmg = baseDmg;
  }

  // Animate numbers
  animateValue(UI.info.totalArmor, parseInt(UI.info.totalArmor.textContent), totalArmor, 500);
  animateValue(UI.info.totalDmg, parseInt(UI.info.totalDmg.textContent), totalDmg, 500);
}

// Helper: Count up animation
function animateValue(obj, start, end, duration) {
    if(start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }

function getElementColor(el) {
  const colors = {
    fire: '#e74c3c', water: '#3498db', earth: '#27ae60',
    air: '#a3ebff', light: '#f1f1a2', darkness: '#9b59b6', neutral: '#95a5a6'
  };
  return colors[el] || '#fff';
}

document.addEventListener("DOMContentLoaded", initApp);