const KAD = require('pandora-protocol-kad-reference')

const PandoraLocations = require('./pandora-locations/pandora-locations')
const PandoraBox = require('./pandora-box/pandora-box')
const PandoraBoxes = require('./pandora-boxes/pandora-boxes')
const PandoraBoxMetaHelper = require('./pandora-box/meta/pandora-box-meta-helper')
const KADPluginStreamliner = require('./kad-plugins/kad-plugin-streamliner')
const KADPluginPandoraBox = require('./kad-plugins/kad-plugin-pandora-box')

module.exports = class PandoraProtocolNode extends KAD.KademliaNode {

    constructor( index = '', plugins = [], options = {} ) {

        super( index, [
            KAD.plugins.PluginStoreValue,
            KAD.plugins.PluginStoreSortedList,
            KAD.plugins.PluginContactType,
            KAD.plugins.PluginNodeHTTP,
            KAD.plugins.PluginNodeWebSocket,
            KAD.plugins.PluginContactEncrypted,
            KAD.plugins.PluginContactRendezvous,
            KAD.plugins.PluginReverseConnection,
            KAD.plugins.PluginNodeWebRTC,
            KAD.plugins.PluginContactSpartacus,
            KAD.plugins.PluginContactSybilProtect,
            KADPluginStreamliner,
            KADPluginPandoraBox,
            ...plugins,
        ], options);

        this.locations = new PandoraLocations(this, index);
        this.pandoraBoxes = new PandoraBoxes(this);

    }

    async start(){
        const out = await super.start(...arguments);
        this.pandoraBoxes.startStreamlining();

        return out;
    }

    stop(){
        super.stop(...arguments);
        this.pandoraBoxes.stopStreamlining();
    }

    async seedPandoraBox( location, name, description, categories, chunkSize = 1*512*1024, cbProgress ){

        const pandoraBox = await this.locations.createPandoraBox( location,  name, description, categories, chunkSize, cbProgress);

        const initialized = await pandoraBox.streamliner.initialize();

        const stored = await this.pandoraBoxes.addPandoraBox( pandoraBox, true);

        return {
            pandoraBox,
            stored,
        }

    }

    findPandoraBox( hash, ){

        if (this.pandoraBoxes.boxesMap[ hash.toString('hex') ])
            return this.pandoraBoxes.boxesMap[ hash.toString('hex') ];

        return this.crawler.iterativeFindPandoraBox( hash )

    }

    async getPandoraBox(hash){

        const pandoraBox = await this.findPandoraBox(hash);

        if (!pandoraBox) throw 'PandoraBox was not found'

        const added = await this.pandoraBoxes.addPandoraBox( pandoraBox, true);

        return {
            pandoraBox,
            added,
        };
    }

    findPandoraBoxesByName(name){
        return this.crawler.iterativeFindPandoraBoxesByName(name);
    }

    async initializeNode(opts){

        const result = await super.initializeNode(opts);

        await this.pandoraBoxes.saveManager.load( );

        return result;

    }

}