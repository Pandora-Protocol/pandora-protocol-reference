const Validation = require('pandora-protocol-kad-reference').helpers.Validation;

module.exports = function (options){

    return class MyClass extends options.Rules{

        constructor() {

            super(...arguments);

            this._commands['GET_STREAM_CHK'] = this.getStreamChunk.bind(this)

        }

        getStreamChunk( req, srcContact, [ streamHash, chunkIndex ], cb ){

            const err1 = Validation.checkIdentity(streamHash);
            if (err1) return cb(err1);
            if (typeof chunkIndex !== "number" || chunkIndex < 0) return cb( null, [0, 'Invalid chunk index'] );

            const pandoraBoxStream = this._kademliaNode.pandoraBoxes._streamsMap[streamHash.toString('hex')];
            if (!pandoraBoxStream) return cb(null, [0, 'PandoraBoxStream not found'] );

            if (chunkIndex >= pandoraBoxStream.chunksCount) return cb( null, [0, 'Chunk index out of bound'] );
            if (!pandoraBoxStream.statusChunks[chunkIndex]) return cb( null, [0, 'Chunk not ready'] );

            this._kademliaNode.locations.getLocationStreamChunk( pandoraBoxStream, chunkIndex,  (err, out) =>{

                if (err) return cb(null, [0, 'Unexpected error']);
                cb(null, [1, out]);

            } );

        }

        sendGetStreamChunk( srcContact, [ streamHash, chunkIndex ], cb ){
            this.send(srcContact, 'GET_STREAM_CHK', [ streamHash, chunkIndex ], cb);
        }


    }

}
