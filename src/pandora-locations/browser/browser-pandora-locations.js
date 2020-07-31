const {createHash} = require('crypto')
const streamsaver = require('streamsaver')
const stream = require('stream')

const InterfacePandoraLocations = require('../interface-pandora-locations')
const Storage = require('pandora-protocol-kad-reference').storage.Storage;
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')
const async = require('pandora-protocol-kad-reference').library.async;
const PandoraBoxStreamStatus = require('../../pandora-box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('./../../pandora-box/pandora-box-helper')
const PandoraBoxStream = require('../../pandora-box/stream/pandora-box-stream')
const PandoraBox = require('../../pandora-box/pandora-box')
const { Writer } = require("@transcend-io/conflux");

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

            if (err ) return cb(err);
            if (out.length !== buffer.length) return cb(new Error('Lengths are not matching'));

            cb(null, true);

        } );

    }

    getLocationStreamChunk(location, chunkIndex, chunkSize, chunkRealSize, cb){

        this._storeChunks.getItem( location+ ':@:' + chunkIndex,  (err, buffer )=>{

            if (err ) return cb(err);
            if (buffer.length !== chunkRealSize) return cb(new Error('Lengths are not matching'));

            cb(null, buffer);

        });

    }

    savePandoraBoxStreamAs(pandoraBoxStream, name, cb ){

        if (!pandoraBoxStream || !(pandoraBoxStream instanceof PandoraBoxStream) ) return cb(new Error('PandoraBoxStream is invalid'))
        if (!pandoraBoxStream.isDone ) return cb(new Error('PandoraBoxStream is not done!'));
        if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) return cb(new Error("In Browser you can't save a directory"))

        if (!name)
            name = this.extractLocationName(pandoraBoxStream.path);

        const streamer = streamsaver.createWriteStream( name, { size: pandoraBoxStream.size })
        const writer = streamer.getWriter();

        let stopped = false;

        const chunks = [];
        for (let i=0; i < pandoraBoxStream.chunksCount; i++)
            chunks.push(i);

        async.each( chunks, ( chunkIndex, next )=>{

            this.getLocationStreamChunk( pandoraBoxStream.absolutePath, chunkIndex, pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex), (err, buffer) =>{

                if (err) return next(err);
                if (stopped) return next(new Error('stopped'));

                writer.write(buffer);
                cb({ done: false, chunkIndex: chunkIndex });

                if (chunkIndex === chunks.length-1) {
                    writer.close();
                    next();
                }

            } );

        }, (err, out) =>{

            if (!err)
                cb({ done: true });

        } )

        return {
            stop: ()=> stopped = true,
        }

    }

    savePandoraBoxAs(pandoraBox, name, cb){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) return cb(new Error('PandoraBox is invalid'))
        if (!pandoraBox.isDone ) return cb(new Error('PandoraBox is not ready!'));

        if (!name)
            name = pandoraBox.name;

        const streamer = streamsaver.createWriteStream( name + '.zip', )

        const {readable, writable } = new Writer();
        const writer = writable.getWriter();

        let stopped = false;

        async.eachLimit( pandoraBox.streams, 1, (pandoraBoxStream, next) => {

            if (stopped) return next(new Error('stopped'));

            if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY){

                if (pandoraBoxStream.path !== '/')
                    writer.write({
                        name: pandoraBoxStream.path,
                        lastModified: new Date(0),
                        folder: true
                    });

                next();

            } else if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM){

                const mystream = new stream.PassThrough();

                const chunks = [];
                for (let i=0; i < pandoraBoxStream.chunksCount; i++)
                    chunks.push(i);

                async.each( chunks, ( chunkIndex, next2 )=>{

                    this.getLocationStreamChunk( pandoraBoxStream.absolutePath, chunkIndex, pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex), (err, buffer) => {

                        if (err) return next(err);
                        if (stopped) return next(new Error('stopped'));

                        mystream.write(buffer);

                        next2();

                    });

                }, (err, out ) => {

                    if (!err) {

                        // Add a file
                        writer.write({
                            name: pandoraBoxStream.path,
                            lastModified: new Date(0),
                            stream: mystream,
                        });

                        mystream.end();
                    }

                    next();

                });

            }

        }, (err) => {

            if (!err) {
                readable.pipeTo(streamer);
                writer.close();
            }

            cb(null, { done: true } )

        } );

        return {
            stop: ()=> stopped = true,
        }

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