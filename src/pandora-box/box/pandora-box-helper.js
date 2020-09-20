const {createHash} = require('crypto')
const PandoraBoxStream = require('./stream/pandora-box-stream')

module.exports.computePandoraBoxSize = function (  streams ){

    let size = 0;

    for (let i=0; i < streams.length; i++)
        size += streams[i].size;

    return size;
}

module.exports.computePandoraBoxMetaDataHash = function ( description, chunkSize, streams ){

    const sum = createHash('sha256');

    sum.update(Buffer.from(description));
    sum.update(Buffer.from(description));

    for (let i=0; i < streams.length; i++){
        sum.update( Buffer.from( streams[i].path,  ));
        sum.update( Buffer.from( streams[i].type.toString(),  ));
        sum.update( Buffer.from( streams[i].size.toString(),  ));
        sum.update( streams[i].hash );
    }

    return sum.digest();

}

module.exports.validatePandoraBox = function (version,  description, chunkSize, metaDataHash,  streams){

    if (typeof description !== "string" || description.length > 4*1024) throw 'Invalid PandoraBoxMetaData description';

    if (typeof chunkSize !== "number") throw "ChunkSize is invalid"
    if (chunkSize < 16*1024 || chunkSize >= 2 * 1024 * 1024) throw 'Stream.size is invalid';

    if ( !Array.isArray(streams) || !streams.length ) throw 'Invalid PandoraBox streams or PandoraBox is empty';

    const metaDataHash2 = this.computePandoraBoxMetaDataHash( description, chunkSize, streams );
    if (!metaDataHash.equals(metaDataHash2)) throw 'Invalid PandoraBox streams hash';



}




