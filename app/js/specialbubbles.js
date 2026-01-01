// Loads and provides access to special bubble types and config
let specialBubbleTypes = {};
let specialBubbleSpawnConfig = {};

function loadSpecialBubblesConfig(callback) {
    fetch('/data/specialbubbles.json')
        .then(res => {
            if (!res.ok) throw new Error('specialbubbles.json not found or failed to load');
            return res.json();
        })
        .then(data => {
            specialBubbleTypes = data.specialBubbleTypes;
            specialBubbleSpawnConfig = data.spawnConfig;
            if (callback) callback();
        })
        .catch(err => {
            console.error('Failed to load specialbubbles.json:', err);
            // Show error overlay if showErrorOverlay function is available
            if (typeof showErrorOverlay === 'function') {
                showErrorOverlay('Could not load specialbubbles.json.\n' + err.message);
            }
        });
}
