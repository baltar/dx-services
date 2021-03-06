const loggerNamespace = 'dx-service:bots:ClaimBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const schedule = require('node-schedule')

const BOT_TYPE = 'ClaimBot'
const getEthereumClient = require('../helpers/ethereumClient')
const getDxInfoService = require('../services/DxInfoService')
const getDxTradeService = require('../services/DxTradeService')
const getSlackRepo = require('../repositories/SlackRepo')

class ClaimBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    markets,
    notifications,
    cronSchedule,
    autoClaimAuctions
  }) {
    super(name, BOT_TYPE)
    assert(markets, 'markets is required')
    assert(notifications, 'notifications is required')
    assert(cronSchedule, 'cronSchedule is required')
    assert(autoClaimAuctions, 'autoClaimAuctions are required')

    if (botAddress) {
      // Config using bot address
      assert(botAddress, 'botAddress is required')
      this._botAddress = botAddress
    } else {
      // Config using bot account address
      assert(accountIndex !== undefined, '"botAddress" or "accountIndex" is required')
      this._accountIndex = accountIndex
    }

    // If notification has slack, validate
    const slackNotificationConf = notifications.find(notificationType => notificationType.type === 'slack')
    if (slackNotificationConf) {
      assert(slackNotificationConf.channel, 'Slack notification config required the "channel"')
    }

    this._markets = markets
    this._notifications = notifications
    this._cronSchedule = cronSchedule
    this._autoClaimAuctions = autoClaimAuctions

    this._lastCheck = null
    this._lastClaim = null
    this._lastError = null
  }

  async _doInit () {
    logger.debug('Init Claim Bot: ' + this.name)
    const [
      ethereumClient,
      dxInfoService,
      dxTradeService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getDxInfoService(),
      getDxTradeService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._slackRepo = slackRepo

    // Get bot address
    await this.setAddress()
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check if the bots need to claim with cron schedule
    this._doClaim()
    this._cronTask = schedule.scheduleJob(this._cronSchedule, () => {
      return this._doClaim()
    })
  }

  async _doStop () {
    this._cronTask.cancel()
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _doClaim () {
    // Execute the claim
    logger.info('Claiming from markets %O using address %s', this._markets, this._botAddress)

    const tokenPairs = this._markets.reduce((markets, { tokenA, tokenB }) => {
      markets.push(
        { sellToken: tokenA, buyToken: tokenB },
        { sellToken: tokenB, buyToken: tokenA })
      return markets
    }, [])
    return this._dxTradeService.claimAll({
      tokenPairs,
      address: this._botAddress,
      lastNAuctions: this._autoClaimAuctions
    }).then(result => {
      const {
        claimAmounts,
        claimSellerTransactionResult,
        claimBuyerTransactionResult
      } = result
      this._lastClaim = new Date()
      logger.info('Claimed for address %s. Result: %o', this._botAddress, claimAmounts)
      if (claimSellerTransactionResult) {
        logger.info('Claim as seller transaction: %s', claimSellerTransactionResult.tx)
      }
      if (claimBuyerTransactionResult) {
        logger.info('Claim as buyer transaction: %s', claimBuyerTransactionResult.tx)
      }

      claimAmounts.forEach(amount => {
        if (amount) {
          this._notifyClaimedTokens(amount, this._markets, this._botAddress)
        }
      })
      return result
    }).catch(error => {
      this._handleError(tokenPairs, this._botAddress, error)
      return 0
    })
  }

  _notifyClaimedTokens (amount, token, account) {
    const { tokenA, tokenB, totalSellerClaims, totalBuyerClaims } = amount
    const tokenPairString = tokenA + '-' + tokenB

    const message = 'The bot claimed for ' + tokenPairString + ': ' +
      totalSellerClaims + ' tokens as seller, ' +
      totalBuyerClaims + ' tokens as buyer'

    // Log message
    logger.info({
      msg: message,
      contextData: {
        extra: {
          totalSellerClaims,
          totalBuyerClaims,
          account
        }
      },
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifyClaimedTokensSlack({
              channel,
              account,
              amount
            })
          }
          break
        case 'email':
        default:
          logger.error({
            msg: 'Error notification type is unknown: ' + type
          })
      }
    })
  }

  _notifyClaimedTokensSlack ({ channel, account, amount }) {
    const { tokenA, tokenB, totalSellerClaims, totalBuyerClaims } = amount

    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'good',
            title: 'The bot has claimed for ' + tokenA + '-' + tokenB,
            text: 'The bot has claimed tokens into the DutchX.',
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Bot account',
                value: account,
                short: false
              }, {
                title: 'Token pair',
                value: tokenA + '-' + tokenB,
                short: false
              }, {
                title: 'Total seller claims',
                value: totalSellerClaims,
                short: false
              }, {
                title: 'Total buyer claims',
                value: totalBuyerClaims,
                short: false
              }
            ],
            footer: this.botInfo
          }
        ]
      })
      .catch(error => {
        logger.error({
          msg: 'Error notifing sold tokens to Slack: ' + error.toString(),
          error
        })
      })
  }

  _handleError (tokenPairs, account, error) {
    // Log message
    logger.error({
      msg: 'There was an error claiming %O with the account %s',
      params: [tokenPairs, account],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      markets: this._markets,
      lastCheck: this._lastCheck,
      lastClaim: this._lastClaim,
      lastError: this._lastError,
      notifications: this._notifications,
      cronSchedule: this._cronSchedule
    }
  }
}

module.exports = ClaimBot
