const KAD = require('pandora-protocol-kad-reference')
const PandoraLocations = require('./pandora-locations/pandora-locations')
const PandoraBox = require('./pandora-box/pandora-box')
const PandoraBoxes = require('./pandora-boxes/pandora-boxes')

const KADPluginStreamliner = require('./kad-plugins/kad-plugin-streamliner/kad-plugin-streamliner')
const KADPluginPandoraBox = require('./kad-plugins/kad-plugin-pandora-box/kad-plugin-pandora-box')

module.exports = class PandoraNode extends KAD.KademliaNode {

    constructor( plugins = [], contactArgs = {}, store, options = {}, directoryPrefix) {

        super( [
            KAD.plugins.PluginSortedList.plugin,
            KAD.plugins.PluginKademliaNodeMock.plugin,
            KAD.plugins.PluginKademliaNodeHTTP.plugin,
            KAD.plugins.PluginKademliaNodeWebSocket.plugin,
            KAD.plugins.PluginContactEncrypted.plugin,
            KAD.plugins.PluginContactSpartacus.plugin,
            KAD.plugins.PluginContactSybilProtect.plugin,
            KADPluginStreamliner,
            KADPluginPandoraBox,
            ...plugins,
        ], contactArgs, store, options);

        this.locations = new PandoraLocations(this, directoryPrefix);
        this.pandoraBoxes = new PandoraBoxes(this);

    }

    start(){
        super.start(...arguments);
        this.pandoraBoxes.startStreamlining();
    }

    stop(){
        super.stop(...arguments);
        this.pandoraBoxes.stopStreamlining();
    }

    seedPandoraBox( location, name, description, chunkSize = 32*1024, cb ){

        this.locations.createPandoraBox( location,  name, description, chunkSize, (err, pandoraBox )=>{

            if (err) return cb(err, null);

            this.crawler.iterativeStorePandoraBox( pandoraBox, (err, out)=> {

                if (err) return cb(err, null);

                this.crawler.iterativeStorePandoraBoxPeer( pandoraBox.hash, this.contact, new Date().getTime(), (err, out2)=>{

                    if (err) return cb(err, null);

                    this.pandoraBoxes.addPandoraBox( pandoraBox );

                    cb(null, {
                        pandoraBox,
                        stored: out,
                        storedContact: out2,
                    })

                } );

            });

        });

    }

    findPandoraBox( hash, cb ){

        this.crawler.iterativeFindPandoraBox( hash, cb )

    }

    getPandoraBox(hash, cb){

        this.findPandoraBox(hash, (err, pandoraBox )=>{

            if (err) return cb(err);

            this.crawler.iterativeFindPandoraBoxPeersList( pandoraBox.hash, (err, peers ) =>{

                if (err) return cb(err, null);

                this.crawler.iterativeStorePandoraBoxPeer( pandoraBox.hash, this.contact, new Date().getTime(), (err, out2)=>{

                    if (err) return cb(err, null);

                    pandoraBox.streamliner.peers = peers;
                    this.pandoraBoxes.addPandoraBox( pandoraBox );

                    cb(null, {
                        pandoraBox,
                    })

                });

            } );

        });

    }

    searchPandoraBoxByName(name){

    }

}