module.exports =
// RDN-WETH
{
  // RDN
  tokenA: {
    address: '0x7e2331beaec0ded82866f4a1388628322c8d5af0',
    funding: 0
  },
  // WETH
  tokenB: {
    address: '0xc778417e063141139fce010982780140aa0cd5ab',
    funding: 9.5
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 500
  }
}
