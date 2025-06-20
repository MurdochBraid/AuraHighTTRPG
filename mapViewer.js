let notes = {};
let currentLatLng = null;

const map = L.map('map').setView([35.5088, 139.6204], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const auraHigh = L.marker([35.50175, 139.61362]).addTo(map);
auraHigh.bindPopup("Aura High")

const markers = {}; // Track markers by latlng key

const icons = {
    general: L.icon({
        iconUrl: './assets/magic-book.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    }),
    npc: L.icon({
        iconUrl: './assets/necromancer.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    }),
    quest: L.icon({
        iconUrl: './assets/cards.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    }),
    ritual: L.icon({
        iconUrl: './assets/pentagram.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    }),
    node: L.icon({
        iconUrl: './assets/crystals.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    }),
    store: L.icon({
        iconUrl: './assets/philosophers-stone.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    }),
    rune: L.icon({
        iconUrl: './assets/runes.png',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
    })
};

map.on('click', e => {
    currentLatLng = e.latlng;
    const key = `${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`;

    document.getElementById('noteText').value = notes[key]?.text || '';
    document.getElementById('noteCategory').value = notes[key]?.category || 'general';
    document.getElementById('noteModal').style.display = 'block';
});

function saveNote() {
    const key = `${currentLatLng.lat.toFixed(5)},${currentLatLng.lng.toFixed(5)}`;
    const text = document.getElementById('noteText').value;
    const category = document.getElementById('noteCategory').value;

    notes[key] = {
        text,
        category
    };

    if (markers[key]) {
        markers[key].setIcon(icons[category]);
        markers[key].unbindPopup().bindPopup(getPopupContent(key, text));
    } else {
        const marker = L.marker(currentLatLng, {
            icon: icons[category]
        }).addTo(map)
            .bindPopup(getPopupContent(key, text));
        markers[key] = marker;
    }

    closeNoteModal();
}

function deleteNote(key) {
    if (markers[key]) {
        map.removeLayer(markers[key]);
        delete markers[key];
    }
    delete notes[key];
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
}

window.onclick = function (event) {
    const modal = document.getElementById('noteModal');
    if (event.target === modal) {
        closeNoteModal();
    }
};

function resizeMap() {
    const offset = 80; // adjust this to leave room for headers, controls, etc.
    const mapElement = document.getElementById('map');
    mapElement.style.height = (window.innerHeight - offset) + 'px';

    // If the map is already initialized:
    if (typeof map !== 'undefined') {
        map.invalidateSize();
    }
}

function getPopupContent(key, text) {
    return `
    <div>
      <p style="margin: 0;">📌 ${text}</p>
      <button onclick="deleteNote('${key}')" style="margin-top: 4px; padding: 2px 6px; font-size: 0.8em;">Delete</button>
    </div>
  `;
}


// Initial resize
resizeMap();

// Resize on window resize
window.addEventListener('resize', resizeMap);

// Export notes
document.getElementById('exportNotes').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'notes.json';
    a.click();
});

// Import notes
document.getElementById('importNotes').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            notes = JSON.parse(e.target.result);
            Object.entries(notes).forEach(([key, {
                text,
                category
            }]) => {
                const [lat, lng] = key.split(',').map(Number);
                const latlng = L.latLng(lat, lng);
                const icon = icons[category] || icons.general;

                if (!markers[key]) {
                    markers[key] = L.marker(latlng, {
                        icon
                    }).addTo(map)
                        .bindPopup(getPopupContent(key, text));
                } else {
                    markers[key].setIcon(icon).unbindPopup().bindPopup(getPopupContent(key, text));
                }
            });


            alert("Notes imported!");
        } catch (err) {
            alert("Failed to load notes: " + err.message);
        }
    };
    reader.readAsText(file);
});