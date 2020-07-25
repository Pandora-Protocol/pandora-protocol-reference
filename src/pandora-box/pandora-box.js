const Streams = require('../helpers/streams')
const path = require('path');
const CryptoHelpers = require('../helpers/crypto-helpers')
const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraStreamType = require('./stream/pandora-box-stream-type')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const PandoraBoxStreamStatus = require('./stream/pandora-box-stream-status')
const EventEmitter = require('events')

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
        this._streams = streams

        this.absolutePath = absolutePath;

        this.streamliner = new PandoraBoxStreamliner(pandoraProtocolNode, this);

        this.isDone = this.calculateIsDone;
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

    get streams(){
        return this._streams;
    }

    computeSuffixIdHash(suffix){

        return CryptoHelpers.sha256(Buffer.concat([
            Buffer.from(suffix + ':', 'ascii'),
            this.hash,
        ]));

    }

    static createPandoraBox(pandoraProtocolNode, boxLocation, name, description, chunkSize = 32 * 1024, cb){

        const streams = [];

        pandoraProtocolNode.locations.walkLocation( boxLocation, (err, location, next )=>{

            if (err) return cb(err,)

            if (location.info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM ){
                pandoraProtocolNode.locations.getLocationStream(location.path, (err, stream)=>{

                    Streams.computeStreamHashAndChunks( stream,  chunkSize, (err, {hash, chunks} )=>{

                        if (err) return cb(err, null);

                        const newPath = path.relative( boxLocation, location.path ) || '';
                        const newStream = new PandoraBoxStream( this,
                            (newPath[0] !== '/' ? '/' : '') + newPath,
                            location.info.type,
                            location.info.size,
                            chunkSize,
                            hash,
                            chunks,
                            new Array(chunks.length).fill(1),
                            PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED,
                        );

                        streams.push( newStream );
                        next();

                    });

                })
            } else { //directory

                const newPath = path.relative( boxLocation, location.path ) || '';
                const newStream = new PandoraBoxStream( this,
                    (newPath[0] !== '/' ? '/' : '') + newPath,
                    location.info.type,
                    0,
                    0,
                    Buffer.alloc(global.KAD_OPTIONS.NODE_ID_LENGTH),
                    [],
                    [],
                    PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED,
                );

                streams.push( newStream );
                next();

            }

        }, (err, out)=>{


            const version = '0.1';
            const finalName = name || path.basename(boxLocation);
            const finalDescription = description;

            const hash = PandoraBoxHelper.computePandoraBoxHash(version, finalName, finalDescription, streams);
            const pandoraBox = new PandoraBox(pandoraProtocolNode, boxLocation, version, finalName, finalDescription, hash, streams );

            cb(null, pandoraBox );
        })

    }

    get calculateIsDone(){

        for (const stream of this.streams)
            if ( !stream.isDone ) return false;

        return true;
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

}