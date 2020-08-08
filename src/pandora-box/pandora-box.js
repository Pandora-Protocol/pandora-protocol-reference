const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const EventEmitter = require('events')
const PandoraBoxStreamType = require('./stream/pandora-box-stream-type')
const bencode = require('pandora-protocol-kad-reference').library.bencode;
const async = require('pandora-protocol-kad-reference').library.async;

module.exports = class PandoraBox extends EventEmitter {

    constructor(pandoraProtocolNode, absolutePath, version, name, description, hash, streams) {

        super();

        this._pandoraProtocolNode = pandoraProtocolNode;

        for (let i=0; i < streams.length; i++)
            if ( !(streams[i] instanceof PandoraBoxStream) )
                streams[i] = PandoraBoxStream.fromArray(this, streams[i] );

        PandoraBoxHelper.validatePandoraBox(version, name, description, hash, streams);

        this.absolutePath = absolutePath;

        this._version = version;
        this._name = name;
        this._description = description;
        this._hash = hash;
        this._hashHex = hash.toString('hex')

        this._streams = streams;

        this.chunksTotal = this._calculateChunksTotal(false);

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
        return new PandoraBox(pandoraProtocolNode, undefined, arr[0].toString('ascii'), arr[1].toString('ascii'), arr[2].toString('ascii'), arr[3], arr[4] );
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

    save(cb){

        this._pandoraProtocolNode.storage.getItem('pandoraBoxes:box:hash-exists:'+this.hashHex, (err, out) =>{

            if (err) return cb(err);

            if ( out && out === "1" ) return cb(null, false );

            const json = {
                encoded: bencode.encode( this.toArray() ).toString('base64'),
                absolutePath: this.absolutePath,
            }

            this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:hash:'+this.hashHex, JSON.stringify(json), (err, out)=>{

                if (err) return cb(err);

                this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:hash-exists:'+this.hashHex, "1", (err, out)=>{

                    if (err) return cb(err);

                    async.eachLimit( this.streams, 1, ( stream, next ) => {

                        stream.saveStatus((err, out)=>{

                            if (err) return next(err);
                            next();

                        })

                    }, (err, out) =>{

                        if (err) return cb(err);
                        cb(null, true);

                    } );

                } )

            } )

        });

    }

    static load(pandoraProtocolNode, hash, cb){

        pandoraProtocolNode.storage.getItem('pandoraBoxes:box:hash:'+hash, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error('PandoraBox was not found by hash'))

            const json = JSON.parse(out);

            const decoded = bencode.decode( Buffer.from( json.encoded, 'base64') );
            const box = PandoraBox.fromArray( pandoraProtocolNode, decoded ) ;
            box.absolutePath = json.absolutePath;

            async.eachLimit( box.streams, 1, ( stream, next ) => {

                stream.loadStatus((err, out)=>{

                    if (err) return next(err);
                    next();

                })

            }, (err, out) =>{

                box.isDone = box.calculateIsDone;
                box.chunksTotalAvailable = box._calculateChunksTotal(true);

                if (err) return cb(err);
                cb(null, box);

            } );

        } )

    }

}