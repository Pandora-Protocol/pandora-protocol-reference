const PandoraBoxMetaHelper = require('./pandora-box-meta-helper')
const Validation = require('pandora-protocol-kad-reference').helpers.Validation;
const {CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = class PandoraBoxMeta {

    constructor(kademliaNode, version, name, description, streamsHash, sybilSignature) {

        this._kademliaNode = kademliaNode;

        PandoraBoxMetaHelper.validatePandoraBoxMeta(version, name, description, streamsHash, sybilSignature);

        this._version = version;
        this._name = name;
        this._description = description;
        this._streamsHash = streamsHash;

        this._hash = CryptoUtils.sha256( this.bufferForHash() ) ;
        this._hashHex = this._hash.toString('hex');

        Validation.validateSybilSignature(sybilSignature, this._hash);
        this._sybilSignature = sybilSignature;

    }

    bufferForHash(){
        return PandoraBoxMetaHelper.computePandoraBoxMetaBuffer(this._version, this._name, this._description, this._streamsHash)
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

    toArray(){
        return [ this._version, this._name, this._description, this._streamsHash, this._sybilSignature ];
    }

    static fromArray(kademliaNode, arr){
        return new PandoraBoxMeta(kademliaNode, arr[0].toString(), arr[1].toString(), arr[2].toString(), arr[3], arr[4] );
    }

    toJSON(){
        return {
            name: this.name,
            description: this.description,
            streamsHash: this.streamsHash,
        }
    }

}