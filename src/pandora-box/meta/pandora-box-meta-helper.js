const {createHash} = require('crypto')

module.exports.validatePandoraBoxMeta = function (version, name, description, streamsHash){

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

module.exports.computePandoraBoxMetaHash = function (version, name, description, streamsHash){

    const sum = createHash('sha256');

    sum.update(Buffer.from(version));
    sum.update(Buffer.from(name));
    sum.update(Buffer.from(description));

    sum.update(Buffer.from(streamsHash))

    return sum.digest();

}