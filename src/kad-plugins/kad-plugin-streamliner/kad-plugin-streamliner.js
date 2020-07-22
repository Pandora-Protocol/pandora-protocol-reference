const KADPluginStreamlinerKademliaRules = require('./kad-plugin-streamliner-kademlia-rules')
const KADPluginStreamlinerKademliaCrawler = require('./kad-plugin-streamliner-kademlia-crawler')

module.exports = function (kademliaNode){
    KADPluginStreamlinerKademliaCrawler(kademliaNode.crawler);
    KADPluginStreamlinerKademliaRules(kademliaNode.rules);

    return {
        name: "PluginStreamliner",
        version: "0.1",
        success: true,
    }

}