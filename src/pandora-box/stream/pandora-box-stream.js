const {isSemiAbsolutePath} = require('./../pandora-box-helper')

const PandoraBoxStreamType = require('./pandora-box-stream-type')
const PandoraBoxStreamStatus = require('./pandora-box-stream-status')

module.exports = class PandoraBoxStream {

    constructor(pandoraBox, path, type, size, chunkSize, hash, chunks, statusChunks = [], streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED) {

        this._pandoraBox = pandoraBox;

        const valid = isSemiAbsolutePath(path);
        if (!valid) throw new Error('Stream Path is invalid');

        if (type !== PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM && type !== PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY )
            throw new Error('Stream type is invalid');

        if (typeof size !== "number" || size < 0 || size >= Number.MAX_SAFE_INTEGER ) throw new Error('Stream.size is not a number');
        if (typeof chunkSize !== "number" ) throw new Error('Stream.chunkSize is not a number');

        if (type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM ) {
            if (chunkSize < 1024 || chunkSize >= 32 * 1024 * 1024) throw new Error('Stream.size is invalid');
        } else if (type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY ) {
            if (chunkSize !== 0) throw new Error('Stream.size is invalid');
        }

        if ( !Buffer.isBuffer(hash) || hash.length !== global.KAD_OPTIONS.NODE_ID_LENGTH ) throw new Error('Stream.hash is invalid');

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
        this.chunks = chunks;

        this.statusChunks = statusChunks
        this.streamStatus = streamStatus;

        this.statusUndoneChunks = [];

        if (type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM)
            for (let i=0; i < this.chunksCount; i++)
                if (this.statusChunks[i] !== 1)
                    this.statusUndoneChunks.push({
                        index: i,
                        pending: false,
                    });

        this.statusUndoneChunksPending = 0;

        this.isDone = this.calculateIsDone;

    }

    toArray(){
        return [ this.path, this.type, this.size,  this.chunkSize, this.hash, this.chunks  ];
    }

    static fromArray( pandoraBox, arr ){
        return new PandoraBoxStream(pandoraBox, arr[0].toString('ascii'), arr[1], arr[2], arr[3], arr[4], arr[5], [], PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED );
    }

    get absolutePath(){
        const abs = (this._pandoraBox.absolutePath === undefined) ? this._pandoraBox._pandoraProtocolNode.locations._prefix : this._pandoraBox.absolutePath;
        return this._pandoraBox._pandoraProtocolNode.locations.trailingSlash( abs  ).slice(0, -1) + this.path;
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

    get percent(){

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM )
            return (this.chunksCount - this.statusUndoneChunks.length) / (this.chunksCount || 1) * 100 ;
        else
            return this.isDone ? 100 : 0;
    }

}