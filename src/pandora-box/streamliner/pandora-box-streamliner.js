const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;
const {Utils} = require('pandora-protocol-kad-reference').helpers;
const PandoraBoxStreamType = require('./../stream/pandora-box-stream-type')
const CryptoHelpers = require('../../helpers/crypto-helpers')
const PandoraBoxStreamStatus = require('./../stream/pandora-box-stream-status')
const PandoraBoxStreamlinerWorkers = require('./pandora-box-streamliner-workers')

module.exports = class PandoraBoxStreamliner {

    constructor(pandoraProtocolNode, pandoraBox) {

        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;
        this.workers = new PandoraBoxStreamlinerWorkers(pandoraProtocolNode, pandoraBox, this);

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

        if (this._pandoraBox.isDone) return true;

        this.queue = [];
        this.updateQueueStreams(this._pandoraBox.streams);
        this.workers.start();

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

        if ( (this._initialized < time - KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000) ) ||
            (!this.peers.length && this._initialized < time - 5*1000 ) ){

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

        this.queue.sort((a,b)=>a.priority - b.priority);

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
                if ( !peer.contact.identity.equals(this._pandoraProtocolNode.contact.identity) ){

                    let found = false;
                    for (let j=0; j < this.peers.length; j++)
                        if (this.peers[j].contact.identity.equals(peer.contact.identity)){
                            found = true;

                            if (peer.contact.isContactNewer(this.peers[j].contact))
                                this._pandoraBox._pandoraProtocolNode.updateContact(peer.contact);

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

    initialize(cb){

        this._pandoraProtocolNode.crawler.iterativeStorePandoraBox( this._pandoraBox, (err, out)=> {

            if (err) return cb(err, null);

            this._pandoraProtocolNode.crawler.iterativeFindPandoraBoxPeersList( this._pandoraBox, (err, peers ) => {

                if (peers && peers.length)
                    this.addPeers(peers);

                this._pandoraProtocolNode.crawler.iterativeStorePandoraBoxPeer( this._pandoraBox, undefined, undefined, (err, out2)=>{

                    this._initialized = new Date().getTime();
                    this.workers.refreshWorkers();

                    if (err) return cb(err, null);
                    else cb(null, true);

                });

            } );

        });

    }

    work(worker, next){

        if ( !this.queue.length ){

            if (!this._pandoraBox.isDone){
                this._pandoraBox.isDone = this._pandoraBox.calculateIsDone;
                this._pandoraBox.emit('streamliner/done', );
                this._pandoraProtocolNode.pandoraBoxes.emit('pandora-box/done', {pandoraBox: this._pandoraBox} );
                this.workers.refreshWorkers();
            }

            return next(1000);
        }

        for (let i=0; i < this.queue.length; i++){

            const it = this.queue[i];

            if (it.stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY &&
                it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED ){

                it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING );

                return this._pandoraProtocolNode.locations.createEmptyDirectory( it.stream.absolutePath, (err, out)=>{

                    if (err){
                        it.stream.setStreamStatus(PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED)
                        return next();
                    }

                    this.removeQueueStream(it.stream);

                    it.stream.setStreamStatus(PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED, true);

                    this._pandoraBox.emit('stream/done', {stream: it.stream})

                    return next();

                } );


            } else
            if (it.stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM) {

                if ( it.stream.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED ){

                    it.stream.setStreamStatus( PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING);

                    return this._pandoraProtocolNode.locations.createLocationEmptyStream(it.stream.absolutePath, it.stream.size, (err, out)=>{

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

                            return this._pandoraProtocolNode.rules.sendGetStreamChunk( worker.peer.contact, [ it.stream.hash, undoneChunk.index ], (err, out )=>{

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
                                    const newHash = CryptoHelpers.sha256(buffer);
                                    if ( !newHash.equals( it.stream.chunks[undoneChunk.index] ))
                                        throw "hash is invalid"

                                    this._pandoraProtocolNode.locations.writeLocationStreamChunk( buffer, it.stream, undoneChunk.index, (err, out) =>{

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
                                                this._pandoraBox.emit('stream/done', {stream: it.stream})

                                            } else {

                                                if (it.stream._pandoraBox.chunksTotalAvailable % 10 === 0) // to avoid
                                                    it.stream.saveStatus(()=>{});

                                            }

                                            this._pandoraBox.emit('chunks/total-available', {
                                                chunksTotalAvailable: it.stream._pandoraBox.chunksTotalAvailable,
                                                chunksTotal: it.stream._pandoraBox.chunksTotal
                                            });
                                            this._pandoraBox.emit('stream-chunk/done', {
                                                stream: it.stream,
                                                chunkIndex: undoneChunk.index
                                            });

                                        }catch(err){
                                            console.error(err);
                                        } finally{
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