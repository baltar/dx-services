const NETWORKS = require('../../node_modules/@gnosis.pm/dx-contracts/networks.json')
const NETWORKS_DEV = require('../../node_modules/@gnosis.pm/dx-contracts/networks-dev.json')

const env = process.env.NODE_ENV
let DX_CONTRACT_ADDRESS, RDN_TOKEN_ADDRESS, OMG_TOKEN_ADDRESS

// In Rinkeby we use different instances of the contract for dev and staging
if (env === 'pre' || env === 'pro') {
  // Rinkeby: staging
  //  We use set all addresses to null, because they should be provided
  //  The DX contract address is loaded from the NPM package
  DX_CONTRACT_ADDRESS = null
  RDN_TOKEN_ADDRESS = null
  OMG_TOKEN_ADDRESS = null
} else if (env === 'dev') {
  // Rinkeby: dev
  //  We use a different DX contract than the one defined in the NPM package
  DX_CONTRACT_ADDRESS = NETWORKS_DEV['DutchExchangeProxy']['4'].address
  RDN_TOKEN_ADDRESS = '0x7e2331beaec0ded82866f4a1388628322c8d5af0'
  OMG_TOKEN_ADDRESS = '0xc57b5b272ccfd0f9e4aa8c321ec22180cbb56054'
} else {
  // Rinkeby: local
  DX_CONTRACT_ADDRESS = null
  RDN_TOKEN_ADDRESS = '0x7e2331beaec0ded82866f4a1388628322c8d5af0'
  OMG_TOKEN_ADDRESS = '0xc57b5b272ccfd0f9e4aa8c321ec22180cbb56054'
}

module.exports = {
  NETWORK: 'rinkeby', // 4
  ETHEREUM_RPC_URL: 'https://rinkeby.infura.io',

  // Tokens
  DX_CONTRACT_ADDRESS,
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS
}
