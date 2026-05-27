function buildDangerMap(room) {

    const terrain = Game.map.getRoomTerrain(room.name);
    const matrix = new PathFinder.CostMatrix();

    const queue = [];

    // 1️⃣ seed = exits
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {

            if (terrain.get(x,y) === TERRAIN_MASK_WALL) continue;

            if (x === 0 || y === 0 || x === 49 || y === 49) {
                matrix.set(x,y,1);
                queue.push({x,y});
            }
        }
    }

    // 2️⃣ flood fill
    while (queue.length) {

        const pos = queue.shift();
        const value = matrix.get(pos.x,pos.y);

        for (let dx=-1; dx<=1; dx++) {
            for (let dy=-1; dy<=1; dy++) {

                const nx = pos.x + dx;
                const ny = pos.y + dy;

                if (nx<0||ny<0||nx>49||ny>49) continue;
                if (terrain.get(nx,ny) === TERRAIN_MASK_WALL) continue;

                if (matrix.get(nx,ny) !== 0) continue;

                matrix.set(nx,ny,value+1);
                queue.push({x:nx,y:ny});
            }
        }
    }

    return matrix;
}

function drawDangerMap(room, matrix) {

    const vis = room.visual;

    for (let x=0;x<50;x++){
        for (let y=0;y<50;y++){

            const v = matrix.get(x,y);
            if (!v) continue;

            vis.text(
                v,
                x,
                y,
                {font:0.4, opacity:0.6}
            );
        }
    }
}

function serializeMatrix(matrix) {
    const data = [];

    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            data.push(matrix.get(x,y));
        }
    }

    return data;
}

function deserializeMatrix(data) {

    const matrix = new PathFinder.CostMatrix();

    let i = 0;

    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            matrix.set(x,y,data[i++]);
        }
    }

    return matrix;
}