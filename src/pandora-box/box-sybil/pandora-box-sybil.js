const PandoraBox = require('./../box/pandora-box')
const PandoraBoxMetaSybil = require('./../meta-sybil/pandora-box-meta-sybil')
const SybilProtect = require('../../sybil-protect/sybil-protect')
const PandoraBoxSybilStreamliner = require('./streamliner/pandora-box-sybil-streamliner')

module.exports = class PandoraBoxSybil extends PandoraBox{

    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description,  chunkSize, streams, sybilProtect, onlyValidation ) {

        super(kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, chunkSize, streams, onlyValidation)

        if ( !(sybilProtect instanceof SybilProtect ))
            sybilProtect = SybilProtect.fromArray(kademliaNode, sybilProtect);

        sybilProtect.validateSybilProtect(this._hash);

        this._sybilProtect = sybilProtect;

        this._keys.push('sybilProtect');

        if (!onlyValidation)
            this.streamliner.createPandoraBoxMetaBox();

    }

    get PandoraBoxStreamlinerClass(){
        return PandoraBoxSybilStreamliner;
    }

    get sybilProtect(){
        return this._sybilProtect;
    }

    async boxSybilProtectSign(){

        const out = await this._kademliaNode.sybilProtectSigner.sign( {message: this.hash }, {includeTime: true} );

        this._sybilProtect._sybilProtectIndex = out.index+1;
        this._sybilProtect._sybilProtectTime = out.time;
        this._sybilProtect._sybilProtectSignature = out.signature;

        if (this.streamliner) {
            this.streamliner.pandoraBoxMeta.sybilProtect._sybilProtectIndex = out.index + 1;
            this.streamliner.pandoraBoxMeta.sybilProtect._sybilProtectTime = out.time;
            this.streamliner.pandoraBoxMeta.sybilProtect._sybilProtectSignature = out.signature;
        }

    }

    convertToPandoraBoxMeta(){
        const array = this.toArray({description:true, streams:true, chunkSize:true, });
        array.push([ ]);
        return new PandoraBoxMetaSybil(this._kademliaNode, ...array );
    }

    async save(){
        const out = await super.save();

        if (this.streamliner)
            await this.streamliner.pandoraBoxMeta.save();

        return out;
    }

    async remove(){
        const out = await super.remove();

        if (this.streamliner)
            await this.streamliner.pandoraBoxMeta.remove();

        return out;
    }

    static async load(){

        const box = await super.load(...arguments)
        if (box && box.streamliner){

            const pandoraBoxMeta = await PandoraBoxMetaSybil.load(...arguments);
            if (pandoraBoxMeta) {
                box.streamliner.pandoraBoxMeta = pandoraBoxMeta;
                box.streamliner.pandoraBoxMeta.autoSave = true;
            }

        }

        return box;
    }

}