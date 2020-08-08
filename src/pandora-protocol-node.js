const KAD = require('pandora-protocol-kad-reference')
const PandoraLocations = require('./pandora-locations/pandora-locations')
const PandoraBox = require('./pandora-box/pandora-box')
const PandoraBoxes = require('./pandora-boxes/pandora-boxes')

const KADPluginStreamliner = require('./kad-plugins/kad-plugin-streamliner/kad-plugin-streamliner')
const KADPluginPandoraBox = require('./kad-plugins/kad-plugin-pandora-box/kad-plugin-pandora-box')

module.exports = class PandoraProtocolNode extends KAD.KademliaNode {

    constructor( index = '', plugins = [], contactArgs = {}, store, options = {} ) {

        super( index, [
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

        this.locations = new PandoraLocations(this, index);
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

    seedPandoraBox( location, name, description, chunkSize = 1*1024*1024, cbProgress, cb ){

        this.locations.createPandoraBox( location,  name, description, chunkSize, cbProgress, (err, pandoraBox )=>{

            if (err) return cb(err, null);

            this.crawler.iterativeStorePandoraBox( pandoraBox, (err, out)=> {

                if (err) return cb(err, null);

                this.crawler.iterativeStorePandoraBoxPeer( pandoraBox.hash, this.contact, new Date().getTime(), (err, out2)=>{

                    if (err) return cb(err, null);

                    this.pandoraBoxes.addPandoraBox( pandoraBox, true, (err, out)=>{

                        cb(null, {
                            pandoraBox,
                            stored: out,
                            storedContact: out2,
                        })

                    } );

                } );

            });

        });

    }

    findPandoraBox( hash, cb ){

        if (this.pandoraBoxes.boxesMap[ hash.toString('hex') ])
            return cb(null, this.pandoraBoxes.boxesMap[ hash.toString('hex') ] )

        this.crawler.iterativeFindPandoraBox( hash, cb )

    }

    getPandoraBox(hash, cb){

        this.findPandoraBox(hash, (err, pandoraBox )=>{

            if (err) return cb(err);
            if (!pandoraBox) return cb(new Error('PandoraBox was not found'))

            this.pandoraBoxes.addPandoraBox( pandoraBox, true, (err, out) =>{

                pandoraBox.streamliner.initialize((err, out )=>{

                    cb(null, {
                        pandoraBox,
                        added: out,
                    })

                });

            } );


        });

    }

    searchPandoraBoxByName(name){

    }

    initializeNode(opts, cb){
        super.initializeNode(opts, (err, out)=>{

            if (err) return cb(err);

            this.pandoraBoxes.saveManager.load((err, out)=>{

                cb(err, out);

            });

        })
    }

}