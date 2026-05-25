module.exports = function(global) {

    global.isAlly = function(username) {

        if (!username) return false;

        const entry = Memory.diplomacy?.[username];

        if (!entry) return false;

        return entry.alliance === true &&
            entry.status === "safe";
    }

};