module.exports.run = function (room) {

    const v = room.visual;

    // MAJ de l'UI
    if (Game.time % 10 === 0) {
        const roleCounts = {};

        const data = [];
        const creeps = room.find(FIND_MY_CREEPS);

        for (const creep of creeps) {
            roleCounts[creep.memory.role] = (roleCounts[creep.memory.role] || 0) + 1;
        }

        for (let role in roleCounts) {
            data.push(`Role ${role} : ${roleCounts[role] || 0}/${room.memory.requested[role]}`);
        }
        data.push("Bucket: " + Game.cpu.bucket);
        room.memory.visualData = data;
    }

    // Affichage de l'UI
    const data = room.memory.visualData;
    const x = 1;
    let y = 1;
    if ( !room.memory.upgradeContainerId ) {
        v.text('📌 Missing upgradeContainerId', x, y, { align: 'left', opacity: 0.5, color: '#ff7070' });
        y++;
    }
    if (data.length) {
        for ( row in data ) {
            v.text(data[row], x, y, { align: 'left', opacity: 0.5});
            y++;
        }
    }

    const core = room.getCore();
    if (core !== ERR_NOT_FOUND)
        v.circle(core,{radius:0.1,fill:"green"});


    // Draw cpu stats
    let y = 1;
    v.text('CPU', 35, y, { font: 0.7, color: '#ffffff', align: 'left' });
    y += 0.9;

    for (const [label, data] of Object.entries(Memory.stats?.cpu || {})) {
        const val = data.last?.toFixed(2) ?? '?';
        const avg = data.avg?.toFixed(2) ?? '?';

        v.text(`${label}`, 35, y, { font: 0.45, color: '#aaaaaa', align: 'left' });
        v.text(`${val} (avg ${avg})`, 43, y, { font: 0.45, color: '#ffcc00', align: 'left' });
        y += 0.6;
    }
}