const debug = require('debug')('DEBUG-dx-service:repositories:AuctionRepoMock')
const BigNumber = require('bignumber.js')

const auctionsMockData = require('../../../tests/data/auctions')
// const auctions = auctionsMockData.auctions
// const pricesInUSD = auctionsMockData.pricesInUSD

const balances = {
  'RDN': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': 517.345, // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': 30.20,   // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': 1000.0,  // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': 601.112  // Dani
  },
  'ETH': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': 3.44716, // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': 2.23154, // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': 3.88130, // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': 4.01234  // Dani
  },
  'OMG': {
    '0x424a46612794dbb8000194937834250Dc723fFa5': 267.345, // Anxo
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': 15.20,   // Pepe
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': 500.0,   // Ganache
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': 301.112  // Dani
  }
}

class AuctionRepoMock {
  constructor ({
    auctions,
    pricesInUSD
  }) {
    this._auctions = auctions || auctionsMockData.auctions
    this._pricesInUSD = pricesInUSD || auctionsMockData.pricesInUSD
    this._tokens = {ETH: '', RDN: '', OMG: ''}
  }

  async getAbout () {
    debug('Get auction basic info')
    return {
      network: 'http://localhost:8545',
      ownerAddress: '0x424a46612794dbb8000194937834250Dc723fFa5',
      exchageAddress: '0x1223'
    }
  }

  async getStateInfo ({ sellToken, buyToken }) {
    debug('Get state info for %s-%s', sellToken, buyToken)
    const auctionIndex = await this.getAuctionIndex({ sellToken, buyToken })

    let auctionStart, auction, auctionOpp
    if (auctionIndex === 0) {
      // The token pair doesn't exist
      auctionStart = null
      auction = null
      auctionOpp = null
    } else {
      auctionStart = await this.getAuctionStart({ sellToken, buyToken })
      let [ auctionState, auctionOppState ] = await Promise.all([
        this._getAuctionState({ sellToken, buyToken, auctionIndex }),
        this._getAuctionState({ sellToken: buyToken, buyToken: sellToken, auctionIndex })
      ])
      auction = auctionState
      auctionOpp = auctionOppState
    }
    return {
      auctionIndex,
      auctionStart,

      auction,
      auctionOpp
    }
  }

  async getState ({ sellToken, buyToken }) {
    const {
      auctionIndex,
      auctionStart,
      auction,
      auctionOpp
    } = await this.getStateInfo({ sellToken, buyToken })

    if (auctionIndex === 0) {
      return 'UNKNOWN_TOKEN_PAIR'
    } else {
      const {
        isClosed,
        isTheoreticalClosed,
        sellVolume
      } = auction

      const {
        isClosed: isClosedOpp,
        isTheoreticalClosed: isTheoreticalClosedOpp,
        sellVolume: sellVolumeOpp
      } = auctionOpp

      const now = await this._getTime()
      if (auctionStart === null) {
        // We havent surplus the threshold (or it's the first auction)
        return 'WAITING_FOR_FUNDING'
      } else if (auctionStart >= now) {
        return 'WAITING_FOR_AUCTION_TO_START'
      } else if (
        (isTheoreticalClosed && !isClosed) ||
        (isTheoreticalClosedOpp && !isClosedOpp)) {
        return 'PENDING_CLOSE_THEORETICAL'
      } else if (
        // If one side is closed (by clearing, not by having no sellVolume)
        (isClosed && !sellVolume.isZero() && !isClosedOpp) ||
        (!isClosed && isClosedOpp && !sellVolumeOpp.isZero())) {
        return 'ONE_AUCTION_HAS_CLOSED'
      } else {
        return 'RUNNING'
      }
    }
  }

  async getAuctionIndex ({ sellToken, buyToken }) {
    debug('Get current auction index for %s-%s', sellToken, buyToken)

    // latestAuctionIndex
    return this._getAuction({ sellToken, buyToken }).index
  }

  async getAuctionStart ({ sellToken, buyToken }) {
    debug('Get auction start for %s-%s', sellToken, buyToken)
    // auctionStarts
    return this._getAuction({ sellToken, buyToken }).auctionStart
  }

  async _getClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).closingPrice
  }

  async isApprovedToken ({ token }) {
    debug('Check isApprovedToken %s', token)
    const elementIndex = this._pricesInUSD.findIndex(price => {
      return price.token === token
    })
    return elementIndex >= 0
  }

  async isApprovedMarket ({ tokenA, tokenB }) {
    debug('CHeck is approved market %s-%s', tokenA, tokenB)

    const auctionIndex = await this.getAuctionIndex({
      sellToken: tokenA,
      buyToken: tokenB
    })

    return auctionIndex > 0
  }

  async getSellVolume ({ sellToken, buyToken }) {
    debug('Get sell volume for %s-%s', sellToken, buyToken)
    // sellVolumesCurrent
    return this._getAuction({ sellToken, buyToken }).sellVolume
  }

  async getSellVolumeNext ({ sellToken, buyToken }) {
    debug('Get sell volume next for %s-%s', sellToken, buyToken)
    // sellVolumesNext
    return this._getAuction({ sellToken, buyToken }).sellVolumeNext
  }

  async getBuyVolume ({ sellToken, buyToken }) {
    debug('Get buy volume for %s-%s', sellToken, buyToken)
    return this._getAuction({ sellToken, buyToken }).buyVolume
  }

  async getBalances ({ accountAddress }) {
    debug('Get balances for %s', accountAddress)

    const balancePromises =
      // for every token
      Object.keys(this._tokens)
        // get it's balance
        .map(async token => {
          const amount = await this.getBalance({ token, accountAddress })
          return { token, amount }
        })

    return Promise.all(balancePromises)
  }

  async getBalance ({ token, accountAddress }) {
    debug('Get balance of %s for %s', token, accountAddress)
    // balances
    return balances[token][accountAddress]
  }

  async getSellerBalance ({ sellToken, buyToken, address }) {
    debug('Get seller (%s) balance for %s-%s', address, sellToken, buyToken)
    // sellerBalances
    this._notImplementedYet()
  }

  async getBuyerBalance ({ sellToken, buyToken, address }) {
    debug('Get buyer (%s) balance for %s-%s', address, sellToken, buyToken)
    this._notImplementedYet()
  }

  async getFundingInUSD ({ tokenA, tokenB, auctionIndex }) {
    debug('Get funding in USD for %s-%s', tokenA, tokenB)

    const sellVolumeA = this._getAuction({ sellToken: tokenA, buyToken: tokenB }).sellVolume
    const sellVolumeB = this._getAuction({ sellToken: tokenB, buyToken: tokenA }).sellVolume

    const fundingA = this.getPriceInUSD({
      token: tokenA,
      amount: sellVolumeA
    })

    const fundingB = this.getPriceInUSD({
      token: tokenB,
      amount: sellVolumeB
    })
    debug('Auction funding is: %s-%s', fundingA, fundingB)

    return {
      fundingA,
      fundingB
    }
  }

  async getPriceFromUSDInTokens ({token, amountOfUsd}) {
    const ethUsdPrice = await this.getPriceEthUsd()
    debug('Eth/Usd Price for %s: %d', token, ethUsdPrice)
    let amountInEth = amountOfUsd.div(ethUsdPrice)

    let amountInToken
    if (token === 'ETH') {
      amountInToken = amountInEth
    } else {
      const priceTokenEth = await this.getPriceInEth({ token })
      debug('Price of token %s in ETH: %d', token,
        priceTokenEth.numerator.div(priceTokenEth.denominator))
      amountInToken = amountInEth
        .mul(priceTokenEth.denominator)
        .div(priceTokenEth.numerator)
    }

    return amountInToken.mul(1e18)
  }

  async getPriceEthUsd () {
    const price = this._pricesInUSD.find(price => {
      return price.token === 'ETH'
    })

    return new BigNumber(price.price)
  }

  async deposit ({ token, amount }) {
    debug('Deposit %d %s', token, amount)
    this._notImplementedYet()
  }

  async withdraw ({ token, amount }) {
    debug('Withdraw %d %s', token, amount)
    this._notImplementedYet()
  }

  async postSellOrder ({
    sellToken, buyToken, auctionIndex, from, amount
  }) {
    debug(
      'Sell %d %s using %s for auction %d',
      amount, buyToken,
      sellToken,
      auctionIndex
    )

    let auction = this._auctions[sellToken + '-' + buyToken]
    let newSellVolume = auction.sellVolume.add(amount)
    Object.assign(auction.sellVolume, newSellVolume)

    return amount
  }

  async postBuyOrder ({ sellToken, buyToken, auctionIndex, amount }) {
    debug(
      'Buy %d %s using %s for auction %d',
      amount, buyToken,
      sellToken,
      auctionIndex
    )

    let auction = this._auctions[sellToken + '-' + buyToken]
    let newBuyVolume = auction.buyVolume.add(amount)
    Object.assign(auction.buyVolume, newBuyVolume)

    return amount
  }

  async claimSellerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    debug('Claim seller (%s) funds for auction %s-%s (%d)',
      address, sellToken, buyToken, auctionIndex)
    // claimSellerFunds
    this._notImplementedYet()
  }

  async claimBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    debug('Claim buyer (%s) funds for auction %s-%s (%d)',
      address, sellToken, buyToken, auctionIndex)
    // claimBuyerFunds
    this._notImplementedYet()
  }

  async getUnclaimedBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    debug('Get unclaimed buyer (%s) funds for auction %s-%s (%d)',
      address, sellToken, buyToken, auctionIndex)
    // getUnclaimedBuyerFunds
    this._notImplementedYet()
  }

  async getOutstandingVolume ({ sellToken, buyToken, auctionIndex }) {
    // const state = this.getState({ sellToken, buyToken, auctionIndex })

    const sellVolume = await this.getSellVolume({
      sellToken,
      buyToken
    })

    const buyVolume = await this.getBuyVolume({
      sellToken,
      buyToken
    })

    const price = await this.getCurrentAuctionPrice({
      sellToken,
      buyToken,
      auctionIndex
    })

    const sellVolumeInBuyTokens = sellVolume
      .mul(price.numerator)
      .div(price.denominator)

    const outstandingVolume = sellVolumeInBuyTokens.minus(buyVolume)
    return outstandingVolume.lessThan(0) ? 0 : outstandingVolume
  }

  async getCurrentAuctionPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get price for auction %d %s-%s', auctionIndex, buyToken, sellToken)
    return { numerator: new BigNumber(10), denominator: new BigNumber(233) }
    // this._notImplementedYet()
  }

  async getPastAuctionPrice ({ sellToken, buyToken, auctionIndex }) {
    debug('Get price for past auction %d %s-%s', auctionIndex, buyToken, sellToken)
    return { numerator: new BigNumber(10), denominator: new BigNumber(233) }
  }

  async getClosingPrices ({ sellToken, buyToken, auctionIndex }) {
    debug('Get closing price for auction %d %s-%s', auctionIndex, sellToken, buyToken)

    const auction = this._getAuction({ sellToken, buyToken })
    if (auction.buyVolume < auction.sellVolume) {
      return null
    } else {
      return { numerator: new BigNumber(10), denominator: new BigNumber(233) }
    }
  }

  _notImplementedYet () {
    throw new Error('Not implemented yet!')
  }

  async _getAuctionState ({ sellToken, buyToken, auctionIndex }) {
    debug('Get auction state for auction %d', auctionIndex)

    const buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    const sellVolume = await this.getSellVolume({ sellToken, buyToken })

    const price = await this.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
    let isTheoreticalClosed = null
    if (price) {
      // (Pn x SV) / (Pd x BV)
      // example:
      isTheoreticalClosed = price.numerator
        .mul(sellVolume)
        .sub(price.denominator
          .mul(buyVolume)
        ).toNumber() === 0
    } else {
      isTheoreticalClosed = false
    }

    const closingPrice = await this.getClosingPrices({
      sellToken, buyToken, auctionIndex
    })

    // There's to ways a auction can be closed
    //  (1) Because it has cleared, so it has a closing price
    //  (2) Because when the auction started, it didn't have sellVolume, so i
    //      is considered, autoclosed since the start
    let isClosed
    if (sellVolume.isZero()) {
      const auctionStart = await this.getAuctionStart({ sellToken, buyToken })
      const now = await this._getTime()

      // closed if sellVolume=0 and the auction has started and hasn't been cleared
      isClosed = auctionStart && auctionStart < now
    } else {
      isClosed = closingPrice !== null
    }

    return {
      buyVolume,
      sellVolume,
      closingPrice,
      isClosed,
      isTheoreticalClosed
    }
  }

  async _getTime () {
    return new Date()
  }

  _getAuction ({ sellToken, buyToken }) {
    return this._auctions[sellToken + '-' + buyToken]
  }

  getPriceInUSD ({ token, amount }) {
    const price = this._pricesInUSD.find(price => {
      return price.token === token
    }).price
    debug('Price in USD for %s: %s', token, price)

    return amount.mul(price).div(1e18)
  }

  _toWei (amount) {
    return amount * 1e18
  }
}

module.exports = AuctionRepoMock
