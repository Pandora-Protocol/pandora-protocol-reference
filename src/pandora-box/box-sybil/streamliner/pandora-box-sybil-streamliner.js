const PandoraBoxStreamliner = require('../../box/streamliner/pandora-box-streamliner')


module.exports = class PandoraBoxSybilStreamliner extends PandoraBoxStreamliner {

    createPandoraBoxMetaBox(){
        this.pandoraBoxMeta = this._pandoraBox.convertToPandoraBoxMeta();
    }

    async initialize( ){

        try{

            console.log("initialize", this._pandoraBox._name, this._pandoraBox.hashHex, this._kademliaNode.contact.identityHex);

            const out = await this._kademliaNode.crawler.iterativeStorePandoraBox( this._pandoraBox );
            if (!out) return;

            await this.pandoraBoxMeta.mergePandoraBoxMetaSybil();

            await this.pandoraBoxMeta.publishPandoraBoxMetaSybil();

            this._initialized = new Date().getTime();

            return true;

        }catch(err){

        }

    }

}