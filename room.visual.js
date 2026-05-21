module.exports.run = function (room) {
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
        room.visual.text('📌 Missing upgradeContainerId', x, y, { align: 'left', opacity: 0.5, color: '#ff7070' });
        y++;
    }
    if (data.length) {
        for ( row in data ) {
            room.visual.text(data[row], x, y, { align: 'left', opacity: 0.5});
            y++;
        }
    }

    const core = room.getCore();
    if (core !== ERR_NOT_FOUND)
        room.visual.circle(core,{radius:0.1,fill:"green"});
}