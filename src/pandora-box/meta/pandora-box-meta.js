const PandoraBoxMetaHelper = require('./pandora-box-meta-helper')
const Validation = require('pandora-protocol-kad-reference').helpers.Validation;
const {CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = class PandoraBoxMeta {

    constructor(kademliaNode, version, name, categories, metaDataHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature ) {

        this._kademliaNode = kademliaNode;

        PandoraBoxMetaHelper.validatePandoraBoxMeta(version, name, categories, metaDataHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature);

        this._version = version;
        this._name = name;
        this._categories = categories;
        this._metaDataHash = metaDataHash;

        this._hash = CryptoUtils.sha256( PandoraBoxMetaHelper.computePandoraBoxMetaBuffer(this._version, this._name, this._categories, this._metaDataHash) ) ;
        this._hashHex = this._hash.toString('hex');

        Validation.validateSybilProtectSignature(sybilProtectIndex, sybilProtectTime, sybilProtectSignature, this._hash);

        this._sybilProtectIndex = sybilProtectIndex;
        this._sybilProtectTime = sybilProtectTime;
        this._sybilProtectSignature = sybilProtectSignature;

    }

    get hash(){
        return this._hash;
    }

    get hashHex(){
        return this._hashHex;
    }

    get version(){
        return this._version;
    }

    get categories(){
        return this._categories;
    }

    get name(){
        return this._name;
    }

    get metaDataHash(){
        return this._metaDataHash;
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

    toArray(){
        return [ this._version, this._name, this._categories, this._metaDataHash, this._sybilProtectIndex, this._sybilProtectTime, this._sybilProtectSignature ];
    }

    static fromArray(kademliaNode, arr){
        const categories = arr[2].map( it => it.toString() );
        return new PandoraBoxMeta(kademliaNode, arr[0], arr[1].toString(), categories, arr[3], arr[4], arr[5], arr[6] );
    }

    toJSON(){
        return {
            name: this._name,
            description: this._description,
            categories: this._categories,
            metaDataHash: this._metaDataHash,
        }
    }

}