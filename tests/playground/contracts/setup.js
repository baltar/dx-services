const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  address,
  accounts,
  web3,
  dx,
  tokens
}) {
  const eth = tokens.ETH
  const startingETH = web3.toWei('50', 'ether')
  // const ethUSDPrice = web3.toWei('1100', 'ether')

  eth.deposit({ from: address, value: startingETH })
  eth.approve(dx.address, startingETH, { from: address })

  /*
  const startingGNO = web3.toWei('50', 'ether')
  gno.transfer(acct, startingGNO, { from: accounts })
  gno.approve(dx.address, startingGNO, { from: accounts })
  */
}
