const PandoraBoxMetaHelper = require('./pandora-box-meta-helper')
const Validation = require('pandora-protocol-kad-reference').helpers.Validation;
const {CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = class PandoraBoxMeta {

    constructor(kademliaNode, version, name, description, categories, streamsHash, sybilIndex, sybilTime, sybilSignature) {

        this._kademliaNode = kademliaNode;

        PandoraBoxMetaHelper.validatePandoraBoxMeta(version, name, description, categories, streamsHash, sybilIndex, sybilTime, sybilSignature);

        this._version = version;
        this._name = name;
        this._description = description;
        this._categories = categories;
        this._streamsHash = streamsHash;

        this._hash = CryptoUtils.sha256( PandoraBoxMetaHelper.computePandoraBoxMetaBuffer(this._version, this._name, this._description, this._categories, this._streamsHash) ) ;
        this._hashHex = this._hash.toString('hex');

        Validation.validateSybilSignature(sybilIndex, sybilTime, sybilSignature, this._hash);

        this._sybilIndex = sybilIndex;
        this._sybilTime = sybilTime;
        this._sybilSignature = sybilSignature;

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

    get sybilSignature(){
        return this._sybilSignature;
    }

    get sybilIndex(){
        return this._sybilIndex;
    }

    get sybilTime(){
        return this._sybilTime;
    }

    toArray(){
        return [ this._version, this._name, this._description, this._categories, this._streamsHash, this._sybilIndex, this._sybilTime, this._sybilSignature ];
    }

    static fromArray(kademliaNode, arr){
        const categories = arr[3].map( it => it.toString() );
        return new PandoraBoxMeta(kademliaNode, arr[0].toString(), arr[1].toString(), arr[2].toString(), categories, arr[4], arr[5], arr[6], arr[7] );
    }

    toJSON(){
        return {
            name: this.name,
            description: this.description,
            streamsHash: this.streamsHash,
        }
    }

}