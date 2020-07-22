const KadPluginPandoraBoxKademliaCrawler = require('./kad-plugin-pandora-box-kademlia-crawler')
const KadPluginPandoraBoxKademliaRules = require('./kad-plugin-pandora-box-kademlia-rules')

module.exports = function(kademliaNode) {

    KadPluginPandoraBoxKademliaCrawler(kademliaNode.crawler);
    KadPluginPandoraBoxKademliaRules(kademliaNode.rules);

        return {
            name: "PluginPandoraBox",
            version: "0.1",
            success: true,
        }

}