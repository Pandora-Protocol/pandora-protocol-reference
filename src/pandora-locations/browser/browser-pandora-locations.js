const InterfacePandoraLocations = require('../interface-pandora-locations')
const Storage = require('pandora-protocol-kad-reference').storage.Storage;
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')

module.exports = class BrowserPandoraLocations extends InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix ) {
        super(pandoraProtocolNode, prefix, 'browser');

        this._storeInfo = new Storage('locInfo');
        this._storeDirectories = new Storage('locDir');
        this._storeChunks = new Storage('locChunks');

    }

    createEmptyDirectory(location = '', cb){

        this._storeInfo.getItem(location, (err, out)=>{

            if (err) return cb(err);

            if (out) return cb(new Error('Directory already exists') );
            this._storeInfo.setItem(location, {type: PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY, size: 0  }, cb );

        })

    }

    getLocationName(location, cb){

        this._storeInfo.getItem(location, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error("Location doesn't exit"));

            return this.extractFileBase(location);

        })

    }

    getLocationInfo(location, cb){

        this._storeInfo.getItem(location, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error("Location doesn't exit"));

            return out;

        })

    }

    getLocationDirectoryFiles(location, cb){

        this._storeDirectories.getItem( location, (err, out)=>{

            if (err) return cb(err);
            if (!out) return cb(new Error("Location doesn't exit"));

            return out;

        })

    }



}