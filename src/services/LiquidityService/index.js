const LiquidityService = require('./LiquidityService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getPriceRepo = require('../../repositories/PriceRepo')

let instance, instancePromise

async function _getInstance () {
  const [auctionRepo, ethereumRepo, priceRepo] = await Promise.all([
    getAuctionRepo(),
    getEthereumRepo(),
    getPriceRepo()
  ])

  return new LiquidityService({
    auctionRepo,
    ethereumRepo,
    priceRepo,

    // TODO: Review, I think this should be moved to the bots
    buyLiquidityRulesDefault: conf.BUY_LIQUIDITY_RULES_DEFAULT
  })
}

module.exports = async () => {
  if (!instance) {
    if (!instancePromise) {
      instancePromise = _getInstance()
    }

    instance = await instancePromise
  }

  return instance
}
