const {createHash} = require('crypto')

const { WritableStream, ReadableStream, TransformStream } = require('web-streams-polyfill/ponyfill')
const streamsaver = require('streamsaver')
const stream = require('stream')

// change streamsaver WritableStream to be a polyfilled version instead
// see https://github.com/Pandora-Protocol/pandora-protocol-reference/issues/6 @jimmywarting
streamsaver.WritableStream = WritableStream

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

    constructor(kademliaNode, prefix ) {

        super(kademliaNode, prefix, 'browser');

        this._storeChunks = new Storage('locChunks');

    }

    createEmptyDirectory(location = '', cb){
        cb(null, true);
    }

    createLocationEmptyStream(location, size, cb){
        cb(null, true);
    }

    writeLocationStreamChunk( buffer, pandoraBoxStream, chunkIndex, cb){

        this._storeChunks.setItem( pandoraBoxStream.hashHex+':#'+pandoraBoxStream.chunkSize+ ':@:' + chunkIndex, buffer, (err, out)=>{

            if (err ) return cb(err);
            if (buffer.length !== pandoraBoxStream.chunkRealSize(chunkIndex) ) return cb(new Error('Lengths are not matching'));

            cb(null, true);

        } );

    }

    getLocationStreamChunk( pandoraBoxStream, chunkIndex, cb){

        this._storeChunks.getItem( pandoraBoxStream.hashHex+':#'+pandoraBoxStream.chunkSize+ ':@:' + chunkIndex,  (err, buffer )=>{

            if (err ) return cb(err);
            if (buffer.length !== pandoraBoxStream.chunkRealSize(chunkIndex) ) return cb(new Error('Lengths are not matching'));

            cb(null, buffer);

        });

    }

    savePandoraBoxStreamAs(pandoraBoxStream, name, cb ){

        if (!pandoraBoxStream || !(pandoraBoxStream instanceof PandoraBoxStream) ) return cb(new Error('PandoraBoxStream is invalid'))
        if (!pandoraBoxStream.isDone ) return cb(new Error('PandoraBoxStream is not done!'));
        if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) return cb(new Error("In Browser you can't save a directory"))

        if (!name)
            name = this.extractLocationName(pandoraBoxStream.path, true);

        const streamer = streamsaver.createWriteStream( name, { size: pandoraBoxStream.size })
        const writer = streamer.getWriter();

        let stopped = false;

        const chunks = new Array(pandoraBoxStream.chunksCount).fill(1).map( (it, index) => index );

        async.each( chunks, ( chunkIndex, next )=>{

            this.getLocationStreamChunk( pandoraBoxStream, chunkIndex, (err, buffer) =>{

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

        const self = this;

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) return cb(new Error('PandoraBox is invalid'))
        if (!pandoraBox.isDone ) return cb(new Error('PandoraBox is not ready!'));

        if (!name)
            name = pandoraBox.name;

        const iterator = pandoraBox.streams.values();

        let stopped = false;

        new ReadableStream({
            // - streamSaver: hey conflux, give me more data!
            // - conflux: uh? i don't have any data. I'm just a transform stream.
            // - conflux: wait a sec i pull data from the parent readableStream and then forwards it to you.
            async pull (ctrl) {

                const { value, done } = iterator.next()
                const pandoraBoxStream = value;

                if (done) return ctrl.close()

                // do something with value

                if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY){

                    if (pandoraBoxStream.path !== '/')
                        ctrl.enqueue({
                            name: pandoraBoxStream.path,
                            lastModified: new Date(0),
                            folder: true
                        });

                } else if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM){

                    const {chunksCount} = pandoraBoxStream
                    let i = 0

                    const mystream = new ReadableStream({
                        start (ctrl) {
                            // return a promise if you have to wait for something
                            // or remove this altogether
                        },
                        pull (ctrl) {
                            return new Promise( (resolve, reject) => {
                                self.getLocationStreamChunk( pandoraBoxStream, i, (err, buffer) => {
                                    if (err) return reject(err)
                                    if (stopped) return reject(new Error('stopped'))
                                    ctrl.enqueue(buffer)
                                    if (++i === chunksCount) ctrl.close() // done writing this file now
                                    resolve();
                                })
                            })
                        },
                        cancel() {
                            // something cancel
                            // user could have cancel from browser UI
                            // You could remove this also...
                        }
                    })

                    ctrl.enqueue({
                        name: pandoraBoxStream.path,
                        lastModified: new Date(0),
                        stream () {
                            // You could also move all of the above in here too.
                            // (thought it created too much indentation)
                            return mystream
                        },
                    });

                }

            }
        })
            .pipeThrough( new Writer() )
            .pipeTo(streamsaver.createWriteStream(name + '.zip'))



    }

    createPandoraBox( selectedStreams, name, description, chunkSize, cbProgress, cb){

        if (!selectedStreams || !Array.isArray(selectedStreams) || selectedStreams.length === 0) return cb(new Error('Selected streams needs to a non empty array'));

        const streams = [];

        async.eachLimit(  selectedStreams, 1, ( selectedStream, next) => {

            const newPath = this.startWithSlash( selectedStream.path || '' );
            this._explodeStreamPath(streams, newPath);

            const sum = createHash('sha256');
            const chunks = [];

            cbProgress(null, {done: false, status: 'location/stream', path: newPath });

            Streams.splitStreamIntoChunks( selectedStream.stream,  chunkSize, (err, { done, chunk, chunkIndex } )=>{

                if (err) return cb(err, null);

                if (done) {

                    cbProgress(null, {done: false, status: 'location/stream/done', path: newPath });

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

                    if ( chunkIndex % 25 === 0)
                        cbProgress(null, {done: false, status: 'location/stream/update', path: newPath, chunkIndex });

                    sum.update(chunk)
                    const hashChunk = createHash('sha256').update(chunk).digest();
                    chunks.push(hashChunk)
                }


            })

        }, (err, out)=>{

            const version = '0.1';
            const finalName = name;
            const finalDescription = description;

            const streamsHash = PandoraBoxHelper.computePandoraBoxStreamsHash( streams )
            const pandoraBox = new PandoraBox( this._kademliaNode, '', version, finalName, finalDescription, streamsHash, streams, 0, 0, Buffer.alloc(64) );
            pandoraBox.streamsSetPandoraBox();

            this._kademliaNode.contactStorage.sybilSign( pandoraBox.hash, undefined, true).then((out)=> {

                pandoraBox._sybilIndex = out.index+1;
                pandoraBox._sybilTime = out.time;
                pandoraBox._sybilSignature = out.sybilSignature;

                async.eachLimit( selectedStreams, 1, (selectedStream, next) =>{

                    if (selectedStream.pandoraStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM){

                        Streams.splitStreamIntoChunks( selectedStream.stream, chunkSize, (err, { done, chunk, chunkIndex } )=> {

                            if (err) return cb(err, null);
                            if (done) return next();

                            this.writeLocationStreamChunk( chunk, selectedStream.pandoraStream, chunkIndex, (err, out) =>{


                            } )

                        });

                    }

                }, (err, out) =>{

                    cbProgress(null, {done: true });

                    cb(null, pandoraBox );

                } )


            }).catch( err => cb(err) );


        } );

    }

}