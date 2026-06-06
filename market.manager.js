function run() {
    if (Game.time % 20 === 0) {
        const fromRoom = "W36S38";
        const resourceType = RESOURCE_ENERGY;
        const amount = 1000;

        // ==============================
        // 1. BEST SELL ORDER (BUY ENERGY)
        // ==============================
        const sellOrders = Game.market.getAllOrders(o =>
            o.type === ORDER_SELL &&
            o.resourceType === resourceType
        );

        const bestSell = _.min(sellOrders, o => {

            const qty = Math.min(amount, o.remainingAmount);

            const transferCost = Game.market.calcTransactionCost(qty, fromRoom, o.roomName);

            const cost = (o.price * qty) + transferCost;

            return cost;
        });

        // énergie réellement obtenue après coût
        let effectiveEnergy = 0;
        let buyCost = 0;

        if (bestSell) {
            const qty = Math.min(amount, bestSell.remainingAmount);

            buyCost = (bestSell.price * qty)
                + Game.market.calcTransactionCost(qty, fromRoom, bestSell.roomName);

            effectiveEnergy = qty - Game.market.calcTransactionCost(qty, fromRoom, bestSell.roomName);
        }

        // ==============================
        // 2. BEST BUY ORDER (SELL ENERGY)
        // ==============================
        const buyOrders = Game.market.getAllOrders(o =>
            o.type === ORDER_BUY &&
            o.resourceType === resourceType
        );

        const bestBuy = _.max(buyOrders, o => {

            const qty = Math.min(effectiveEnergy, o.remainingAmount);

            const transferCost = Game.market.calcTransactionCost(qty, fromRoom, o.roomName);

            const revenue = (o.price * qty) - transferCost;

            return revenue;
        });

        // ==============================
        // 3. FINAL PROFIT
        // ==============================
        if (bestSell && bestBuy) {

            const sellQty = Math.min(amount, bestSell.remainingAmount);
            const buyQty = Math.min(effectiveEnergy, bestBuy.remainingAmount);

            const finalSellRevenue =
                (bestBuy.price * buyQty)
                - Game.market.calcTransactionCost(buyQty, fromRoom, bestBuy.roomName);

            const initialCost =
                (bestSell.price * sellQty)
                + Game.market.calcTransactionCost(sellQty, fromRoom, bestSell.roomName);

            const profit = finalSellRevenue - initialCost;

            console.log(
        `MARKET ARBITRAGE
        BUY ENERGY FROM SELL ORDER:
        id:${bestSell.id}
        cost:${initialCost}
        energy:${effectiveEnergy}

        SELL ENERGY TO BUY ORDER:
        id:${bestBuy.id}
        revenue:${finalSellRevenue}

        PROFIT:${profit}`
            );
        }
    }
}

module.exports = {
    run
}