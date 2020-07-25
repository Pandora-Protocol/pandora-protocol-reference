const path = require('path');
const rimraf = require("rimraf");
const fs = require('fs');
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')

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

        this.locationExists(location, ( out)=>{

            if (out) return cb(new Error('Directory already exists') );

            fs.mkdir( location, cb );

        })

    }

    getLocationName(location, cb){

        this.locationExists(location, (out)=> {

            if (!out) return cb(new Error('Location not found'));
            cb(null, path.basename(location));

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

}