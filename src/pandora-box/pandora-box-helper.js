const {createHash} = require('crypto')
const PandoraBoxStream = require('../pandora-box/stream/pandora-box-stream')



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

