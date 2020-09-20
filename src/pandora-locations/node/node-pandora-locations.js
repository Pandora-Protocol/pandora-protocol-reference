const path = require('path');
const rimraf = require("rimraf");
const fs = require('fs');
const fsPromises = fs.promises;

const {createHash} = require('crypto')

const PandoraStreamType = require('../../pandora-box/box/stream/pandora-box-stream-type')
const PandoraBoxStream = require('../../pandora-box/box/stream/pandora-box-stream')
const PandoraBoxSybil = require('../../pandora-box/box-sybil/pandora-box-sybil')
const SybilProtect = require('../../sybil-protect/sybil-protect')
const PandoraBoxMetaVersion = require('../../pandora-box/meta/pandora-box-meta-version')
const PandoraBoxStreamStatus = require('../../pandora-box/box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('../../pandora-box/box/pandora-box-helper')
const PandoraBoxMetaHelper = require('./../../pandora-box/meta/pandora-box-meta-helper')

const InterfacePandoraLocations = require('../interface-pandora-locations')

module.exports = class NodePandoraLocations extends InterfacePandoraLocations {

    constructor(kademliaNode, prefix ) {

      super(kademliaNode, prefix, 'node');

      this._fdOpen = [];
      this._fdOpenMap = {};

    }

    async _getStream(location ){

        let found = this._fdOpenMap[location];

        if (found){
            found.timestamp = new Date().getTime();
            return found.fd;
        }

        const fd = await fsPromises.open( location, 'r+');

        found = {
            fd,
            timestamp: new Date().getTime(),
        }

        this._fdOpenMap[location] = found;
        this._fdOpen.push(found);

        if (this._fdOpen.length > 1000){
            this._fdOpen.sort((a,b)=>b.timestamp - a.timestamp);
            const last = this._fdOpen[1000].fd;
            this._fdOpen.splice( 1000 );
            await fs.close(last);
        }

        return fd;

    }

    async removeDirectory(location  = ''){
        rimraf( location);
    }

    async locationExists(location = ''){
        return new Promise(function(resolve, reject){
            fs.exists(location, exists => resolve(exists) );
        })
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

    async getLocationStreamChunk(pandoraBoxStream, chunkIndex){

        const location = pandoraBoxStream.absolutePath;
        const fd = await this._getStream(location);

        const chunkRealSize = pandoraBoxStream.chunkRealSize(chunkIndex);

        const buffer = Buffer.alloc(chunkRealSize);

        await fd.read( buffer, 0, chunkRealSize, chunkIndex * pandoraBoxStream.chunkSize);

        return buffer;

    }

    async createLocationEmptyStream(location, size){

        const directory = this.extractLocationBase(location);
        const out = await this.locationExists(directory);

        if (!out) throw "Parent folder doesn't exist";
        if ( size < 0 ) throw "Size is invalid";

        const flag = (await this.locationExists(location) )  ? 'a' : 'w';
        const stream = await fsPromises.open(location, flag);

        await stream.write( Buffer.alloc(1), 0, 1, size-1 );

        await stream.close();

        return true;
    }

    async writeLocationStreamChunk( buffer, pandoraBoxStream, chunkIndex){

        const stream = await this._getStream(pandoraBoxStream.absolutePath);

        stream.write(buffer, 0, pandoraBoxStream.chunkRealSize(chunkIndex), chunkIndex * pandoraBoxStream.chunkSize,  );

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

                cbProgress( {status: 'location/stream', path: location.path });

                await Streams.splitStreamIntoChunks( stream, chunkSize, ( { done, chunk, chunkIndex } )=>{

                    if ( chunkIndex % 25 === 0)
                        cbProgress( {status: 'location/stream/update', path: location.path, chunkIndex });

                    sum.update(chunk)
                    const hashChunk = createHash('sha256').update(chunk).digest();
                    chunks.push(hashChunk)

                });

                cbProgress( { status: 'location/stream/done', path: location.path });

                const pandoraStream = new PandoraBoxStream( this,
                    newPath,
                    location.info.type,
                    location.info.size,
                    sum.digest(),
                    chunkSize,
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

        const metaDataHash = PandoraBoxHelper.computePandoraBoxMetaDataHash( finalDescription, chunkSize, streams )

        const sybilProtect = new SybilProtect(this._kademliaNode, 0, 0, Buffer.alloc(64));

        const pandoraBox = new PandoraBoxSybil( this._kademliaNode, boxLocation, version, finalName, size, finalCategories, metaDataHash, finalDescription, chunkSize, streams, sybilProtect );
        await pandoraBox.boxSybilProtectSign();

        cbProgress( {done: true });

        return pandoraBox;

    }

}