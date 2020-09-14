const {CryptoUtils, ECCUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports.validatePandoraBoxMeta = function (version, name, description, streamsHash, sybilSignature){

    if (typeof version !== "string" || !version.length ) throw 'Invalid PandoraBox version type';
    if (version !== PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_VERSION) throw "Invalid PandoraBox version";

    if (typeof name !== "string" || name.length < 5 || name.length > 200) throw 'Invalid PandoraBox name';

    if (typeof description !== "string" || description.length > 4*1024) throw 'Invalid PandoraBox description';

    if ( !Buffer.isBuffer(streamsHash) || streamsHash.length !== KAD_OPTIONS.NODE_ID_LENGTH ) throw 'Invalid PandoraBox hash';


}

module.exports.processPandoraBoxMetaName = function (name){
    return name.toLowerCase().replace(/ *\[[^\]]*] */g, '').replace(/ *{[^\]]*} */g, '');
}

module.exports.splitPandoraBoxMetaName = function (name){
    return name.split(/[\s`~'";,.\-+=_ :{}\[\]|\\\/!@#$%^&*()]+/).slice(0, PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_FIND_BY_NAME_MAX_WORDS ).sort( (a, b) => a.localeCompare( b ) );
}

module.exports.computePandoraBoxMetaBuffer = function (version, name, description, streamsHash){
    return Buffer.concat([
        Buffer.from(version),
        Buffer.from(name),
        Buffer.from(description),
        Buffer.from(streamsHash),
    ]);
}

module.exports.computePandoraBoxMetaHash = function (){
    return CryptoUtils.sha256(this.computePandoraBoxMetaBuffer(...arguments));
}