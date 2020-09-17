const path = require('path');
const rimraf = require("rimraf");
const fs = require('fs');
const fsPromises = fs.promises;

const {createHash} = require('crypto')

const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')
const PandoraBoxStream = require('../../pandora-box/stream/pandora-box-stream')
const PandoraBox = require('../../pandora-box/pandora-box')
const PandoraBoxMetaVersion = require('../../pandora-box/meta/pandora-box-meta-version')
const PandoraBoxStreamStatus = require('../../pandora-box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('./../../pandora-box/pandora-box-helper')
const PandoraBoxMetaHelper = require('./../../pandora-box/meta/pandora-box-meta-helper')

const InterfacePandoraLocations = require('../interface-pandora-locations')

module.exports = class NodePandoraLocations extends InterfacePandoraLocations {

    constructor(kademliaNode, prefix ) {
      super(kademliaNode, prefix, 'node');

      this._fdOpen = [];
      this._fdOpenMap = {};

    }

    async removeDirectory(location  = ''){
        rimraf( location);
    }

    async locationExists(location = ''){
        return fsPromises.exists(location);
    }

    async createEmptyDirectory(location = ''){

        const directory = this.extractLocationBase(location);
        const out = await this.locationExists(directory);
        if (!out) throw "Parent directory doesn't exist";

        const out2 = await this.locationExists(location);
        if (out2) return true;

        return fsPromises.mkdir( location);

    }



    async getLocationInfo(location){

        const out = await this.locationExists(location);
        if (!out) throw 'Location not found';

        const stat = await fsPromises.stat(location);

        if (stat.isFile()) return {type: PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM, size: stat.size};
        if  (stat.isDirectory()) return {type: PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY, size: stat.size};

        throw 'Invalid location type';

    }

    async getLocationDirectoryFiles(location){

        return fsPromises.readdir( location );

    }

    async getLocationStream(location, chunkSize){

        const out = await this.getLocationInfo(location);

        if (out.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY ) throw 'Location is a directory';
        if (out.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
            const readStream = fs.createReadStream(location, { highWaterMark: chunkSize });
            return readStream;
        }
        throw 'Stream Type error';

    }

    async _getLocationStreamChunk(fd, chunkIndex, chunkSize, chunkRealSize){

        const buffer = Buffer.alloc(chunkRealSize);
        await fsPromises.read(fd, buffer, 0, chunkRealSize, chunkIndex * chunkSize);
        return buffer;

    }

    async getLocationStreamChunk(pandoraBoxStream, chunkIndex){

        const location = pandoraBoxStream.absolutePath;

        let found = this._fdOpenMap[location];

        if (!found){
            const fd = await fsPromises.open( location);

            const found = {
                fd,
                timestamp: new Date().getTime(),
            }

            this._fdOpenMap[location] = found;
            this._fdOpen.push(found);

            if (this._fdOpen.length > 1000){
                this._fdOpen.sort((a,b)=>b.timestamp - a.timestamp);
                fs.close(this._fdOpen[1000].fd, ()=>{});
                this._fdOpen.splice( 1000 );
            }

            return this._getLocationStreamChunk(found.fd, chunkIndex, pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex) );

        } else {
            found.timestamp = new Date().getTime();
            return this._getLocationStreamChunk(found.fd, chunkIndex, pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex) );
        }
    }

    async createLocationEmptyStream(location, size){

        const directory = this.extractLocationBase(location);
        const out = await this.locationExists(directory);

        if (!out) throw "Parent folder doesn't exist";
        if ( size < 0 ) throw "Size is invalid";

        const flag = (await fsPromises.exists(location))  ? 'a' : 'w';
        const stream = fsPromises.createWriteStream(location, {flags: flag});

        await stream.write(Buffer.alloc(1), 0, 1, size-1);

        await stream.close();

        return true;

    }

    async writeLocationStreamChunk( buffer, pandoraBoxStream, chunkIndex){

        const stream = fsPromises.createWriteStream( pandoraBoxStream.absolutePath, {flags: 'r+', start: chunkIndex * pandoraBoxStream.chunkSize });

        const out = await stream.write(buffer);

        await stream.close();

        return true;

    }

    async _walkLocation(location, locations = [] ){

        const info = await this.getLocationInfo(location);
        if (!info) throw 'Info not found';

        if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
            locations.push( { path: location, info } );
        }
        else if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) {

            locations.push({path: location, info});

            const streams = await this.getLocationDirectoryFiles(location);

            for (const stream of streams)
                await this._walkLocation(this.trailingSlash(location) + stream, locations);

        } else
            throw "Stream Type invalid";

    }

    async createPandoraBox( boxLocation, name, description, categories, chunkSize, cbProgress){

        boxLocation = this.trailingSlash(boxLocation);

        for (const box of this._kademliaNode.pandoraBoxes.boxes)
            if ( box.absolutePath === box.absolutePath )
                return box;

        const streams = [], locations = [];

        await this._walkLocation( boxLocation, locations);

        for (const location of locations){

            if (location.info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM ){

                const newPath = this.startWithSlash( path.relative( boxLocation, location.path ) || '' );
                this._explodeStreamPath(streams, newPath);

                const stream = await this.getLocationStream(location.path,  chunkSize);

                const sum = createHash('sha256');
                const chunks = [];

                cbProgress(null, {done: false, status: 'location/stream', path: location.path });

                await Streams.splitStreamIntoChunks( stream, chunkSize, ( { done, chunk, chunkIndex } )=>{

                    if ( chunkIndex % 25 === 0)
                        cbProgress(null, {done: false, status: 'location/stream/update', path: location.path, chunkIndex });

                    sum.update(chunk)
                    const hashChunk = createHash('sha256').update(chunk).digest();
                    chunks.push(hashChunk)

                });

                cbProgress( {done: false, status: 'location/stream/done', path: location.path });

                const pandoraStream = new PandoraBoxStream( this,
                    newPath,
                    location.info.type,
                    location.info.size,
                    chunkSize,
                    sum.digest(),
                    chunks,
                    new Array(chunks.length).fill(1),
                    PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED,
                );

                streams.push( pandoraStream );

            }

        }

        const version = PandoraBoxMetaVersion.PANDORA_BOX_META;
        const finalName = name || this.extractLocationName(boxLocation);
        const finalDescription = description;
        const finalCategories =  categories;

        let size = 0;
        for (const stream of streams)
            size += stream.size;

        const metaDataHash = PandoraBoxHelper.computePandoraBoxMetaDataHash( finalDescription, streams )
        const pandoraBox = new PandoraBox( this._kademliaNode, boxLocation, version, finalName, size,  finalCategories, metaDataHash, finalDescription, streams, 0, 0, Buffer.alloc(64) );
        pandoraBox.streamsSetPandoraBox();

        const out = await this._kademliaNode.contactStorage.sybilProtectSign( {message: pandoraBox.hash}, {includeTime: true} );

        pandoraBox._sybilProtectIndex = out.index+1;
        pandoraBox._sybilProtectTime = out.time;
        pandoraBox._sybilProtectSignature = out.signature;

        cbProgress( {done: true });
        return pandoraBox;

    }

}