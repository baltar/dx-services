const formatUtil = require('../../helpers/formatUtil')
const _tokenPairSplit = formatUtil.tokenPairSplit

const getAddress = require('../../helpers/getAddress')
const getDxManagementService = require('../../services/DxManagementService')

const PAIRS_DATA_ROUTE = '../../../tests/data/tokenPairs'
const WORKING_DIR = process.cwd()
const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'local'

function registerCommand ({ cli, logger }) {
  cli.command('add-token-pair [--token-pair token-pair][--file file]', 'Add a new token pair from the mnemonic account. A file has to be provided with token info and initial price info.', yargs => {
    yargs.option('token-pair', {
      type: 'string',
      describe: 'The token pair symbols, i.e. RDN-WETH'
    })
    yargs.option('file', {
      type: 'string',
      describe: 'The file to read the token pairs'
    })
  }, async function (argv) {
    const { tokenPair, file } = argv

    const DEFAULT_ACCOUNT_INDEX = 0
    const [
      account,
      dxManagementService
    ] = await Promise.all([
      getAddress(DEFAULT_ACCOUNT_INDEX),
      getDxManagementService()
    ])

    if (tokenPair) {
      const { sellToken: tokenA, buyToken: tokenB } = _tokenPairSplit(tokenPair)
      let pair
      if (file) {
        pair = require(WORKING_DIR + file)
      } else {
        pair = require(PAIRS_DATA_ROUTE + '/' + NETWORK.toLowerCase() + '/' + tokenPair + '.js')
      }
      if (pair) {
        const { tokenA, tokenB, initialPrice } = pair
        logger.info('Adding a new token pair %s, funding %s with %d and %s with %d, with an initial price of %O using account %s',
          tokenPair, tokenA.address, tokenA.funding, tokenB.address, tokenB.funding, initialPrice, account)

        const result = await _addTokenPair(dxManagementService, {
          from: account, tokenA, tokenB, initialPrice
        })

        logger.info('Successfully added the token pair %s-%s. Transaction : %s', tokenA.address, tokenB.address, result.tx)
      }
    } else {
      let allPairs
      if (file) {
        allPairs = require(WORKING_DIR + file)
      } else {
        allPairs = require(PAIRS_DATA_ROUTE + '/' + NETWORK.toLowerCase() + '/allPairs.js')
      }
      allPairs.forEach(async ({ tokenA, tokenB, initialPrice }) => {
        logger.info('Adding a new token pair, funding %s with %d and %s with %d, with an initial price of %O using account %s',
          tokenA.address, tokenA.funding, tokenB.address, tokenB.funding, initialPrice, account)

        const result = await _addTokenPair(dxManagementService, {
          from: account, tokenA, tokenB, initialPrice
        })

        logger.info('Successfully added the token pair. Transaction : %s', result.tx)
      })
    }
  })
}

async function _addTokenPair (dxManagementService, { from, tokenA, tokenB, initialPrice }) {
  return dxManagementService.addTokenPair({
    from,
    tokenA: tokenA.address,
    tokenAFunding: tokenA.funding * 1e18,
    tokenB: tokenB.address,
    tokenBFunding: tokenB.funding * 1e18,
    initialClosingPrice: initialPrice
  })
}

module.exports = registerCommand
