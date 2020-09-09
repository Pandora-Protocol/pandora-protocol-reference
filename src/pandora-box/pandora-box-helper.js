const {createHash} = require('crypto')
const PandoraBoxStream = require('../pandora-box/stream/pandora-box-stream')

module.exports.computePandoraBoxHash = function (version, name, description, streamsHash){

    const sum = createHash('sha256');

    sum.update(Buffer.from(version, 'ascii'));
    sum.update(Buffer.from(name, 'ascii'));
    sum.update(Buffer.from(description, 'ascii'));

    sum.update(Buffer.from(streamsHash, 'ascii'))

    return sum.digest();

}

module.exports.computePandoraBoxStreamsHash = function ( streams ){

    const sum = createHash('sha256');

    for (let i=0; i < streams.length; i++){
        sum.update( Buffer.from( streams[i].path, 'ascii' ));
        sum.update( Buffer.from( streams[i].type.toString(), 'ascii' ));
        sum.update( Buffer.from( streams[i].size.toString(), 'ascii' ));
        sum.update( Buffer.from( streams[i].chunkSize.toString(), 'ascii' ));
        sum.update( streams[i].hash );
    }

    return sum.digest();

}

module.exports.validatePandoraBoxMeta = function (version, name, description, streamsHash){

    if (typeof version !== "string" || !version.length ) throw Error('Invalid PandoraBox version type');
    if (version !== PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_VERSION) throw "Invalid PandoraBox version";

    if (typeof name !== "string" || name.length < 5 || name.length > 255) throw Error('Invalid PandoraBox name');
    if (typeof description !== "string" || description.length > 4*1024) throw Error('Invalid PandoraBox description');

    if ( !Buffer.isBuffer(streamsHash) || streamsHash.length !== KAD_OPTIONS.NODE_ID_LENGTH ) throw Error('Invalid PandoraBox hash');

}

module.exports.validatePandoraBox = function (streamsHash, streams){

    const streamsHash2 = this.computePandoraBoxStreamsHash( streams );
    if (!streamsHash.equals(streamsHash2)) throw Error('Invalid PandoraBox streams hash');

}

module.exports.validatePandoraBoxStreams = function (streams){

    if ( !Array.isArray(streams) || !streams.length ) throw Error('Invalid PandoraBox streams');
    for (const stream of streams)
        if ( ! (stream instanceof PandoraBoxStream) ) throw Error('Invalid PandoraBox stream')


}

module.exports.createPandoraBoxStreams = function ( pandoraBox, streams ) {

    for (let i=0; i < streams.length; i++)
        if ( !(streams[i] instanceof PandoraBoxStream) )
            streams[i] = PandoraBoxStream.fromArray( pandoraBox, streams[i] );

    return streams;
}

