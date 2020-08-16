const KadPluginPandoraBoxKademliaCrawler = require('./kad-plugin-pandora-box-kademlia-crawler')
const KadPluginPandoraBoxKademliaRules = require('./kad-plugin-pandora-box-kademlia-rules')

module.exports =  {

    plugin: function(kademliaNode, options) {

        options.Crawler = KadPluginPandoraBoxKademliaCrawler(options);
        options.Rules = KadPluginPandoraBoxKademliaRules(options);

        return {
            name: "PluginPandoraBox",
            version: "0.1",
            success: true,
        }
    }

}