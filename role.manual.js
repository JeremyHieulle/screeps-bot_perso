module.exports = {

    run: function(creep, job) {
        const src = Game.getObjectById('6a0ad338d24ff788d2d5610a')
        const dst = Game.getObjectById('6a1fd136126dff43ffc9c540')
        
        creep.toggleWorkingState()
        
        if (creep.memory.working) {
            creep.myTransfer(dst)
        } else {
            creep.myWithdraw(src)
        }
    }
}