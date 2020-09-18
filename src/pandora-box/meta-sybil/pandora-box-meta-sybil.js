const PandoraBoxMeta = require('../meta/pandora-box-meta')
const Validation = require('pandora-protocol-kad-reference').helpers.Validation;

module.exports = class PandoraBoxMetaSybil extends PandoraBoxMeta{

    constructor(kademliaNode, version, name, size, categories, metaDataHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature) {

        super(kademliaNode, version, name, size, categories, metaDataHash);

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

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxMetaSybil){
        return super.fromArray(kademliaNode, arr, boxClass);
    }

}