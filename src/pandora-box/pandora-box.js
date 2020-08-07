const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const EventEmitter = require('events')
const PandoraBoxStreamType = require('./stream/pandora-box-stream-type')

module.exports = class PandoraBox extends EventEmitter {

    constructor(pandoraProtocolNode, absolutePath, version, name, description, hash, streams) {

        super();

        this._pandoraProtocolNode = pandoraProtocolNode;

        for (const stream of streams)
            stream._pandoraBox = this;

        PandoraBoxHelper.validatePandoraBox(version, name, description, hash, streams);

        this._version = version;
        this._name = name;
        this._description = description;
        this._hash = hash;
        this._hashHex = hash.toString('hex')

        this._streams = streams

        this.chunksTotal = this._calculateChunksTotal(false);

        this.absolutePath = absolutePath;

        this.streamliner = new PandoraBoxStreamliner(pandoraProtocolNode, this);

        this.isDone = this.calculateIsDone;
        this.chunksTotalAvailable = this._calculateChunksTotal(true);
    }

    get version(){
        return this._version;
    }

    get name(){
        return this._name;
    }

    get description(){
        return this._description;
    }

    get hash(){
        return this._hash;
    }

    get hashHex(){
        return this._hashHex;
    }

    get streams(){
        return this._streams;
    }

    get calculateIsDone(){

        for (const stream of this.streams)
            if ( !stream.isDone ) return false;

        return true;
    }

    _calculateChunksTotal(done){

        let chunksTotal = 0;
        for (const stream of this.streams) {
            if (stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM  )
                if ( !done || (done && stream.isDone)  )
                    chunksTotal += stream.chunksCount;
        }

        return chunksTotal;
    }

    toArray(){
        const streams = this.streams.map( it => it.toArray() );
        return [ this.version, this.name, this.description, this.hash, streams ];
    }

    static fromArray(pandoraProtocolNode, arr){
        const streams = arr[4].map ( it => PandoraBoxStream.fromArray(this, it )  );
        return new PandoraBox(pandoraProtocolNode, undefined, arr[0].toString('ascii'), arr[1].toString('ascii'), arr[2].toString('ascii'), arr[3], streams );
    }

    toJSON(){
        return {
            name: this.name,
            description: this.description,
            hash: this.hash.toString('hex'),
            streams: this.streams.map( it => it.toJSON() ),
        }
    }

    get percent(){
        return this.chunksTotalAvailable / ( this.chunksTotal || 1) * 100;
    }

}