const { Utils } = require('pandora-protocol-kad-reference').helpers;

module.exports = class SybilProtect {

    constructor(  kademliaNode, sybilProtectIndex, sybilProtectTime, sybilProtectSignature) {

        this._kademliaNode = kademliaNode;

        if (typeof sybilProtectIndex !== "number") throw "invalid sybilProtectIndex";
        if (typeof sybilProtectTime !== "number") throw "invalid sybilProtectTime";
        if (!Buffer.isBuffer(sybilProtectSignature) || sybilProtectSignature.length !== 2*KAD_OPTIONS.NODE_ID_LENGTH) throw "invalid sybilProtectSignature";

        this._sybilProtectIndex = sybilProtectIndex
        this._sybilProtectTime = sybilProtectTime
        this._sybilProtectSignature = sybilProtectSignature

        this._keys = ['sybilProtectIndex','sybilProtectTime','sybilProtectSignature'];
        this._keysFilter = {};
    }

    get sybilProtectIndex(){
        return this._sybilProtectIndex;
    }

    get sybilProtectTime(){
        return this._sybilProtectTime;
    }

    get sybilProtectSignature(){
        return this._sybilProtectSignature;
    }

    validateSybilProtect(hash){
        return this._kademliaNode.sybilProtectSigner.validateSignature(this._sybilProtectIndex, [ this._sybilProtectTime ], this._sybilProtectSignature, hash);
    }

    toArray(keysFilter = {}){
        return Utils.toArray(this, this._keys, {...keysFilter, ...this._keysFilter} );
    }

    static fromArray(  kademliaNode, arr ){
        return new SybilProtect( kademliaNode, arr[0], arr[1], arr[2]);
    }

    toJSON(hex = false){
        return Utils.toJSON(this, this._keys, this._keysFilter, hex );
    }

}