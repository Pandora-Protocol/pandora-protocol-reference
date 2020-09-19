const Validation = require('pandora-protocol-kad-reference').helpers.Validation;
const { Utils } = require('pandora-protocol-kad-reference').helpers;

module.exports = class SybilProtectVote {

    constructor(  sybilProtectIndex, sybilProtectTime, sybilProtectVoteProtectVoteCount, sybilProtectSignature) {

        if (typeof sybilProtectIndex !== "number") throw "invalid sybilProtectIndex";
        if (typeof sybilProtectTime !== "number") throw "invalid sybilProtectTime";
        if (typeof sybilProtectVoteProtectVoteCount !== "number" || !sybilProtectVoteProtectVoteCount) throw "invalid sybilProtectVoteProtectVoteCount";
        if (!Buffer.isBuffer(sybilProtectSignature) || sybilProtectSignature.length !== 2*KAD_OPTIONS.NODE_ID_LENGTH) throw "invalid sybilProtectSignature";

        this._sybilProtectIndex = sybilProtectIndex
        this._sybilProtectTime = sybilProtectTime
        this._sybilProtectVoteProtectVoteCount = sybilProtectVoteProtectVoteCount
        this._sybilProtectSignature = sybilProtectSignature

        this._keys = ['sybilProtectIndex','sybilProtectTime','sybilProtectVoteProtectVoteCount','sybilProtectSignature'];

    }

    get sybilProtectIndex(){
        return this._sybilProtectIndex;
    }

    get sybilProtectTime(){
        return this._sybilProtectTime;
    }

    get sybilProtectVoteProtectVoteCount(){
        return this._sybilProtectVoteProtectVoteCount;
    }
    get sybilProtectSignature(){
        return this._sybilProtectSignature;
    }

    validateSybilProtectVote(hash){
        return this._kademliaNode.sybilProtectSign.validateSignature(this._sybilProtectIndex, [ this._sybilProtectTime, this._sybilProtectVoteProtectVoteCount ], this._sybilProtectSignature, hash);
    }

    toArray(keysFilter = {}){
        return Utils.toArray(this, this._keys, {...keysFilter, ...this._keysFilter} );
    }

    static fromArray(  arr ){
        return new SybilProtectVote( arr[0], arr[1], arr[2], arr[3]);
    }

}