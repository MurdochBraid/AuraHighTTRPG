let notes = {};
let currentLatLng = null;

const map = L.map('map').setView([35.5088, 139.6204], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markers = {}; // Track markers by latlng key

const icons = {
    general: L.icon({
        iconUrl: './assets/crystals.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    }),
    npc: L.icon({
        iconUrl: './assets/necromancer.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    }),
    quest: L.icon({
        iconUrl: './assets/cards.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    }),
    danger: L.icon({
        iconUrl: './assets/runes.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
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
        markers[key].unbindPopup().bindPopup(`${text}`);
    } else {
        const marker = L.marker(currentLatLng, {
            icon: icons[category]
        }).addTo(map)
            .bindPopup(`${text}`);
        markers[key] = marker;
    }

    closeNoteModal();
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
                        .bindPopup(`${text}`);
                } else {
                    markers[key].setIcon(icon).unbindPopup().bindPopup(`${text}`);
                }
            });


            alert("Notes imported!");
        } catch (err) {
            alert("Failed to load notes: " + err.message);
        }
    };
    reader.readAsText(file);
});