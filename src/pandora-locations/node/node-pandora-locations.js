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
const PandoraBoxMetaHelper = require('./../../pandora-box/meta/pandora-box-meta-helper')
const async = require('pandora-protocol-kad-reference').library.async;

const InterfacePandoraLocations = require('../interface-pandora-locations')

module.exports = class NodePandoraLocations extends InterfacePandoraLocations {

    constructor(kademliaNode, prefix ) {
      super(kademliaNode, prefix, 'node');

      this._fdOpen = [];
      this._fdOpenMap = {};

    }

    removeDirectory(location  = '', cb){
        rimraf( location, cb);
    }

    locationExists(location = '', cb){
        return fs.exists(location, cb);
    }

    createEmptyDirectory(location = '', cb){

        const directory = this.extractLocationBase(location);
        this.locationExists(directory, out =>{

            if (!out) return cb(new Error("Parent directory doesn't exist"))

            this.locationExists(location, ( out)=>{

                if (out) return cb(null, true );

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

    getLocationStream(location, chunkSize, cb){

        this.getLocationInfo(location, (err, out)=>{

            if (err) return cb(err);

            if (out.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY ) return cb(new Error('Location is a directory'));
            if (out.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
                const readStream = fs.createReadStream(location, { highWaterMark: chunkSize });
                cb(null, readStream);
            } else
                cb(new Error('Stream Type error'));

        })

    }

    _getLocationStreamChunk(fd, chunkIndex, chunkSize, chunkRealSize, cb){

        const buffer = Buffer.alloc(chunkRealSize);
        fs.read(fd, buffer, 0, chunkRealSize, chunkIndex * chunkSize, (err, out)=>{

            if (err) return cb(err);
            else cb(null, buffer );

        });

    }

    getLocationStreamChunk(pandoraBoxStream, chunkIndex, cb){

        const location = pandoraBoxStream.absolutePath;

        let found = this._fdOpenMap[location];

        if (!found){
            fs.open( location, (err, fd) =>{

                if (err) return cb(err);

                const found = {
                    fd,
                    timestamp: new Date().getTime(),
                }

                this._fdOpenMap[location] = found;
                this._fdOpen.push(found);

                if (this._fdOpen.length > 1000){
                    this._fdOpen.sort((a,b)=>b.timestamp - a.timestamp);
                    fs.close(this._fdOpen[1000].fd, ()=>{

                    });
                    this._fdOpen.splice( 1000 );
                }

                this._getLocationStreamChunk(found.fd, chunkIndex, pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex), cb);

            });
        } else {
            found.timestamp = new Date().getTime();
            this._getLocationStreamChunk(found.fd, chunkIndex, pandoraBoxStream.chunkSize, pandoraBoxStream.chunkRealSize(chunkIndex), cb);
        }
    }

    createLocationEmptyStream(location, size, cb){

        const directory = this.extractLocationBase(location);
        this.locationExists(directory, out =>{

            if (!out) return cb(new Error("Parent folder doesn't exist"))
            if ( size < 0 ) return cb(new Error("Size is invalid"));

            setTimeout(()=>{

                const flag = fs.existsSync(location) ? 'a' : 'w';
                const stream = fs.createWriteStream(location, {flags: flag});

                stream.write(Buffer.alloc(1), 0, 1, size-1);

                stream.close();

                cb(null, true);

            }, 0)


        })

    }

    writeLocationStreamChunk( buffer, pandoraBoxStream, chunkIndex, cb ){

        const stream = fs.createWriteStream( pandoraBoxStream.absolutePath, {flags: 'r+', start: chunkIndex * pandoraBoxStream.chunkSize });
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

    createPandoraBox( boxLocation, name, description, chunkSize, cbProgress, cb){

        boxLocation = this.trailingSlash(boxLocation);

        for (const box of this._kademliaNode.pandoraBoxes.boxes)
            if ( box.absolutePath === box.absolutePath )
                return cb(null, box);

        const streams = [];

        this._walkLocation( boxLocation, (err, location, next )=>{

            if (err) return cb(err,)

            if (location.info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM ){

                const newPath = this.startWithSlash( path.relative( boxLocation, location.path ) || '' );
                this._explodeStreamPath(streams, newPath);

                this.getLocationStream(location.path,  chunkSize,(err, stream )=>{

                    const sum = createHash('sha256');
                    const chunks = [];

                    cbProgress(null, {done: false, status: 'location/stream', path: location.path });

                    Streams.splitStreamIntoChunks( stream, chunkSize, (err, { done, chunk, chunkIndex } )=>{

                        if (err) return cb(err, null);

                        if (done) {

                            cbProgress(null, {done: false, status: 'location/stream/done', path: location.path });

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

                            if ( chunkIndex % 25 === 0)
                                cbProgress(null, {done: false, status: 'location/stream/update', path: location.path, chunkIndex });

                            sum.update(chunk)
                            const hashChunk = createHash('sha256').update(chunk).digest();
                            chunks.push(hashChunk)
                        }

                    });

                })
            } else
                next();

        },  (err, out)=>{


                const version = '0.1';
                const finalName = name || this.extractLocationName(boxLocation);
                const finalDescription = description;

                const streamsHash = PandoraBoxHelper.computePandoraBoxStreamsHash( streams )
                const pandoraBox = new PandoraBox( this._kademliaNode, boxLocation, version, finalName, finalDescription, streamsHash, streams, 0, 0, Buffer.alloc(64) );
                pandoraBox.streamsSetPandoraBox();

                this._kademliaNode.contactStorage.sybilSign( pandoraBox.hash, undefined, true).then((out)=>{

                    pandoraBox._sybilIndex = out.index+1;
                    pandoraBox._sybilTime = out.time;
                    pandoraBox._sybilSignature = out.sybilSignature;

                    cbProgress(null, {done: true });
                    cb(null, pandoraBox );
                }).catch( err => cb(err) );


        })

    }

}