const {createHash} = require('crypto')

const { WritableStream, ReadableStream, TransformStream } = require('web-streams-polyfill/ponyfill')
const streamsaver = require('streamsaver')

// change streamsaver WritableStream to be a polyfilled version instead
// see https://github.com/Pandora-Protocol/pandora-protocol-reference/issues/6 @jimmywarting
streamsaver.WritableStream = WritableStream

const InterfacePandoraLocations = require('../interface-pandora-locations')
const Storage = require('pandora-protocol-kad-reference').storage.Storage;
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')
const PandoraBoxStreamStatus = require('../../pandora-box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('./../../pandora-box/pandora-box-helper')
const PandoraBoxStream = require('../../pandora-box/stream/pandora-box-stream')
const PandoraBox = require('../../pandora-box/pandora-box')
const PandoraBoxMetaVersion = require('../../pandora-box/meta/pandora-box-meta-version')
const { Writer } = require("@transcend-io/conflux");

module.exports = class BrowserPandoraLocations extends InterfacePandoraLocations {

    constructor(kademliaNode, prefix ) {

        super(kademliaNode, prefix, 'browser');

        this._storeChunks = new Storage('locChunks');

    }

    createEmptyDirectory(location = ''){
        return true;
    }

    createLocationEmptyStream(location, size){
        return true;
    }

    async writeLocationStreamChunk( buffer, pandoraBoxStream, chunkIndex){

        const out = await this._storeChunks.setItem( pandoraBoxStream.hashHex+':#'+pandoraBoxStream.chunkSize+ ':@:' + chunkIndex, buffer);

        if (buffer.length !== pandoraBoxStream.chunkRealSize(chunkIndex) ) throw 'Lengths are not matching';
        return true;

    }

    async getLocationStreamChunk( pandoraBoxStream, chunkIndex){

        const buffer = await this._storeChunks.getItem( pandoraBoxStream.hashHex+':#'+pandoraBoxStream.chunkSize+ ':@:' + chunkIndex);

        if (buffer.length !== pandoraBoxStream.chunkRealSize(chunkIndex) ) throw 'Lengths are not matching';

        return buffer;

    }

    async savePandoraBoxStreamAs(pandoraBoxStream, name, cbProgress ){

        if (!pandoraBoxStream || !(pandoraBoxStream instanceof PandoraBoxStream) ) throw 'PandoraBoxStream is invalid';
        if (!pandoraBoxStream.isDone ) throw 'PandoraBoxStream is not done!';
        if (pandoraBoxStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) throw "In Browser you can't save a directory";

        if (!name)
            name = this.extractLocationName(pandoraBoxStream.path, true);

        const streamer = streamsaver.createWriteStream( name, { size: pandoraBoxStream.size })
        const writer = streamer.getWriter();

        let stopped = false;

        for (let chunkIndex=0; chunkIndex < pandoraBoxStream.chunksCount; chunkIndex++){

            const buffer = await this.getLocationStreamChunk( pandoraBoxStream, chunkIndex);

            if (stopped) throw 'Stopped';

            await writer.write(buffer);

            if (cbProgress) cbProgress({ chunkIndex: chunkIndex });

        }

        await writer.close();
        cbProgress({ done: true });

        return {
            stop: ()=> stopped = true,
        }

    }

    savePandoraBoxAs(pandoraBox, name){

        const self = this;

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw 'PandoraBox is invalid'
        if (!pandoraBox.isDone ) throw 'PandoraBox is not ready!';

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
                        async pull (ctrl) {

                            const buffer = await self.getLocationStreamChunk( pandoraBoxStream, i);
                            if (stopped) throw 'stopped';

                            ctrl.enqueue(buffer)
                            if (++i === chunksCount) ctrl.close() // done writing this file now
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

    async createPandoraBox( selectedStreams, name, description, categories, chunkSize, cbProgress){

        if (!selectedStreams || !Array.isArray(selectedStreams) || !selectedStreams.length) throw 'Selected streams needs to a non empty array';

        const streams = [];

        for (const selectedStream of selectedStreams) {

            const newPath = this.startWithSlash(selectedStream.path || '');
            this._explodeStreamPath(streams, newPath);

            const sum = createHash('sha256');
            const chunks = [];

            cbProgress({ status: 'location/stream', path: newPath});

            await Streams.splitStreamIntoChunks(selectedStream.stream, chunkSize, ({ chunk, chunkIndex}) => {

                if (chunkIndex % 25 === 0)
                    cbProgress({done: false, status: 'location/stream/update', path: newPath, chunkIndex});

                sum.update(chunk)
                const hashChunk = createHash('sha256').update(chunk).digest();
                chunks.push(hashChunk)

            });

            cbProgress({ status: 'location/stream/done', path: newPath});

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

            streams.push(pandoraStream);
            selectedStream.pandoraStream = pandoraStream;
        }

        const version = PandoraBoxMetaVersion.PANDORA_BOX_META;
        const finalName = name;
        const finalDescription = description;
        const finalCategories =  categories;

        let size = 0;
        for (const stream of streams)
            size += stream.size;

        const metaDataHash = PandoraBoxHelper.computePandoraBoxMetaDataHash( finalDescription, streams )
        const pandoraBox = new PandoraBox( this._kademliaNode, '', version, finalName, size, finalCategories, metaDataHash, finalDescription, streams, 0, 0, Buffer.alloc(64) );
        pandoraBox.streamsSetPandoraBox();

        const out = await this._kademliaNode.contactStorage.sybilProtectSign( {message: pandoraBox.hash}, {includeTime: true} );

        pandoraBox._sybilProtectIndex = out.index+1;
        pandoraBox._sybilProtectTime = out.time;
        pandoraBox._sybilProtectSignature = out.signature;

        for (const selectedStream of selectedStreams){

            if (selectedStream.pandoraStream.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM)
                await Streams.splitStreamIntoChunks( selectedStream.stream, chunkSize, async ( {  chunk, chunkIndex } ) => {

                    await this.writeLocationStreamChunk( chunk, selectedStream.pandoraStream, chunkIndex);

                });

        }

        cbProgress( {done: true });
        return pandoraBox;

    }

}