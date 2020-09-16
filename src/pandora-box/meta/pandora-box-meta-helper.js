const {CryptoUtils} = require('pandora-protocol-kad-reference').helpers;
const PandoraBoxMetaVersion = require('./pandora-box-meta-version')

module.exports.validatePandoraBoxMeta = function (version, name, categories, metaDataHash ){

    if (typeof version !== "number" || !PandoraBoxMetaVersion._map[version]  ) throw 'Invalid PandoraBox version type';

    if (typeof name !== "string" || name.length < 5 || name.length > 200) throw 'Invalid PandoraBox name';

    if ( !Buffer.isBuffer(metaDataHash) || metaDataHash.length !== KAD_OPTIONS.NODE_ID_LENGTH ) throw 'Invalid PandoraBox hash';

    if (!Array.isArray(categories) || categories.length > 3 ) throw 'Too many categories'
    for (const category of categories)
        if (category.length > 16) throw "Category maximum length is 16";

}

module.exports.processPandoraBoxMetaName = function (name){
    return name.toLowerCase().replace(/ *\[[^\]]*] */g, '').replace(/ *{[^\]]*} */g, '');
}

module.exports.splitPandoraBoxMetaName = function (name){
    return name.split(/[\s`~'";,.\-+=_ :{}\[\]|\\\/!@#$%^&*()]+/).slice(0, PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_FIND_BY_NAME_MAX_WORDS ).sort( (a, b) => a.localeCompare( b ) );
}

module.exports.computePandoraBoxMetaBuffer = function (version, name, categories, metaDataHash){

    categories = Buffer.concat( categories.map( it => Buffer.from(it) ) );

    return Buffer.concat([
        Buffer.from(version.toString()),
        Buffer.from(name),
        categories,
        Buffer.from(metaDataHash),
    ]);
}

module.exports.computePandoraBoxMetaHash = function (){
    return CryptoUtils.sha256(this.computePandoraBoxMetaBuffer(...arguments));
}