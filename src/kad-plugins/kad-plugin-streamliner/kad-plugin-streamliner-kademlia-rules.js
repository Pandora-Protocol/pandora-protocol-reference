const Validation = require('pandora-protocol-kad-reference').helpers.Validation;

module.exports = function (kademliaRules){

    kademliaRules._commands.GET_STREAM_CHK = getStreamChunk.bind(kademliaRules)
    kademliaRules.sendGetStreamChunk = sendGetStreamChunk;

    function getStreamChunk( srcContact, [ streamHash, chunkIndex], cb ){

        const err1 = Validation.checkIdentity(streamHash);
        if (err1) return cb(err1);
        if (typeof chunkIndex !== "number" || chunkIndex < 0) return cb( null, [0, 'Invalid chunk index'] );

        if (srcContact) this._welcomeIfNewNode(srcContact);

        const pandoraBoxStream = this._kademliaNode.pandoraBoxes._streamsMap[streamHash.toString('hex')];
        if (!pandoraBoxStream) return cb(null, [0, 'PandoraBoxStream not found'] );

        if (chunkIndex >= pandoraBoxStream.chunksCount) return cb( null, [0, 'Chunk index out of bound'] );
        if (!pandoraBoxStream.statusChunks[chunkIndex]) return cb( null, [0, 'Chunk not ready'] );

        this._kademliaNode.locations.getLocationStreamChunk( pandoraBoxStream.absolutePath,  chunkIndex,  pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex),  (err, out) =>{

            if (err) return cb(null, [0, 'Unexpected error']);
            cb(null, [1, out]);

        } );

    }

    function sendGetStreamChunk( srcContact, [ streamHash, chunkIndex ], cb ){
        this.send(srcContact, 'GET_STREAM_CHK', [ streamHash, chunkIndex ], cb);
    }

}
