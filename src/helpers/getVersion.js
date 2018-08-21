const debug = require('debug')('DEBUG-dx-services:util:version')

function getVersion () {
  let packageJson = require('../../package.json')
  debug('[getVersion] Version %s', packageJson.version)
  return packageJson.version
}

module.exports = getVersion
