const Validation = require('pandora-protocol-kad-reference').helpers.Validation;
const PandoraBox = require('./../box/pandora-box')
const PandoraBoxMetaSybil = require('./../meta-sybil/pandora-box-meta-sybil')

module.exports = class PandoraBoxSybil extends PandoraBox{

    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, streams, sybilProtectIndex, sybilProtectTime, sybilProtectSignature ) {

        super(kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, streams)

        Validation.validateSybilProtectSignature(sybilProtectIndex, sybilProtectTime, sybilProtectSignature, this._hash);

        this._sybilProtectIndex = sybilProtectIndex;
        this._sybilProtectTime = sybilProtectTime;
        this._sybilProtectSignature = sybilProtectSignature;

        this._keys.push('sybilProtectIndex', 'sybilProtectTime', 'sybilProtectSignature');

    }

    get sybilProtectSignature(){
        return this._sybilProtectSignature;
    }

    get sybilProtectIndex(){
        return this._sybilProtectIndex;
    }

    get sybilProtectTime(){
        return this._sybilProtectTime;
    }

    async boxSybilProtectSign(){

        const out = await this._kademliaNode.contactStorage.sybilProtectSign( {message: this.hash }, {includeTime: true} );

        this._sybilProtectIndex = out.index+1;
        this._sybilProtectTime = out.time;
        this._sybilProtectSignature = out.signature;

    }

    convertToPandoraBoxMetaSybil(){
        const array = this.toArray({description:true, streams:true});
        return new PandoraBoxMetaSybil(this._kademliaNode, ...array );
    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxSybil){
        return super.fromArray(kademliaNode, arr, boxClass);
    }

    static async load(kademliaNode, hash, boxClass = PandoraBoxSybil){
        return super.load(kademliaNode, hash, boxClass);
    }

}