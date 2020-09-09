const PandoraBoxStreamType = require('./pandora-box-stream-type')
const PandoraBoxStreamStatus = require('./pandora-box-stream-status')
const PandoraBoxStreamHelper = require('./pandora-box-stream-helper')

module.exports = class PandoraBoxStream {

    constructor(pandoraBox, path, type, size, chunkSize, hash, chunks, statusChunks = [], streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED) {

        if (pandoraBox)
            this.setPandoraBox(pandoraBox);

        PandoraBoxStreamHelper.validatePandoraBoxStream( path, type, size, chunkSize, hash);

        if (!Array.isArray(statusChunks)) throw new Error('Stream.statusChunks is not a n array');
        if (statusChunks.length > chunks) throw new Error('Stream.statusChunks length is invalid');

        for (const status of statusChunks)
            if (status !== 0 && status !== 1)
                throw new Error('Stream.status is invalid');

        this.path = path;
        this.type = type;
        this.size = size;
        this.chunkSize = chunkSize;
        this.chunksCount = chunkSize ? Math.ceil( size / chunkSize ) : 0;

        this.hash = hash;
        this.hashHex = hash.toString('hex');

        this.chunks = chunks;

        this.statusChunks = statusChunks
        this.statusUndoneChunksPending = 0;

        this.calculateStatusUndone();

        this.setStreamStatus( streamStatus );

    }

    setStreamStatus(newValue, save = false, cb = () =>{} ){

        this._streamStatus = newValue;
        this.isDone = this.calculateIsDone;

        if (save)
            this.saveStatus(cb);

    }

    get streamStatus(){
        return this._streamStatus;
    }

    calculateStatusUndone(){

        this.statusUndoneChunks = [];

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM)
            for (let i=0; i < this.chunksCount; i++)
                if (this.statusChunks[i] !== 1)
                    this.statusUndoneChunks.push({
                        index: i,
                        pending: false,
                    });
    }

    setPandoraBox(pandoraBox){
        this._pandoraBox = pandoraBox;
        this._kademliaNode = pandoraBox._kademliaNode;
    }

    toArray(){
        return [ this.path, this.type, this.size,  this.chunkSize, this.hash, this.chunks  ];
    }

    static fromArray( pandoraBox, arr ){
        return new PandoraBoxStream(pandoraBox, arr[0].toString('ascii'), arr[1], arr[2], arr[3], arr[4], arr[5], [], PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED );
    }

    get absolutePath(){
        const abs = ( !this._pandoraBox.absolutePath ) ? this._kademliaNode.locations._prefix + this._pandoraBox.name : this._pandoraBox.absolutePath;
        return this._kademliaNode.locations.trailingSlash( abs  ).slice(0, -1) + this.path;
    }

    get calculateIsDone(){

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY){
            return this.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED;
        } if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM) {

            for (let i=0; i < this.chunks; i++)
                if ( !this.statusChunks[i] )
                    return false;

            return this.streamStatus  === PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED;
        } else throw new Error("Invalid type");

    }

    toJSON(){
        return {
            path: this.path,
            type: this.type,
            size: this.size,
            chunkSize: this.chunkSize,
            chunksCount: this.chunksCount,
            hash: this.hash.toString('hex'),
            chunks: this.chunks.map( it=> it.toString('hex')),
            statusChunks: this.statusChunks,
            streamStatus: this.streamStatus,
        }
    }

    chunkRealSize(chunkIndex){
        return ( chunkIndex === this.chunksCount -1 ) ? this.size % this.chunkSize : this.chunkSize;
    }

    get chunksDone(){
        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM )
            return this.chunksCount - this.statusUndoneChunks.length;
        return this.isDone ? 1 : 0;
    }

    get percent(){

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM )
            return (this.chunksCount - this.statusUndoneChunks.length) / (this.chunksCount || 1) * 100 ;
        else
            return this.isDone ? 100 : 0;
    }

    saveStatus(cb){
        const obj = {
            statusChunks: this.statusChunks,
            streamStatus: this.streamStatus,
        }
        this._kademliaNode.storage.setItem('pandoraBoxes:streams:status:'+this.absolutePath, JSON.stringify(obj), cb );
    }

    loadStatus(cb){
        this._kademliaNode.storage.getItem('pandoraBoxes:streams:status:'+this.absolutePath, (err, out) => {

            if (err) return cb(err);
            if (!out) return cb(new Error('Status not found'));

            out = JSON.parse(out);

            if (out.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING) out.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED;

            this.setStreamStatus(out.streamStatus, false);

            this.statusChunks = out.statusChunks;
            this.calculateStatusUndone();

            cb(null, true);

        } );
    }

    removeStatus(cb){

        this._kademliaNode.storage.removeItem('pandoraBoxes:streams:status:'+this.absolutePath, cb);

    }

}