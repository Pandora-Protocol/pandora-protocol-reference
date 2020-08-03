const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;
const PandoraBoxStreamType = require('./../stream/pandora-box-stream-type')
const CryptoHelpers = require('../../helpers/crypto-helpers')
const PandoraBoxStreamStatus = require('./../stream/pandora-box-stream-status')

module.exports = class PandoraBoxStreamlinerWorker {

    constructor(pandoraProtocolNode, pandoraBox, pandoraBoxStreamliner) {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;
        this._pandoraBoxStreamliner = pandoraBoxStreamliner;

        this._started = false;
    }

    start(){
        if (this._started) return false;
        this._started = true;

        this._workerAsyncInterval = setAsyncInterval(
            next => this._work(next),
            0,
        );

    }

    stop(){
        if (!this._started) return false;
        this._started = false;

        clearAsyncInterval(this._workerAsyncInterval);

    }

    _work(next){

        if (this._pandoraBoxStreamliner.queue.length === 0){

            if (!this._pandoraBox.isDone){
                this._pandoraBox.isDone = this._pandoraBox.calculateIsDone;
                this._pandoraBox.emit('streamliner/done', );
                this._pandoraProtocolNode.pandoraBoxes.emit('pandora-box/done', {pandoraBox: this._pandoraBox} );
            }

            this.stop();
            return next();
        }

        for (let i=0; i < this._pandoraBoxStreamliner.queue.length; i++){

            const it = this._pandoraBoxStreamliner.queue[i];

            if (it.stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY &&
                it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED ){

                it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING;

                return this._pandoraProtocolNode.locations.createEmptyDirectory( it.stream.absolutePath, (err, out)=>{

                    if (err){
                        it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED;
                        return next();
                    }

                    this._pandoraBoxStreamliner.removeQueueStream(it.stream);

                    it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED;
                    it.stream.isDone = it.stream.calculateIsDone;

                    this._pandoraBox.emit('stream/done', {stream: it.stream})

                    return next();

                } );


            } else
            if (it.stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM) {

                if ( it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED ){

                    it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING;

                    return this._pandoraProtocolNode.locations.createLocationEmptyStream(it.stream.absolutePath, it.stream.size, (err, out)=>{

                        if (!err && out)
                            it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZED;
                        else
                            it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED;

                        next();

                    })

                } else
                if (it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZED &&
                    it.stream.statusUndoneChunksPending < it.stream.statusUndoneChunks.length)
                    for (const undoneChunk of it.stream.statusUndoneChunks) {
                        if (!undoneChunk.pending) {

                            undoneChunk.pending = true;
                            it.stream.statusUndoneChunksPending += 1;

                            const peerIndex = Math.floor( Math.random() * this._pandoraBoxStreamliner.peers.length);
                            const peer = this._pandoraBoxStreamliner.peers[ peerIndex ].contact;

                            return this._pandoraProtocolNode.rules.sendGetStreamChunk( peer, [ it.stream.hash, undoneChunk.index ], (err, out )=>{

                                try{

                                    if (err || !out  )
                                        throw "chunk was not received";

                                    if (!Buffer.isBuffer(out) || out.length !== it.stream.chunkRealSize(undoneChunk.index))
                                        throw "invalid chunk"

                                    //verify hash
                                    const newHash = CryptoHelpers.sha256(out);
                                    if ( !newHash.equals( it.stream.chunks[undoneChunk.index] ))
                                        throw "hash is invalid"

                                    this._pandoraProtocolNode.locations.writeLocationStreamChunk( it.stream.absolutePath, out, undoneChunk.index, it.stream.chunkSize, (err, out) =>{

                                        if (err || out !== true){
                                            undoneChunk.pending = false;
                                            it.stream.statusUndoneChunksPending -= 1;
                                            return next();
                                        }


                                        it.stream.statusChunks[undoneChunk.index] = 1;
                                        it.stream.statusUndoneChunksPending -= 1;

                                        for (let i=0; i < it.stream.statusUndoneChunks.length; i++ )
                                            if (it.stream.statusUndoneChunks[i] === undoneChunk){
                                                it.stream.statusUndoneChunks.splice(i, 1);
                                                break;
                                            }

                                        //we finished all...
                                        if ( !it.stream.statusUndoneChunks.length ){

                                            this._pandoraBoxStreamliner.removeQueueStream(it.stream);

                                            it.stream.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED;
                                            it.stream.isDone = it.stream.calculateIsDone;
                                            this._pandoraBox.emit('stream/done', {stream: it.stream})
                                        }

                                        it.stream._pandoraBox.chunksTotalAvailable += 1;

                                        this._pandoraBox.emit('chunks/total-available', { chunksTotalAvailable: it.stream._pandoraBox.chunksTotalAvailable, chunksTotal: it.stream._pandoraBox.chunksTotal  });
                                        this._pandoraBox.emit('stream-chunk/done', {stream: it.stream, chunkIndex: undoneChunk.index });

                                        return next();

                                    } ) ;


                                }catch(err){
                                    console.error(err);

                                    undoneChunk.pending = false;
                                    it.stream.statusUndoneChunksPending -= 1;
                                    return next();
                                }

                            } );

                        }
                    }

            }

        }

        next();

    }

}