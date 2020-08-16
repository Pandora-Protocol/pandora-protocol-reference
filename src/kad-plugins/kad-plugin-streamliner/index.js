const KADPluginStreamlinerKademliaRules = require('./kad-plugin-streamliner-kademlia-rules')
const KADPluginStreamlinerKademliaCrawler = require('./kad-plugin-streamliner-kademlia-crawler')

module.exports = {

    plugin: function (kademliaNode, options) {

        options.Crawler = KADPluginStreamlinerKademliaCrawler(options);
        options.Rules = KADPluginStreamlinerKademliaRules(options);

        return {
            name: "PluginStreamliner",
            version: "0.1",
            success: true,
        }

    }

}