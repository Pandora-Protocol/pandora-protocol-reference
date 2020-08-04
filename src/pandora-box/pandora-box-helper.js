const {createHash} = require('crypto')

module.exports.computePandoraBoxHash = function (version, name, description, streams){

    const sum = createHash('sha256');

    sum.update(Buffer.from(version, 'ascii'));
    sum.update(Buffer.from(name, 'ascii'));
    sum.update(Buffer.from(description, 'ascii'));

    for (let i=0; i < streams.length; i++){
        sum.update( Buffer.from( streams[i].path, 'ascii' ));
        sum.update( Buffer.from( streams[i].type.toString(), 'ascii' ));
        sum.update( Buffer.from( streams[i].size.toString(), 'ascii' ));
        sum.update( Buffer.from( streams[i].chunkSize.toString(), 'ascii' ));
        sum.update( streams[i].hash );
    }

    return sum.digest();

};

module.exports.validatePandoraBox = function (version, name, description, hash, streams){

    if (typeof version !== "string" || !version.length ) throw Error('Invalid PandoraBox version type');
    if (version !== PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_VERSION) throw "Invalid PandoraBox version";

    if (typeof name !== "string" || name.length < 5 || name.length > 255) throw Error('Invalid PandoraBox name');
    if (typeof description !== "string" || description.length > 4*1024) throw Error('Invalid PandoraBox description');

    if (!Buffer.isBuffer(hash) || hash.length !== KAD_OPTIONS.NODE_ID_LENGTH) throw Error('Invalid PandoraBox hash');

    if ( !Array.isArray(streams) || !streams.length ) throw Error('Invalid PandoraBox streams');

    const newHash = this.computePandoraBoxHash(version, name, description, streams);
    if (!newHash.equals(hash)) throw Error('hash is invalid');

}

module.exports.isSemiAbsolutePath = function (str) {

    if (str.indexOf('../' ) >= 0) return false;
    if (str.indexOf('./' ) >= 0) return false;
    if (/^[\^$%@!\\<>:"|\?*]$/.test(str) ) return false;

    return true;
}