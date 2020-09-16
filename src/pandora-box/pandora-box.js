const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const EventEmitter = require('events')
const PandoraBoxStreamType = require('./stream/pandora-box-stream-type')

const bencode = require('pandora-protocol-kad-reference').library.bencode;
const async = require('pandora-protocol-kad-reference').library.async;
const PandoraBoxMeta = require('./meta/pandora-box-meta')

module.exports = class PandoraBox extends PandoraBoxMeta {

    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, streams, sybilProtectIndex, sybilProtectTime, sybilProtectSignature ) {

        super(kademliaNode, version, name, size, categories, metaDataHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature )

        this.absolutePath = absolutePath;
        this._kademliaNode = kademliaNode;
        this.events = new EventEmitter();

        PandoraBoxHelper.validatePandoraBox(version, size, description,  metaDataHash, streams);

        this.absolutePath = absolutePath;

        this._streams = streams;
        this._description = description;

        this.streamliner = new PandoraBoxStreamliner(kademliaNode, this);

        this.isDone = this.calculateIsDone;

        this.chunksTotal = this._calculateChunksTotal(false);
        this.chunksTotalAvailable = this._calculateChunksTotal(true);

    }

    streamsSetPandoraBox(){
        for (const stream of this.streams)
            stream.setPandoraBox(this);
    }

    get description(){
        return this._description;
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
                if ( !done )
                    chunksTotal += stream.chunksCount;
                else
                    chunksTotal += stream.chunksDone;

        }

        return chunksTotal;
    }

    toArray(){
        const streams = this._streams.map( it => it.toArray() );
        return [ this._version, this._name, this._size, this._categories, this._description, streams, this._sybilProtectIndex, this._sybilProtectTime, this._sybilProtectSignature, ];
    }

    static fromArray(kademliaNode, arr){

        const categories = arr[3].map( it => it.toString() );

        const description = arr[4].toString();

        const streams = PandoraBoxHelper.createPandoraBoxStreams( null, arr[5] );
        const metaDataHash = PandoraBoxHelper.computePandoraBoxMetaDataHash( description, streams  );

        const pandoraBox = new PandoraBox(kademliaNode, '', arr[0], arr[1].toString(), arr[2], categories,  metaDataHash, description, arr[5], arr[6], arr[7], arr[8] );
        pandoraBox.streamsSetPandoraBox();

        return pandoraBox;
    }

    toJSON(){
        return {
            version: this._version,
            name: this._name,
            categories: this._categories,
            description: this._description,
            metaDataHash: this._metaDataHash,
            streams: this._streams.map( it => it.toJSON() ),
            sybilProtectIndex: this._sybilProtectIndex,
            sybilProtectTime: this._sybilProtectTime,
            sybilProtectSignature: this._sybilProtectSignature,
        }
    }

    convertToPandoraBoxMeta(){
        return new PandoraBoxMeta(this._kademliaNode, this._version, this._name, this._size, this._categories, this._metaDataHash, this._sybilProtectIndex, this._sybilProtectTime, this._sybilProtectSignature);
    }

    get percent(){
        return this.chunksTotalAvailable / ( this.chunksTotal || 1) * 100;
    }

    save(cb){

        this._kademliaNode.storage.getItem('pandoraBoxes:box:hash-exists:'+this.hashHex, (err, out) =>{

            if (err) return cb(err);

            if ( out && out === "1" ) return cb(null, false );

            const json = {
                encoded: bencode.encode( this.toArray() ).toString('base64'),
                absolutePath: this.absolutePath,
            }

            this._kademliaNode.storage.setItem('pandoraBoxes:box:hash:'+this.hashHex, JSON.stringify(json), (err, out)=>{

                if (err) return cb(err);

                this._kademliaNode.storage.setItem('pandoraBoxes:box:hash-exists:'+this.hashHex, "1", (err, out)=>{

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

    remove(cb){

        this._kademliaNode.storage.removeItem('pandoraBoxes:box:hash:'+this.hashHex, (err, out)=>{

            if (err) return cb(err);

            this._kademliaNode.storage.setItem('pandoraBoxes:box:hash-exists:'+this.hashHex, (err, out)=>{

                if (err) return cb(err);

                async.eachLimit( this.streams, 1, ( stream, next ) => {

                    stream.removeStatus((err, out)=>{

                        if (err) return next(err);
                        next();

                    })

                }, (err, out) =>{

                    if (err) return cb(err);
                    cb(null, true);

                } );

            } )

        } )

    }

    static load(kademliaNode, hash, cb){

        kademliaNode.storage.getItem('pandoraBoxes:box:hash:'+hash, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error('PandoraBox was not found by hash'))

            const json = JSON.parse(out);

            const decoded = bencode.decode( Buffer.from( json.encoded, 'base64') );
            const box = PandoraBox.fromArray( kademliaNode, decoded ) ;
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