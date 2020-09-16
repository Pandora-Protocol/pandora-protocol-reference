const {createHash} = require('crypto')
const PandoraBoxStream = require('../pandora-box/stream/pandora-box-stream')

module.exports.computePandoraBoxMetaDataHash = function ( description, streams ){

    const sum = createHash('sha256');

    sum.update(Buffer.from(description));

    for (let i=0; i < streams.length; i++){
        sum.update( Buffer.from( streams[i].path,  ));
        sum.update( Buffer.from( streams[i].type.toString(),  ));
        sum.update( Buffer.from( streams[i].size.toString(),  ));
        sum.update( Buffer.from( streams[i].chunkSize.toString(),  ));
        sum.update( streams[i].hash );
    }

    return sum.digest();

}

module.exports.validatePandoraBox = function (version, description, metaDataHash, streams){

    if (typeof description !== "string" || description.length > 4*1024) throw 'Invalid PandoraBoxMetaData description';

    const metaDataHash2 = this.computePandoraBoxMetaDataHash( description, streams );
    if (!metaDataHash.equals(metaDataHash2)) throw Error('Invalid PandoraBox streams hash');

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

