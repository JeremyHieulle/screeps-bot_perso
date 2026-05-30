const handlers = {
    harvester: require('role.harvester'),
    hauler: require('role.hauler'),
    builder: require('role.builder'),
    upgrader: require('role.upgrader'),
    healer: require('role.healer'),
    drainer: require('role.drainer'),
    drainerHealer: require('role.drainerHealer'),
    remoteHauler: require('role.remote.hauler'),
    remoteBuilder: require('role.remote.builder'),
    remoteMiner: require('role.remote.miner'),
    remoteReserver: require('role.remote.reserver'),
    attacker: require('role.attacker'),
    manual: require('role.manual'),
    scout: require('role.scout'),
    manager: require('role.manager')
};

module.exports = handlers;