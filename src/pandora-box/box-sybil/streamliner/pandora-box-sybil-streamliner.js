const PandoraBoxStreamliner = require('../../box/streamliner/pandora-box-streamliner')


module.exports = class PandoraBoxSybilStreamliner extends PandoraBoxStreamliner {

    constructor() {
        super(...arguments);
    }

    createPandoraBoxMetaBox(){
        this.pandoraBoxMeta = this._pandoraBox.convertToPandoraBoxMeta();
    }

    async initialize( ){

        try{

            console.log("initialize", this._pandoraBox._name, this._pandoraBox.hashHex, this._kademliaNode.contact.identityHex);

            const out = await this._kademliaNode.crawler.iterativeStorePandoraBox( this._pandoraBox );
            if (!out) return;

            await this.pandoraBoxMeta.mergePandoraBoxMetaSybil();

            const out2 = await this._kademliaNode.crawler.iterativeStorePandoraBoxMeta( this.pandoraBoxMeta );
            if (!out2) return;

            const out3 = await this._kademliaNode.crawler.iterativeStorePandoraBoxName( this.pandoraBoxMeta );
            if (!out3) return;

            this._initialized = new Date().getTime();

            return true;

        }catch(err){

        }

    }

}