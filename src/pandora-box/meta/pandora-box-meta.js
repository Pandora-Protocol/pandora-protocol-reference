const PandoraBoxMetaHelper = require('./pandora-box-meta-helper')
const Validation = require('pandora-protocol-kad-reference').helpers.Validation;
const {CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = class PandoraBoxMeta {

    constructor(kademliaNode, version, name, description, categories, streamsHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature) {

        this._kademliaNode = kademliaNode;

        PandoraBoxMetaHelper.validatePandoraBoxMeta(version, name, description, categories, streamsHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature);

        this._version = version;
        this._name = name;
        this._description = description;
        this._categories = categories;
        this._streamsHash = streamsHash;

        this._hash = CryptoUtils.sha256( PandoraBoxMetaHelper.computePandoraBoxMetaBuffer(this._version, this._name, this._description, this._categories, this._streamsHash) ) ;
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

    get description(){
        return this._description;
    }

    get streamsHash(){
        return this._streamsHash;
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
        return [ this._version, this._name, this._description, this._categories, this._streamsHash, this._sybilProtectIndex, this.sybilProtectTime, this._sybilProtectSignature ];
    }

    static fromArray(kademliaNode, arr){
        const categories = arr[3].map( it => it.toString() );
        return new PandoraBoxMeta(kademliaNode, arr[0].toString(), arr[1].toString(), arr[2].toString(), categories, arr[4], arr[5], arr[6], arr[7] );
    }

    toJSON(){
        return {
            name: this._name,
            description: this._description,
            categories: this._categories,
            streamsHash: this._streamsHash,
        }
    }

}