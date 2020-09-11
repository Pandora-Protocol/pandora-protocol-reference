const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;

const {Utils, CryptoUtils} = require('pandora-protocol-kad-reference').helpers;
const PandoraBoxStreamType = require('./../stream/pandora-box-stream-type')
const PandoraBoxStreamStatus = require('./../stream/pandora-box-stream-status')
const PandoraBoxStreamlinerWorkers = require('./pandora-box-streamliner-workers')

module.exports = class PandoraBoxStreamliner {

    constructor(kademliaNode, pandoraBox) {

        this._kademliaNode = kademliaNode;
        this._pandoraBox = pandoraBox;
        this.workers = new PandoraBoxStreamlinerWorkers(kademliaNode, pandoraBox, this);

        this.peers = []; //known peers to have this pandoraBox
        this.queue = [];

        this._started = false;
    }

    start(){

        if (this._started) return true;

        this._initialized = 0;

        this._streamlinerInitializeAsyncInterval = setAsyncInterval(
            next => this._workStreamlinerInitialize(next),
            5*1000,
        );

        this._started = true;

        this.queue = [];

        if (!this._pandoraBox.isDone)
            this.updateQueueStreams(this._pandoraBox.streams);

        this.workers.start();

        this.initialize( ()=>{ })

    }

    stop(){

        if (!this._started) return false;
        this._started = false;

        this.queue = [];
        this.workers.stop();

        clearAsyncInterval(this._streamlinerInitializeAsyncInterval);

    }

    _workStreamlinerInitialize(next){

        const time = new Date().getTime();

        if ( this._initialized < time - KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY + Utils.preventConvoy( KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY_CONVOY )  ){

            return this.initialize( (err, out)=>{

                console.log("initialized", this._pandoraBox._name, this._pandoraBox.hashHex, out);
                next();

            } )

        }

        next();

    }


    updateQueueStreams(streams, priority = 1){

        for (const stream of streams)
            if (!stream.isDone)
                this.queue.push({
                    stream,
                    priority,
                })

        this.queue.sort((a,b) => a.priority - b.priority);

    }

    removeQueueStream(stream){

        for (let i=0; i < this.queue.length; i++ )
            if (this.queue[i].stream === stream){
                this.queue.splice(i, 1);
                return;
            }

    }

    addPeers(peers){

        try{

            for (const peer of peers)
                if ( !peer.contact.identity.equals(this._kademliaNode.contact.identity) ){

                    let found = false;
                    for (let j=0; j < this.peers.length; j++)
                        if (this.peers[j].contact.identityHex === peer.contact.identityHex ){
                            found = true;
                            break;
                        }

                    if (!found)
                        this.peers.push({
                            ...peer,
                            worker: null,
                        });

                }

        }catch(err){

        }

    }

    initialize( cb ){

        this._kademliaNode.crawler.iterativeStorePandoraBox( this._pandoraBox, (err, out)=> {

            if (err) return cb(err, null);

            this._kademliaNode.crawler.iterativeStorePandoraBoxName( this._pandoraBox, (err, out )=> {

                if (err) return cb(err, null);

                this._initialized = new Date().getTime();
                cb(null, true)

            } )

        });

    }



    work(worker, next){

        if ( !this.queue.length ){

            if (!this._pandoraBox.isDone){
                this._pandoraBox.isDone = this._pandoraBox.calculateIsDone;
                this._pandoraBox.events.emit('streamliner/done', );
                this._kademliaNode.pandoraBoxes.emit('pandora-box/done', {pandoraBox: this._pandoraBox} );
                this.workers.refreshWorkers();
            }

            return next(1000);
        }

        for (let i=0; i < this.queue.length; i++){

            const it = this.queue[i];

            if (it.stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY &&
                it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED ){

                it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING );

                return this._kademliaNode.locations.createEmptyDirectory( it.stream.absolutePath, (err, out)=>{

                    if (err){
                        it.stream.setStreamStatus(PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED)
                        return next();
                    }

                    this.removeQueueStream(it.stream);

                    it.stream.setStreamStatus(PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED, true);

                    this._pandoraBox.events.emit('stream/done', {stream: it.stream})

                    return next();

                } );


            } else
            if (it.stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM) {

                if ( it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED ){

                    it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING);

                    return this._kademliaNode.locations.createLocationEmptyStream(it.stream.absolutePath, it.stream.size, (err, out)=>{

                        if (!err && out) it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZED, true);
                        else it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED );

                        next();

                    })

                } else
                if (it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZED &&
                    it.stream.statusUndoneChunksPending < it.stream.statusUndoneChunks.length)
                    for (const undoneChunk of it.stream.statusUndoneChunks) {
                        if (!undoneChunk.pending) {

                            undoneChunk.pending = true;
                            it.stream.statusUndoneChunksPending += 1;

                            return this._kademliaNode.rules.sendGetStreamChunk( worker.peer.contact, [ it.stream.hash, undoneChunk.index ], (err, out )=>{

                                try{

                                    if (err){
                                        this.workers.removeWorker(worker);
                                        throw err;
                                    }

                                    if (!out || !Array.isArray(out) || out.length !== 2 ) throw "chunk was not received";
                                    if ( out[0] !== 1 ) throw out[1].toString('ascii') || 'Unexpected error';

                                    const buffer = out[1];

                                    if (!Buffer.isBuffer( buffer ) || buffer.length !== it.stream.chunkRealSize(undoneChunk.index) )
                                        throw "invalid chunk"

                                    //verify hash
                                    const newHash = CryptoUtils.sha256(buffer);
                                    if ( !newHash.equals( it.stream.chunks[undoneChunk.index] ))
                                        throw "hash is invalid"

                                    this._kademliaNode.locations.writeLocationStreamChunk( buffer, it.stream, undoneChunk.index, (err, out) =>{

                                        undoneChunk.pending = false;
                                        it.stream.statusUndoneChunksPending -= 1;

                                        if (err || out !== true) return next();

                                        try {

                                            it.stream.statusChunks[undoneChunk.index] = 1;

                                            it.stream._pandoraBox.chunksTotalAvailable += 1;

                                            for (let i=0; i < it.stream.statusUndoneChunks.length; i++ )
                                                if (it.stream.statusUndoneChunks[i] === undoneChunk){
                                                    it.stream.statusUndoneChunks.splice(i, 1);
                                                    break;
                                                }

                                            //we finished all...
                                            if ( !it.stream.statusUndoneChunks.length ){

                                                this.removeQueueStream(it.stream);
                                                it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED, true);
                                                this._pandoraBox.events.emit('stream/done', {stream: it.stream})

                                            } else {

                                                if (it.stream._pandoraBox.chunksTotalAvailable % 10 === 0) // to avoid
                                                    it.stream.saveStatus(()=>{});

                                            }

                                            this._pandoraBox.events.emit('chunks/total-available', {
                                                chunksTotalAvailable: it.stream._pandoraBox.chunksTotalAvailable,
                                                chunksTotal: it.stream._pandoraBox.chunksTotal
                                            });
                                            this._pandoraBox.events.emit('stream-chunk/done', {
                                                stream: it.stream,
                                                chunkIndex: undoneChunk.index
                                            });

                                        }catch (err) {
                                            console.error(err);
                                        } finally {
                                            next();
                                        }


                                    } ) ;


                                }catch(err){

                                    //console.error(err);

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