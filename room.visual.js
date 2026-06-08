module.exports.run = function (room) {

    const v = room.visual;

    // Affichage de l'UI
    const metrics = global._metrics?.[room.name];
    if (!metrics) return;

    let y = 1;
    const x = 1;
    
    Object.entries(metrics).forEach(([key, value]) => {
        const display = typeof value === 'object' 
            ? `${key}: ${JSON.stringify(value)}`
            : `${key}: ${value}`;
        v.text(display, x, y, { align: 'left', opacity: 0.5, font: 0.4 });
        y += 0.55;
    });
    v.text("Bucket: " + Game.cpu.bucket, x, y, { align: 'left', opacity: 0.5, font: 0.4 });

    const core = room.getCore();
    if (core !== ERR_NOT_FOUND)
        v.circle(core,{radius:0.1,fill:"green"});


    // Draw cpu stats
    y = 1;
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