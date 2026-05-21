const ROOM_SIZE = 50;
const BUILD_PRIORITY = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_STORAGE,
    STRUCTURE_CONTAINER,
    STRUCTURE_TOWER,
    STRUCTURE_LINK,
    STRUCTURE_TERMINAL,
    STRUCTURE_LAB,
    STRUCTURE_ROAD,
    STRUCTURE_RAMPART
];

// FONCTIONS COMMUNES 
function isWalkable(terrain, x, y) {
    return terrain.get(x, y) !== TERRAIN_MASK_WALL;
}

function isSwamp(terrain, x, y) {
    return terrain.get(x, y) === TERRAIN_MASK_SWAMP;
}

function getExitTiles(room) {
    const terrain = room.getTerrain();
    const exits = [];

    for (let i = 0; i < ROOM_SIZE; i++) {

        if (isWalkable(terrain, i, 0)) exits.push({x:i,y:0});
        if (isWalkable(terrain, i, 49)) exits.push({x:i,y:49});
        if (isWalkable(terrain, 0, i)) exits.push({x:0,y:i});
        if (isWalkable(terrain, 49, i)) exits.push({x:49,y:i});
    }

    return exits;
}

function floodFill(room, startTiles) {

    const terrain = room.getTerrain();

    const dist = Array.from({length:50},()=>Array(50).fill(Infinity));
    const queue = [];

    for (const t of startTiles) {
        dist[t.x][t.y] = 0;
        queue.push(t);
    }

    while(queue.length) {

        const {x,y} = queue.shift();
        const d = dist[x][y] + 1;

        for (let dx=-1; dx<=1; dx++)
        for (let dy=-1; dy<=1; dy++) {

            const nx=x+dx;
            const ny=y+dy;

            if(nx<0||ny<0||nx>=50||ny>=50) continue;
            if(!isWalkable(terrain,nx,ny)) continue;

            if(dist[nx][ny] > d){
                dist[nx][ny]=d;
                queue.push({x:nx,y:ny});
            }
        }
    }

    return dist;
}

// FONCTIONS CORE
function openAreaScore(room,x,y,radius){

    const terrain = room.getTerrain();
    let score = 0;

    for(let dx=-radius;dx<=radius;dx++)
    for(let dy=-radius;dy<=radius;dy++){

        const nx=x+dx;
        const ny=y+dy;

        if(nx<0||ny<0||nx>=50||ny>=50) continue;

        if(isWalkable(terrain,nx,ny))
            score++;

    }

    return score;
}

function averageDistance(pos, targets){

    let sum=0;

    for(const t of targets)
        sum += pos.findPathTo(t).length;

    return sum / targets.length;
}

function findBestCore(room){

    const terrain = room.getTerrain();

    const exits = getExitTiles(room);
    const dangerMap = floodFill(room, exits);

    const sources = room.find(FIND_SOURCES);
    const controller = room.controller;

    let best = null;
    let bestScore = -Infinity;

    for(let x=2;x<48;x++)
    for(let y=2;y<48;y++){

        if(!isWalkable(terrain,x,y)) continue;

        const danger = dangerMap[x][y];

        // ignore trop proche exit
        if(danger < 5) continue;
        const minarea = openAreaScore(room,x,y,2);
        if (minarea < 25) continue

        const area = openAreaScore(room,x,y, 6);

        if(area < 80) continue;

        const pos = new RoomPosition(x,y,room.name);

        const ecoDist =
            averageDistance(pos,sources) +
            pos.getRangeTo(controller) * 2;

        const score =
            danger * 4       // sécurité
            + area           // espace
            - ecoDist * 3;   // coût eco

        if(score > bestScore){
            bestScore = score;
            best = pos;
        }
    }

    return best;
}

// FONCTIONS PLANNER

function scoreQuadrant(room, core, dxSign, dySign, maxDepth) {

    const terrain = room.getTerrain();

    const visited = new Set();
    const queue = [{ x: core.x, y: core.y, d: 0 }];

    let score = 0;

    while (queue.length) {

        const { x, y, d } = queue.shift();
        const key = `${x}:${y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (d > maxDepth) continue;

        // quadrant filter
        const vx = x - core.x;
        const vy = y - core.y;

        if (vx * dxSign < 0 || vy * dySign < 0) continue;

        // ONLY condition: walkable
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        if (vx !== 0 && vy !== 0)
            score++;

        // expand 4-dir
        queue.push({ x: x + 1, y: y, d: d + 1 });
        queue.push({ x: x - 1, y: y, d: d + 1 });
        queue.push({ x: x, y: y + 1, d: d + 1 });
        queue.push({ x: x, y: y - 1, d: d + 1 });
    }

    return score;
}

function medianBonus(x, y, quad) {
    const dx = Math.abs(x - quad.dx);
    const dy = Math.abs(y - quad.dy);

    // distance à la ligne médiane
    return Math.min(dx, dy);
}

function getNeighbors(x, y) {

    const result = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {

            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            // limite room
            if (nx < 0 || ny < 0 || nx >= 50 || ny >= 50) continue;

            result.push({ x: nx, y: ny });
        }
    }

    return result;
}

function inQuadrant(x, y, core, quad) {

    const dx = Math.sign(x - core.x);
    const dy = Math.sign(y - core.y);

    return (
        dx >= quad.dxMin &&
        dx <= quad.dxMax &&
        dy >= quad.dyMin &&
        dy <= quad.dyMax
    );
}

function floodFillQuadrant(room, core, quadrant, maxDepth) {

    const terrain = room.getTerrain();
    const visited = new Set();
    const result = [];

    const queue = [{x:core.x,y:core.y,d:0}];

    while(queue.length) {

        const node = queue.shift();
        const key = node.x + ":" + node.y;

        if (visited.has(key)) continue;
        visited.add(key);

        if (node.d > maxDepth) continue;
        if (!isWalkable(terrain,node.x,node.y)) continue;
        if (!inQuadrant(node.x,node.y,core,quadrant)) continue;
        result.push(node);

        let neighbors = getNeighbors(node.x, node.y);

        // ⭐ PRIORISATION MEDIANE
        neighbors.sort((a,b) => {
            return medianBonus(a.x,a.y,quadrant)
                 - medianBonus(b.x,b.y,quadrant);
        });

        for (const n of neighbors) {
            queue.push({
                x:n.x,
                y:n.y,
                d:node.d + 1
            });
        }
    }

    return result;
}

function bestQuadrant(room, core) {

    const QUADRANTS = [
        { dx: -1, dy: -1, dxMin: -1, dxMax: 0, dyMin: -1, dyMax: 0 },
        { dx:  1, dy: -1, dxMin: 0, dxMax: 1, dyMin: -1, dyMax: 0 },
        { dx: -1, dy:  1, dxMin: -1, dxMax: 0, dyMin: 0, dyMax: 1 },
        { dx:  1, dy:  1 ,dxMin: 0, dxMax: 1, dyMin: 0, dyMax: 1 },
    ];

    let best = null;
    let bestScore = -1;

    for (const q of QUADRANTS) {

        const s = scoreQuadrant(room, core, q.dx, q.dy, 8);

        if (s > bestScore) {
            bestScore = s;
            best = q;
        }
    }

    return best;
}

function mark(plan, type, x, y, opts = {}) {

    const key = `${x}:${y}`;
    if (plan.occupied[key]) return ERR_INVALID_TARGET;

    plan.occupied[key] = type;

    if (!plan.structures[type])
        plan.structures[type] = [];

    plan.structures[type].push({
        x,
        y,
        dependsOn: opts.dependsOn || [],
        ...opts
    });

    return OK;
}

function planCore(room, core) {

    const plan = room.memory.plan;

    const cx = core.x;
    const cy = core.y;

    // CONTAINER CENTRAL (en attendant storage)
    mark(plan, "container", cx, cy, { tag: 'core' });

    // STORAGE
    mark(plan, "storage", cx + 1, cy);

    // SPAWN
    mark(plan, "spawn", cx, cy + 1, { tag: 'core' });

    // TERMINAL
    mark(plan, "terminal", cx - 1, cy);

    // LINK CORE
    mark(plan, "link", cx, cy - 1, { tag: 'core' });

    // ROADS around core (cross)
    const offsets = [
        [0,0],
        [1,1],[1,-1],
        [-1,1],[-1,-1],
        [2,0], [-2, 0],
        [0,2], [0, -2]
    ];

    for (const [dx,dy] of offsets) {
        mark(plan, "road", cx + dx, cy + dy, { tag: 'core' });
    }
}

function getPerpendicularPos(pos1, pos2) {

    const roomName = pos1.roomName;
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;


    const options = [
        new RoomPosition(
            pos1.x - dy,
            pos1.y + dx,
            roomName
        ),
        new RoomPosition(
            pos1.x + dy,
            pos1.y - dx,
            roomName
        )
    ];
        
    for (const opt of options) {
        const terrain = Game.map.getRoomTerrain(roomName);
        if (isWalkable(terrain, opt.x, opt.y))
            return opt;
    }

    return ERR_INVALID_TARGET;
}

function planController(room, core) {

    const plan = room.memory.plan;

    const path = PathFinder.search(
        core,
        { pos: room.controller.pos, range: 3 }
    ).path;

    const containerPos = path[path.length - 2];
    const workPos = path[path.length - 1];

    const linkPos = getPerpendicularPos(containerPos, workPos);

    mark(plan, "container", containerPos.x, containerPos.y, { tag: 'controller' });
    mark(plan, "link", linkPos.x, linkPos.y, { tag: 'controller'});

    for (let i = 1; i <= path.length - 1; i++) {
        mark(plan, "road", path[i].x, path[i].y, { tag: 'controller'});
    }

    plan.spatialJob.push({
        tag: 'controller',
        targetId: room.controller.id,
        workPos: workPos
    });

}

function planSources(room, core) {

    const plan = room.memory.plan;

    const sources = room.find(FIND_SOURCES);

    for (const s of sources) {

        const path = PathFinder.search(
            core,
            { pos: s.pos, range: 1 }
        ).path;

        const containerPos = path[path.length - 1];
        const workPos = path[path.length - 1];

        const linkPos = getPerpendicularPos(containerPos, s.pos);

        mark(plan, "container", containerPos.x, containerPos.y, { tag: 'source'});
        mark(plan, "link", linkPos.x, linkPos.y, { tag: 'source'});

        for (let i = 1; i <= path.length - 2; i++) {
            mark(plan, "road", path[i].x, path[i].y, { tag: 'source'});
        }

        plan.spatialJob.push({
            tag: 'controller',
            targetId: s.id,
            workPos: workPos
        });
    }
}

function planMineral(room, core) {

    const plan = room.memory.plan;

    const mineral = room.find(FIND_MINERALS)[0];

    const path = PathFinder.search(
        core,
        { pos: mineral.pos, range: 1 }
    ).path;

    const containerPos = path[path.length - 1];
    const workPos = path[path.length - 1];

    for (let i = 1; i <= path.length - 1; i++) {
        mark(plan, "road", path[i].x, path[i].y, { tag: 'mineral', dependsOn: ['extractor'] });
    }

    mark(plan, "container", containerPos.x, containerPos.y, { tag: 'mineral', dependsOn: ['extractor'] });
    mark(plan, "extractor", mineral.pos.x, mineral.pos.y, { tag: 'mineral' })
    
    plan.spatialJob.push({
        tag: 'mineral',
        targetId: mineral.id,
        workPos: workPos
    });
}

function planLabs(room, core, quadrant) {

    const p = room.memory.plan;
    const terrain = room.getTerrain();

    const qx = quadrant.dx;
    const qy = quadrant.dy;

    //on tente l'optimisation des labs, sinon on flood
    let Q_TOP, Q_BOTTOM, Q_LEFT, Q_RIGHT;
    if ( qy > 0 ) {
        Q_TOP = core.y + qy
        Q_BOTTOM = core.y + 4 * qy
    } else {
        Q_TOP = core.y + 4 * qy
        Q_BOTTOM = core.y + qy
    }
    if ( qx > 0 ) {
        Q_LEFT = core.x + qx
        Q_RIGHT = core.x + 4 * qx
    } else {
        Q_LEFT = core.x + 4 * qx
        Q_RIGHT = core.x + qx
    }

    const tiles = room.lookAtArea(Q_TOP, Q_LEFT, Q_BOTTOM, Q_RIGHT, true)

    let stampLab = true;
    for (const t of tiles) {
        if ( t.terrain === 'wall' ) stampLab = false;
    }

    for (let i = 2; i < 4; i++) {
        const nx = core.x + i * qx;
        const ny = core.y + i * qy;
        
        if (isWalkable(terrain, nx, ny))
            mark(p, "road", nx, ny)
    }

    if (stampLab) {
        mark(p, "lab", core.x + 2 * qx, core.y + 1 * qy);
        mark(p, "lab", core.x + 1 * qx, core.y + 2 * qy);
        mark(p, "lab", core.x + 3 * qx, core.y + 1 * qy);
        mark(p, "lab", core.x + 1 * qx, core.y + 3 * qy);
        mark(p, "lab", core.x + 3 * qx, core.y + 2 * qy);
        mark(p, "lab", core.x + 2 * qx, core.y + 3 * qy);
        mark(p, "lab", core.x + 2 * qx, core.y + 4 * qy);
        mark(p, "lab", core.x + 4 * qx, core.y + 2 * qy);
        mark(p, "lab", core.x + 3 * qx, core.y + 4 * qy);
        mark(p, "lab", core.x + 4 * qx, core.y + 3 * qy);
    } else {
        const candidates = floodFillQuadrant(room, core, quadrant, 6);
        for (const candidate of candidates) {
            if (candidate.x === core.x || candidate.y === core.y) continue;

            mark(p, "lab", candidate.x, candidate.y)
            if (p.structures.lab && p.structures.lab.length === 10) return
        }
    }
}

function hasAdjacentRoad(plan, x, y) {

    const adjacents = [
        [-1, 1],[0, 1],[1, 1],
        [-1, 0],       [1, 0],
        [-1,-1],[0,-1],[1,-1]
    ];

    for (const [dx, dy] of adjacents) {
        const ax = x + dx;
        const ay = y + dy;

        const roads = plan.structures.road || [];

        for (const r of roads) {
            if (r.x === ax && r.y === ay) {
                return true;
            }
        }
    }

    return false;
}

function fillGrid(room, core, quadrant) {

    const p = room.memory.plan;
    const terrain = room.getTerrain();
    const visited = new Set();

    const queue = [{x:core.x,y:core.y,d:0}];

    while(queue.length) {

        const tile = queue.shift();
        const key = tile.x + ":" + tile.y;
        if (visited.has(key)) continue;
        visited.add(key);

        if (!isWalkable(terrain,tile.x,tile.y)) continue;

        if (tile.d > 30) break;

        const dx = tile.x - core.x
        const dy = tile.y - core.y

        let spacingD1, spacingD2;
        if(quadrant.dx + quadrant.dy === 0) {
            spacingD1 = 4;
            spacingD2 = 8;
        } else {
            spacingD1 = 8;
            spacingD2 = 4;  
        }

        if ((dx + dy) % spacingD1 === 0 ) mark(p, 'road', tile.x, tile.y)
        if ((dx - dy) % spacingD2 === 0 ) mark(p, 'road', tile.x, tile.y)

        let neighbors = getNeighbors(tile.x, tile.y);

        for (const n of neighbors) {
            queue.push({
                x:n.x,
                y:n.y,
                d:tile.d + 1
            });
        }
    }
}

function fillRCL6(room, core) {
    fillWithStructures(room, core, 'tower', 6);
    fillWithStructures(room, core, 'extension', 40);
}

function findBestSpotForCoreBis(room, core) {

    const terrain = room.getTerrain();
    const p = room.memory.plan

    const queue = [{x: core.x, y: core.y}];
    const visited = new Set();

    let spot = null;

    while(queue.length) {

        const {x,y} = queue.shift();
        const key = `${x}:${y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

        let score = 0;
        for (const [dx,dy] of dirs) {

            const nx = x+dx;
            const ny = y+dy;

            if (nx<0||ny<0||nx>=50||ny>=50) continue;

            if (!isWalkable(terrain, nx, ny)) continue;
            
            queue.push({x:nx,y:ny});

            const key = `${nx}:${ny}`;
            if (p.occupied[key]) continue;
            
            score++
        }

        if ( score === 4 && !p.occupied[key]) return {x: x, y: y}
    }
}

function planCoreBis(room, core) {

    const terrain = room.getTerrain();

    const spot = findBestSpotForCoreBis(room, core);
    const p = room.memory.plan;

    const x = spot.x;
    const y = spot.y;

    mark(p, "powerSpawn", x, y + 1);
    mark(p, "nuker", x + 1, y);
    mark(p, "spawn", x - 1, y);
    mark(p, "link", x, y - 1);

    const offsets = [
        [0,0],
        [1,1],[1,-1],
        [-1,1],[-1,-1],
        [2,0], [-2, 0],
        [0,2], [0, -2]
    ];

    for (const [dx,dy] of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (isWalkable(terrain, nx, ny))
            mark(p, 'road', x + dx, y + dy);
    }
}

function fillRemaining(room, core) {
    fillWithStructures(room, core, 'extension', 20);
}

function runPlanner(room, core) {

    const quadrant = bestQuadrant(room, core);

    planCore(room, core);

    planLabs(room, core, quadrant);

    fillGrid(room, core, quadrant);

    planController(room, core);

    planSources(room, core);

    planMineral(room, core);

    fillRCL6(room, core);

    planCoreBis(room, core);

    fillRemaining(room, core);


    let ret = -1;
    do {
        const missingExtensions = 60 - room.memory.plan.structures.extension.length
        fillWithStructures(room, core, 'extension', missingExtensions);
        ret = fixExtensionWalls(room, core);
    } while (ret !== OK)

    
}

function buildPlanningMatrix(room) {

    const matrix = new PathFinder.CostMatrix();
    const terrain = room.getTerrain();
    const plan = room.memory.plan;

    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {

            if (terrain.get(x,y) === TERRAIN_MASK_WALL) {
                matrix.set(x,y,255);
            } else {
                matrix.set(x,y,2);
            }
        }
    }

    for (const type in plan.structures) {

        const tiles = plan.structures[type];

        for (const t of tiles) {

            if (type === STRUCTURE_ROAD || type === "road") {
                matrix.set(t.x, t.y, 1);
                continue;
            }

            // structures bloquantes
            if (
                type === "extension" ||
                type === "spawn" ||
                type === "storage" ||
                type === "terminal" ||
                type === "lab" ||
                type === "tower" ||
                type === "powerSpawn" ||
                type === "nuker"
            ) {
                matrix.set(t.x, t.y, 255);
            }
        }
    }

    return matrix;
}

function floodFillReachable(core, matrix) {

    const reachable = new Set();
    const queue = [{x: core.x, y: core.y}];

    while(queue.length) {

        const {x,y} = queue.shift();
        const key = `${x}:${y}`;

        if (reachable.has(key)) continue;
        reachable.add(key);

        for (let dx=-1; dx<=1; dx++)
        for (let dy=-1; dy<=1; dy++) {

            if (!dx && !dy) continue;

            const nx = x+dx;
            const ny = y+dy;

            if (nx<0||ny<0||nx>=50||ny>=50) continue;

            if (matrix.get(nx,ny) >= 255) continue;

            queue.push({x:nx,y:ny});
        }
    }
    
    return reachable;
}

function findUnreachableTiles(room, reachable) {

    const unreachable = new Set();
    const terrain = room.getTerrain();
    room.memory.unreachable = []
    for(let x=0;x<50;x++)
    for(let y=0;y<50;y++){
        if (terrain.get(x,y) === TERRAIN_MASK_WALL)
            continue;

        let unreachableTile = true;
        for (let dx=-1; dx<=1; dx++)
        for (let dy=-1; dy<=1; dy++) {
        

            if (!dx && !dy) continue;

            const key = `${x+dx}:${y+dy}`;
            if (key === '3:20') console.log(`${dx}:${dy} => ${reachable.has(key)}`)
            if (reachable.has(key))
                unreachableTile = false;
        }

        const key = `${x}:${y}`;
        
        if (unreachableTile) {
            unreachable.add(key)
            room.memory.unreachable.push(key)
        }
    }

    return unreachable;
}

function isFrontierExtension(ext, unreachable) {

    for(let dx=-1;dx<=1;dx++)
    for(let dy=-1;dy<=1;dy++){

        if(!dx && !dy) continue;

        const key = `${ext.x+dx}:${ext.y+dy}`;

        if (unreachable.has(key))
            return true;
    }

    return false;
}

function fixExtensionWalls(room, core) {

    const plan = room.memory.plan;

    if (!plan.structures.extension) return;

    const matrix = buildPlanningMatrix(room);

    const reachable = floodFillReachable(core, matrix);

    const unreachable = findUnreachableTiles(room, reachable);
    console.log(unreachable);
    if (!unreachable.size) {
        console.log("Planner: connectivity OK");
        return OK;
    }

    console.log(
        `Planner: ${unreachable.size} tiles unreachable`
    );

    const frontierExtensions =
        plan.structures.extension.filter(e =>
            isFrontierExtension(e, unreachable)
        );

    // ouvre quelques passages seulement
    const OPENINGS = 1;

    for (let i=0;i<Math.min(OPENINGS,frontierExtensions.length);i++) {

        const ext = frontierExtensions[i];

        console.log(
            `Opening passage at ${ext.x},${ext.y}`
        );

        // remove extension
        plan.structures.extension =
            plan.structures.extension.filter(
                e => !(e.x===ext.x && e.y===ext.y)
            );

        // replace by road
        plan.structures.road =
            plan.structures.road || [];

        plan.structures.road.push({
            x:ext.x,
            y:ext.y
        });

        plan.occupied[`${ext.x}:${ext.y}`] = "road";
        
    }
    return ERR_BUSY
}

function fillWithStructures(room, core, structureType, amount) {
    const p = room.memory.plan;
    const terrain = room.getTerrain();
    const visited = new Set();

    const queue = [{x:core.x,y:core.y,d:0}];

    let placed = 0;

    while(queue.length) {

        const tile = queue.shift();
        const key = tile.x + ":" + tile.y;
        if (visited.has(key)) continue;
        visited.add(key);

        if (!isWalkable(terrain,tile.x,tile.y)) continue;

        const dx = tile.x - core.x
        const dy = tile.y - core.y

        if (hasAdjacentRoad(p, tile.x, tile.y)) {
            if ( mark(p, structureType, tile.x, tile.y) === OK )
                placed++;
        } 

        if (placed >= amount) return;
        let neighbors = getNeighbors(tile.x, tile.y);

        for (const n of neighbors) {
            queue.push({
                x:n.x,
                y:n.y,
                d:tile.d + 1
            });
        }
    }
}

module.exports.analyzeRoom = function(room){

    const mem = room.memory;

    if (mem.plan)
        return
    

    const core = findBestCore(room);
    if (core) {
        mem.plan = {
            corePos = {
                x: core.x,
                y: core.y,
            },
            structures: {},
            occupied: {},
            spatialJob: {}
        }
        console.log("BEST CORE:",core);
    } else {
        console.log("Abort analysing room. No Best Core found...");
        return;
    }

    runPlanner(room, core);
};