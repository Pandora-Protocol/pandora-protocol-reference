const PandoraProtocolNode = require('./src/pandora-protocol-node')
const Config = require('./src/config')
const KAD = require('pandora-protocol-kad-reference')

module.exports = {

    init(config ={} ) {

        global.PANDORA_PROTOCOL_OPTIONS = KAD.helpers.Utils.mergeDeep(Config, config);

    },

    PandoraProtocolNode,
    KAD,
}