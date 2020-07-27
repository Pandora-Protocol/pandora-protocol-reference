const {createHash} = require('crypto')

const InterfacePandoraLocations = require('../interface-pandora-locations')
const Storage = require('pandora-protocol-kad-reference').storage.Storage;
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')
const async = require('pandora-protocol-kad-reference').library.async;
const PandoraBoxStreamStatus = require('../../pandora-box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('./../../pandora-box/pandora-box-helper')
const PandoraBoxStream = require('../../pandora-box/stream/pandora-box-stream')
const PandoraBox = require('../../pandora-box/pandora-box')

module.exports = class BrowserPandoraLocations extends InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix ) {
        super(pandoraProtocolNode, prefix, 'browser');

        this._storeChunks = new Storage('locChunks');

    }

    createEmptyDirectory(location = '', cb){
        cb(null, true);
    }

    createLocationEmptyStream(location, size, cb){
        cb(null, true);
    }

    writeLocationStreamChunk(location, buffer, chunkIndex, chunkSize, cb){

        this._storeChunks.setItem( location+ ':@:' + chunkIndex, buffer, (err, out)=>{

            if (err || out.length !== buffer.length) return cb(err);
            cb(null, true);

        } );

    }

    createPandoraBox( selectedStreams, name, description, chunkSize = 32 * 1024, cb){

        if (!selectedStreams || !Array.isArray(selectedStreams) || selectedStreams.length === 0) return cb(new Error('Selected streams needs to a non empty array'));

        const streams = [];

        async.eachLimit(  selectedStreams, 1, ( selectedStream, next) => {

            const newPath = this.startWithSlash( selectedStream.path || '' );
            this._explodeStreamPath(streams, newPath);

            const sum = createHash('sha256');
            const chunks = [];

            Streams.splitStreamIntoChunks( selectedStream.stream, chunkSize, (err, { done, chunk } )=>{

                if (err) return cb(err, null);

                if (done) {
                    const pandoraStream = new PandoraBoxStream(this,
                        newPath,
                        PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM,
                        selectedStream.size,
                        chunkSize,
                        sum.digest(),
                        chunks,
                        new Array(chunks.length).fill(1),
                        PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED,
                    );

                    streams.push( pandoraStream );
                    selectedStream.pandoraStream = pandoraStream;

                    return next();

                } else {
                    sum.update(chunk)
                    const hashChunk = createHash('sha256').update(chunk).digest();
                    chunks.push(hashChunk)
                }


            })

        }, (err, out)=>{

            const version = '0.1';
            const finalName = name;
            const finalDescription = description;

            const hash = PandoraBoxHelper.computePandoraBoxHash(version, finalName, finalDescription, streams);
            const pandoraBox = new PandoraBox( this._pandoraProtocolNode, '', version, finalName, finalDescription, hash, streams );

            async.eachLimit( selectedStreams, 1, (selectedStream, next) =>{

                if (selectedStream.pandoraStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM){

                    Streams.splitStreamIntoChunks( selectedStream.stream, chunkSize, (err, { done, chunk, chunkIndex } )=> {

                        if (err) return cb(err, null);
                        if (done) return next();

                        this.writeLocationStreamChunk( selectedStream.pandoraStream.hash.toString('hex'), chunk, chunkIndex, chunkSize, (err, out) =>{


                        } )

                    });

                }

            }, (err, out) =>{

                cb(null, pandoraBox );

            } )


        } );

    }

}