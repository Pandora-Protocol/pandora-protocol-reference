const PandoraBox = require('./../box/pandora-box')
const PandoraBoxMetaSybil = require('./../meta-sybil/pandora-box-meta-sybil')
const SybilProtect = require('../../sybil-protect/sybil-protect')
const PandoraBoxSybilStreamliner = require('./streamliner/pandora-box-sybil-streamliner')

module.exports = class PandoraBoxSybil extends PandoraBox{

    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description,  chunkSize, streams, sybilProtect ) {

        super(kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, chunkSize, streams)

        if ( !(sybilProtect instanceof SybilProtect ))
            sybilProtect = SybilProtect.fromArray(kademliaNode, sybilProtect);

        sybilProtect.validateSybilProtect(this._hash);

        this._sybilProtect = sybilProtect;

        this._keys.push('sybilProtect');

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

    }

    convertToPandoraBoxMeta(){
        const array = this.toArray({description:true, streams:true, chunkSize:true, });
        array.push([ ]);
        return new PandoraBoxMetaSybil(this._kademliaNode, ...array );
    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxSybil){
        return super.fromArray(kademliaNode, arr, boxClass);
    }

    static async load(kademliaNode, hash, boxClass = PandoraBoxSybil){
        return super.load(kademliaNode, hash, boxClass);
    }

}