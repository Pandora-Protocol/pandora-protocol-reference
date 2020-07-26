const InterfacePandoraLocations = require('../interface-pandora-locations')
const Storage = require('pandora-protocol-kad-reference').storage.Storage;
const PandoraStreamType = require('../../pandora-box/stream/pandora-box-stream-type')
const async = require('pandora-protocol-kad-reference').library.async;
const PandoraBoxStreamStatus = require('../../pandora-box/stream/pandora-box-stream-status')
const Streams = require('../../helpers/streams/streams')
const PandoraBoxHelper = require('./../../pandora-box/pandora-box-helper')
const PandoraBoxStream = require('../../pandora-box/stream/pandora-box-stream')
const PandoraBox = require('../../pandora-box/pandora-box')

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


    createPandoraBox( selectedStreams, name, description, chunkSize = 32 * 1024, cb){

        if (!selectedStreams || !Array.isArray(selectedStreams) || selectedStreams.length === 0) return cb(new Error('Selected streams needs to a non empty array'));

        const streams = [];

        async.eachLimit(  selectedStreams, 1, ( selectedStream, next) => {

            const newPath = this.startWithSlash( selectedStream.path || '' );
            this._explodeStreamPath(streams, newPath);

            Streams.computeStreamHashAndChunks( selectedStream.stream, chunkSize, (err, {hash, chunks} )=>{

                if (err) return cb(err, null);

                const newStream = new PandoraBoxStream( this,
                    newPath,
                    PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM,
                    selectedStream.size,
                    chunkSize,
                    hash,
                    chunks,
                    new Array(chunks.length).fill(1),
                    PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED,
                );

                streams.push( newStream );
                next();

            })

        }, (err, out)=>{

            const version = '0.1';
            const finalName = name;
            const finalDescription = description;

            const hash = PandoraBoxHelper.computePandoraBoxHash(version, finalName, finalDescription, streams);
            const pandoraBox = new PandoraBox( this._pandoraProtocolNode, '', version, finalName, finalDescription, hash, streams );

            cb(null, pandoraBox );

        } );



    }

}