const InterfacePandoraLocations = require('../interface-pandora-locations')
const Storage = require('pandora-protocol-kad-reference').storage.Storage;
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')

module.exports = class BrowserPandoraLocations extends InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix ) {
        super(pandoraProtocolNode, prefix, 'browser');

        this._store = new Storage('locations');

    }

    createEmptyDirectory(location = '', cb){

        this._store.getItem(location, (err, out)=>{

            if (err) return cb(err);

            if (out) return cb(new Error('Directory already exists') );
            this._store.setItem(location, {type: PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY, size: 0  }, cb );

        })

    }

    getLocationName(location, cb){

        this._store.getItem(location, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error("Location doesn't exit"));

            return this.extractFileBase(location);

        })

    }

    getLocationInfo(location, cb){

        this._store.getItem(location, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error("Location doesn't exit"));

            return out;

        })

    }

    walkLocation(location, cb, done ){

        this._store.getItem(location, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error('Location not found'), );

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

        });

    }


}