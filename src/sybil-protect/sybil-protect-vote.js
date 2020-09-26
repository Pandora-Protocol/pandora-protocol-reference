const { Utils } = require('pandora-protocol-kad-reference').helpers;

module.exports = class SybilProtectVote {

    constructor(  kademliaNode, sybilProtectIndex, sybilProtectTime, sybilProtectVotesCount, sybilProtectVotesDown, sybilProtectSignature) {

        this._kademliaNode = kademliaNode;

        if (typeof sybilProtectIndex !== "number") throw "invalid sybilProtectIndex";
        if (typeof sybilProtectTime !== "number") throw "invalid sybilProtectTime";
        if (typeof sybilProtectVotesCount !== "number" || !sybilProtectVotesCount) throw "invalid sybilProtectVotesCount";
        if (typeof sybilProtectVotesDown !== "number" ) throw "invalid sybilProtectVotesDown";
        if (!Buffer.isBuffer(sybilProtectSignature) || sybilProtectSignature.length !== 2*KAD_OPTIONS.NODE_ID_LENGTH) throw "invalid sybilProtectSignature";

        this._sybilProtectIndex = sybilProtectIndex;
        this._sybilProtectTime = sybilProtectTime;
        this._sybilProtectVotesCount = sybilProtectVotesCount;
        this._sybilProtectVotesDown = sybilProtectVotesDown;
        this._sybilProtectSignature = sybilProtectSignature;

        this._keys = ['sybilProtectIndex','sybilProtectTime','sybilProtectVotesCount','sybilProtectVotesDown','sybilProtectSignature'];
    }

    get sybilProtectIndex(){
        return this._sybilProtectIndex;
    }

    get sybilProtectTime(){
        return this._sybilProtectTime;
    }

    get sybilProtectVotesCount(){
        return this._sybilProtectVotesCount;
    }

    get sybilProtectVotesDown(){
        return this._sybilProtectVotesDown;
    }

    get sybilProtectSignature(){
        return this._sybilProtectSignature;
    }

    validateSybilProtectVote(hash){
        return this._kademliaNode.sybilProtectSigner.validateSignature(this._sybilProtectIndex, [ this._sybilProtectTime, this._sybilProtectVotesCount, this._sybilProtectVotesDown ], this._sybilProtectSignature, hash);
    }

    toArray(keysFilter = {}){
        return Utils.toArray(this, this._keys, keysFilter, this._keysFilter );
    }

    static fromArray(  kademliaNode, arr ){
        return new SybilProtectVote( kademliaNode, ...arr);
    }

    toJSON(hex = false){
        return Utils.toJSON(this, this._keys, this._keysFilter, hex );
    }

}