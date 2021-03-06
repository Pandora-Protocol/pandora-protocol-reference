const Validation = require('pandora-protocol-kad-reference').helpers.Validation;

module.exports = function (options){

    return class MyClass extends options.Rules{

        constructor() {

            super(...arguments);

            this._commands['GET_STREAM_CHK'] = this.getStreamChunk.bind(this)

            this._streamlinerChunksSendingQueueCount = 0;

        }

        async getStreamChunk( req, srcContact, [ streamHash, chunkIndex ] ){

            Validation.validateIdentity(streamHash);
            if (typeof chunkIndex !== "number" || chunkIndex < 0) return [0, 'Invalid chunk index'];

            const pandoraBoxStream = this._kademliaNode.pandoraBoxes._streamsMap[streamHash.toString('hex')];
            if (!pandoraBoxStream) return [0, 'PandoraBoxStream not found'];

            if (chunkIndex >= pandoraBoxStream.chunksCount) return [0, 'Chunk index out of bound'];
            if (!pandoraBoxStream.statusChunks[chunkIndex]) return [0, 'Chunk not ready'];

            if (this._streamlinerChunksSendingQueueCount > PANDORA_PROTOCOL_OPTIONS.PLUGINS.STREAMLINER.MAX_STREAMLINER_SENDING_CHUNKS_QUEUE_COUNT)
                return [ 0, 'Busy' ];

            this._streamlinerChunksSendingQueueCount += 1;

            try{
                const out = await this._kademliaNode.locations.getLocationStreamChunk( pandoraBoxStream, chunkIndex);
                return [1, out];
            }catch(err){
                return [0, 'Unexpected error'];
            }finally{
                this._streamlinerChunksSendingQueueCount -= 1;
            }

        }

        sendGetStreamChunk( srcContact, [ streamHash, chunkIndex ] ){
            return this.send(srcContact, 'GET_STREAM_CHK', [ streamHash, chunkIndex ]);
        }

    }

}
