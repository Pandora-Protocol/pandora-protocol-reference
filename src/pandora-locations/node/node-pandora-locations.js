const path = require('path');
const rimraf = require("rimraf");
const fs = require('fs');
const {createHash} = require('crypto')

const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')
const PandoraBoxStream = require('../../pandora-box/stream/pandora-box-stream')
const PandoraBox = require('../../pandora-box/pandora-box')
const PandoraBoxStreamStatus = require('../../pandora-box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('./../../pandora-box/pandora-box-helper')
const async = require('pandora-protocol-kad-reference').library.async;

const InterfacePandoraLocations = require('../interface-pandora-locations')

module.exports = class NodePandoraLocations extends InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix ) {
      super(pandoraProtocolNode, prefix, 'node');
    }

    removeDirectory(location  = '', cb){
        rimraf( location, cb);
    }

    locationExists(location = '', cb){
        return fs.exists(location, cb);
    }

    createEmptyDirectory(location = '', cb){

        const path = this.extractFilePath(location);
        this.locationExists(path, out =>{

            if (!out) return cb(new Error("Parent directory doesn't exist"))

            this.locationExists(location, ( out)=>{

                if (out) return cb(new Error('Directory already exists') );

                fs.mkdir( location, cb );

            })

        });

    }



    getLocationInfo(location, cb){

        this.locationExists(location, out => {

            if (!out) return cb(new Error('Location not found'));

            const stat = fs.statSync(location);
            if (stat.isFile()) return cb(null, {type: PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM, size: stat.size} );
            else if  (stat.isDirectory()) cb(null, {type: PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY, size: stat.size} );
            else cb(new Error('Invalid location type'));

        })

    }

    getLocationDirectoryFiles(location, cb){

        fs.readdir(location, (err,  streams)=>{

            if (err) return cb(err);
            cb(null, streams);

        });

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

    createLocationEmptyStream(location, size, cb){

        const path = this.extractFilePath(location);
        this.locationExists(path, out =>{

            if (!out) return cb(new Error("Parent folder doesn't exist"))

            const chunk = 32*1024*1024;
            let i = 0,  buffer ;
            while (i < size){

                const currentSize = Math.min( chunk, size - i);
                i += currentSize;
                if (!Buffer.isBuffer(buffer) || buffer.length !== currentSize)
                    buffer = Buffer.alloc(currentSize);

                const flag = fs.existsSync(location) ? 'a' : 'w';
                const stream = fs.createWriteStream(location, {flags: flag});
                stream.write(buffer);
                stream.close();

            }

            cb(null, true);

        })

    }

    writeLocationStreamChunk(location, buffer, chunkIndex, chunkSize, cb){

        const stream = fs.createWriteStream(location, {flags: 'r+', start: chunkIndex*chunkSize });
        stream.write(buffer, (err, out)=>{

            stream.close();

            if (err) return cb(err);
            cb(null, true);

        });

    }

    _walkLocation(location, cb, done ){

        this.getLocationInfo(location, (err, info )=>{

            if (err) return cb(err);
            if (!info) return cb(new Error('Info not found'));

            if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
                cb(null, { path: location, info }, done);
            }
            else if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) {
                cb(null, { path: location, info }, ()=>{

                    this.getLocationDirectoryFiles(location, (err, streams)=>{

                        if (err) return done(err);
                        async.eachLimit( streams, 1, (stream, next)=>{

                            this._walkLocation(this.trailingSlash(location) + stream, cb,next );

                        }, done );

                    })

                });

            } else
                cb( new Error("Stream Type invalid"))
        })

    }

    createPandoraBox( boxLocation, name, description, chunkSize = 32 * 1024, cb){

        const streams = [];

        this._walkLocation( boxLocation, (err, location, next )=>{

            if (err) return cb(err,)

            if (location.info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM ){

                const newPath = this.startWithSlash( path.relative( boxLocation, location.path ) || '' );
                this._explodeStreamPath(streams, newPath);

                this.getLocationStream(location.path, (err, stream)=>{

                    const sum = createHash('sha256');
                    const chunks = [];

                    Streams.splitStreamIntoChunks( stream,  chunkSize, (err, { done, chunk } )=>{

                        if (err) return cb(err, null);

                        if (done) {

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
                            return next();
                        }
                        else {
                            sum.update(chunk)
                            const hashChunk = createHash('sha256').update(chunk).digest();
                            chunks.push(hashChunk)
                        }

                    });

                })
            } else
                next();

        }, (err, out)=>{

            const version = '0.1';
            const finalName = name || path.basename(boxLocation);
            const finalDescription = description;

            const hash = PandoraBoxHelper.computePandoraBoxHash(version, finalName, finalDescription, streams);
            const pandoraBox = new PandoraBox( this._pandoraProtocolNode, boxLocation, version, finalName, finalDescription, hash, streams );

            cb(null, pandoraBox );

        })

    }

}