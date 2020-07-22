const path = require('path');
const rimraf = require("rimraf");
const fs = require('fs');
const async = require('pandora-protocol-kad-reference').library.async;
const PandoraStreamType = require('../pandora-box/stream/pandora-box-stream-type')

module.exports = class PandoraLocations {

    constructor(pandoraProtocolNode, prefix = '') {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._prefix = this.trailingSlash(prefix);
    }

    trailingSlash(str  = ''){

        if (str.substr(-1) !== '/')         // If the last character is not a slash
            str = str + '/';            // Append a slash to it.

        return str
    }

    removeDirectory(location  = '', cb){
        rimraf( location, cb);
    }

    removeDirectorySync(location  = ''){
        rimraf.sync(  location );
    }

    createEmptyDirectory(location = ''){

        if (!fs.existsSync( location ))
            fs.mkdirSync( location );

    }

    getLocationName(location, cb){

        if (!fs.existsSync(location))
            return cb(new Error('Location not found'),);

        cb(null, path.basename(location));
    }

    getLocationInfo(location, cb){
        if (!fs.existsSync(location))
            return cb(new Error('Location not found'), );

        const stat = fs.statSync(location);
        if (stat.isFile()) return cb(null, {type: PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM, size: stat.size} );
        else if  (stat.isDirectory()) cb(null, {type: PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY, size: stat.size} );
        else cb(new Error('Invalid location type'));

    }

    walkLocation(location, cb, done ){

        if (!fs.existsSync(location))
            return cb(new Error('Location not found'), );

        this.getLocationInfo(location, (err, info )=>{
            if (err) return cb(err);

            if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
                cb(null, { path: location, info }, done);
            }
            else if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) {
                cb(null, { path: location, info }, ()=>{

                    const streams = fs.readdirSync(location);
                    async.eachLimit( streams, 1, (stream, next)=>{

                        this.walkLocation(this.trailingSlash(location) + stream, cb,next );

                    }, done );

                });

            } else
                cb( new Error("Stream Type invalid"))
        })


    }

    getLocationStream(location, cb){

        this.getLocationInfo(location, (err, out)=>{
            if (err) return cb(err);

            if (out.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY ) return cb(new Error('Location is a directory'));
            if (out.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
                const readStream = fs.createReadStream(location);
                cb(null, readStream);
            } else
                cb(new Error('Stream Type error'));

        })

    }

    getLocationStreamChunk(location, chunkIndex, chunkSize, chunkRealSize, cb){

        fs.open( location, (err, fd) =>{

            if (err) return cb(err);

            const buffer = Buffer.alloc(chunkRealSize);
            fs.read(fd, buffer, 0, chunkRealSize, chunkIndex * chunkSize, (err, out)=>{

                fs.close(fd, ()=>{

                });

                if (err) return cb(err);
                else cb(null, buffer );

            });

        } );

    }

    createLocationStream(location, size, cb){

        let i = 0, chunk = 32*1024*1024, buffer ;
        while (i < size){

            const currentSize = Math.min( chunk, size - i);
            i += currentSize;
            if (!Buffer.isBuffer(buffer) || buffer.length !== currentSize)
                buffer = Buffer.alloc(currentSize);

            const flag = fs.existsSync(location) ? 'w' : 'a';
            const stream = fs.createWriteStream(location, {flags: flag});
            stream.write(buffer);
            stream.close();

        }

        cb(null, true);

    }

    writeLocationStreamChunk(location, buffer, chunkIndex, chunkSize, cb){

        const stream = fs.createWriteStream(location, {flags: 'r+', start: chunkIndex*chunkSize });
        stream.write(buffer, (err, out)=>{

            stream.close();
            cb(null, true);

        });

    }

}