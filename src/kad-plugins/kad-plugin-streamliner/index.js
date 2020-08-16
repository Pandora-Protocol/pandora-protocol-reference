const KADPluginStreamlinerKademliaRules = require('./kad-plugin-streamliner-kademlia-rules')
const KADPluginStreamlinerKademliaCrawler = require('./kad-plugin-streamliner-kademlia-crawler')
const KADPluginStreamlinerKademliaContact = require('./kad-plugin-streamliner-kademlia-contact')

module.exports = {

    plugin: function (kademliaNode, options) {

        options.Contact = KADPluginStreamlinerKademliaContact(options);
        options.Crawler = KADPluginStreamlinerKademliaCrawler(options);
        options.Rules = KADPluginStreamlinerKademliaRules(options);

        return {
            name: "PluginStreamliner",
            version: "0.1",
            success: true,
        }

    }

}