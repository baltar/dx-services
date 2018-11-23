const { DX_BOTS_DEV_CHANNEL } = require('../slackChannels')
const { MARKETS } = require('../developConstants')

module.exports = {
  ENVIRONMENT: 'dev',
  MARKETS,

  SLACK_CHANNEL_DX_BOTS: DX_BOTS_DEV_CHANNEL,
  SLACK_CHANNEL_BOT_FUNDING: DX_BOTS_DEV_CHANNEL,
  SLACK_CHANNEL_AUCTIONS_REPORT: DX_BOTS_DEV_CHANNEL,

  DEFAULT_GAS_PRICE_USED: process.env.DEFAULT_GAS_PRICE_USED || 'safeLow'
}
