const PandoraBoxStreamliner = require('../../box/streamliner/pandora-box-streamliner')
const PandoraBoxMetaHelper = require('../../../pandora-box/meta/pandora-box-meta-helper')

module.exports = class PandoraBoxSybilStreamliner extends PandoraBoxStreamliner {

    createPandoraBoxMetaBox(){
        this.pandoraBoxMeta = this._pandoraBox.convertToPandoraBoxMeta();
        this.pandoraBoxMeta.autoSave = true;
    }

    async initializeStreamliner( ){

        try{

            console.log("initialize", this._pandoraBox._name, this._pandoraBox.hashHex, this._kademliaNode.contact.identityHex);

            const {words, subsets} =  PandoraBoxMetaHelper.computePandoraBoxMetaNameSubsets(this._pandoraBox._name);
            this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/crawler/store/count-operations', {hash: this._pandoraBox.hash, count: subsets.length + 3 });

            let out = await this._kademliaNode.crawler.iterativeStorePandoraBox( this._pandoraBox );
            if (!out) return;

            this._kademliaNode.pandoraBoxes.emit('pandora-box/crawler/store/by-hash', {hash: this._pandoraBox.hash, status: "stored"});

            out = await this.pandoraBoxMeta.publishPandoraBoxMetaSybil(subsets, words);
            if (!out) return;

            this._initialized = new Date().getTime();

            return true;

        }catch(err){

        }

    }

}