const formatUtil = require('../../helpers/formatUtil')
const _tokenPairSplit = formatUtil.tokenPairSplit

const addCacheHeader = require('../helpers/addCacheHeader')

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_MAX_PAGE_SIZE = 50

const DEFAULT_NUMBER_OF_AUCTIONS = 9
const DEFAULT_ORACLE_TIME = 0
const DEFAULT_MAXIMUM_TIME_PERIOD = 388800 // '4.5 days'
const DEFAULT_REQUIRED_WHITELISTED = true

function createRoutes ({ dxInfoService, reportService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : DEFAULT_PAGE_SIZE
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.getMarkets({ count })
    }
  })

  routes.push({
    path: '/:tokenPair/state',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getState(tokenPair)
    }
  })

  // TODO DEPRECATED transitioning to markets/{tokenPair}/prices/running
  routes.push({
    path: '/:tokenPair/price',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getCurrentPrice(tokenPair)
    }
  })

  routes.push({
    path: '/:tokenPair/prices/running',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getCurrentPrice(tokenPair)
    }
  })

  // TODO DEPRECATED. Transition to markets/{tokenPair}/prices/closing
  routes.push({
    path: '/:tokenPair/closing-prices',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let count = req.query.count !== undefined ? req.query.count : DEFAULT_PAGE_SIZE
      if (!_isValidCount(count)) {
        const error = new Error('Invalid count for closing prices. Count should be between 1 and 50.')
        error.type = 'INVALID_COUNT'
        error.status = 412
        throw error
      }
      let params = Object.assign(
        tokenPair, { count: count }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getLastClosingPrices(params)
    }
  })

  routes.push({
    path: '/:tokenPair/prices/closing',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let count = req.query.count !== undefined ? req.query.count : DEFAULT_PAGE_SIZE
      if (!_isValidCount(count)) {
        const error = new Error('Invalid count for closing prices. Count should be between 1 and 50.')
        error.type = 'INVALID_COUNT'
        error.status = 412
        throw error
      }
      let params = Object.assign(
        tokenPair, { count: count }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getLastClosingPrices(params)
    }
  })

  // TODO DEPRECATED. Transition to markets/{tokenPair}/prices/closing/{auctionIndex}
  routes.push({
    path: '/:tokenPair/closing-prices/:auctionIndex',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getClosingPrice(params)
    }
  })

  routes.push({
    path: '/:tokenPair/prices/closing/:auctionIndex',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getClosingPrice(params)
    }
  })

  routes.push({
    path: '/:token-WETH/prices/safe-median',
    get (req, res) {
      const token = req.params.token
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getOraclePrice({ token })
    }
  })

  routes.push({
    path: '/:token-WETH/prices/custom-median',
    get (req, res) {
      const token = req.params.token
      const time = req.query.time !== undefined
        ? req.query.time : DEFAULT_ORACLE_TIME
      const maximumTimePeriod = req.query.maximumTimePeriod !== undefined
        ? req.query.maximumTimePeriod : DEFAULT_MAXIMUM_TIME_PERIOD
      const requireWhitelisted = req.query.requireWhitelisted !== undefined
        ? req.query.requireWhitelisted : DEFAULT_REQUIRED_WHITELISTED
      const numberOfAuctions = req.query.numberOfAuctions !== undefined
        ? req.query.numberOfAuctions : DEFAULT_NUMBER_OF_AUCTIONS
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getOraclePriceCustom({ token, time, maximumTimePeriod, requireWhitelisted, numberOfAuctions })
    }
  })

  routes.push({
    path: '/:token-WETH/prices/simple-median/:auctionIndex',
    get (req, res) {
      const token = req.params.token
      const auctionIndex = req.params.auctionIndex
      const numberOfAuctions = req.query.numberOfAuctions !== undefined
        ? req.query.numberOfAuctions : DEFAULT_NUMBER_OF_AUCTIONS
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getOraclePricesAndMedian({ token, numberOfAuctions, auctionIndex })
    }
  })

  routes.push({
    path: '/:tokenPair/current-index',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getAuctionIndex(tokenPair)
    }
  })

  routes.push({
    path: '/:tokenPair/auction-start',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getAuctionStart(tokenPair)
    }
  })

  routes.push({
    path: '/:tokenPair/is-valid-token-pair',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.isValidTokenPair(tokenPair)
    }
  })

  routes.push({
    path: '/:tokenPair/extra-tokens/:auctionIndex',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getExtraTokens(params)
    }
  })

  routes.push({
    path: '/:tokenPair/sell-volume',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getSellVolume(tokenPair)
    }
  })

  // TODO check empty response
  routes.push({
    path: '/:tokenPair/sell-volume-next',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getSellVolumeNext(tokenPair)
    }
  })

  routes.push({
    path: '/:tokenPair/buy-volume',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getBuyVolume(tokenPair)
    }
  })

  return routes
}

function _isValidCount (count) {
  return count > 0 && count <= DEFAULT_MAX_PAGE_SIZE
}

module.exports = createRoutes
