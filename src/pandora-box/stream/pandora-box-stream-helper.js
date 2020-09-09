
const PandoraBoxStreamType = require('./pandora-box-stream-type')

module.exports.isSemiAbsolutePath = function (str) {

    if (str.indexOf('../' ) >= 0) return false;
    if (str.indexOf('./' ) >= 0) return false;
    if (/^[\^$%@!\\<>:"|\?*]$/.test(str) ) return false;

    return true;
}

module.exports.validatePandoraBoxStream = function (path, type, size, chunkSize, hash, ) {

    const valid = this.isSemiAbsolutePath(path);
    if (!valid) throw new Error('Stream Path is invalid');

    if (type !== PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM && type !== PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY )
        throw new Error('Stream type is invalid');

    if (typeof size !== "number" || size < 0 || size >= Number.MAX_SAFE_INTEGER ) throw new Error('Stream.size is not a number');
    if (typeof chunkSize !== "number" ) throw new Error('Stream.chunkSize is not a number');

    if ( !Buffer.isBuffer(hash) ) throw new Error('Stream.hash is not a buffer');

    if (type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM ) {
        if (chunkSize < 1024 || chunkSize >= 256 * 1024 * 1024) throw new Error('Stream.size is invalid');
        if (  hash.length !== KAD_OPTIONS.NODE_ID_LENGTH ) throw new Error('Stream.hash is invalid');
    } else if (type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY ) {
        if (chunkSize !== 0) throw new Error('Stream.size is invalid');
        if ( hash.length ) throw new Error('Stream.hash is invalid');
    }

}