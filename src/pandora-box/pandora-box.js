const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const EventEmitter = require('events')
const PandoraBoxStreamType = require('./stream/pandora-box-stream-type')

const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBoxMeta = require('./meta/pandora-box-meta')

module.exports = class PandoraBox extends PandoraBoxMeta {

    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, streams, sybilProtectIndex, sybilProtectTime, sybilProtectSignature ) {

        super(kademliaNode, version, name, size, categories, metaDataHash, sybilProtectIndex, sybilProtectTime, sybilProtectSignature )

        this.absolutePath = absolutePath;
        this._kademliaNode = kademliaNode;
        this.events = new EventEmitter();

        PandoraBoxHelper.validatePandoraBox(version, size, description,  metaDataHash, streams);

        this.absolutePath = absolutePath;

        this._streams = streams;
        this._description = description;

        this.streamliner = new PandoraBoxStreamliner(kademliaNode, this);

        this.isDone = this.calculateIsDone;

        this.chunksTotal = this._calculateChunksTotal(false);
        this.chunksTotalAvailable = this._calculateChunksTotal(true);

    }

    streamsSetPandoraBox(){
        for (const stream of this.streams)
            stream.setPandoraBox(this);
    }

    get description(){
        return this._description;
    }

    get streams(){
        return this._streams;
    }

    get calculateIsDone(){

        for (const stream of this.streams)
            if ( !stream.isDone ) return false;

        return true;
    }

    _calculateChunksTotal(done){

        let chunksTotal = 0;
        for (const stream of this.streams) {

            if (stream.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM  )
                if ( !done )
                    chunksTotal += stream.chunksCount;
                else
                    chunksTotal += stream.chunksDone;

        }

        return chunksTotal;
    }

    toArray(){
        const streams = this._streams.map( it => it.toArray() );
        return [ this._version, this._name, this._size, this._categories, this._description, streams, this._sybilProtectIndex, this._sybilProtectTime, this._sybilProtectSignature, ];
    }

    static fromArray(kademliaNode, arr){

        const categories = arr[3].map( it => it.toString() );

        const description = arr[4].toString();

        const streams = PandoraBoxHelper.createPandoraBoxStreams( null, arr[5] );
        const metaDataHash = PandoraBoxHelper.computePandoraBoxMetaDataHash( description, streams  );

        const pandoraBox = new PandoraBox(kademliaNode, '', arr[0], arr[1].toString(), arr[2], categories,  metaDataHash, description, arr[5], arr[6], arr[7], arr[8] );
        pandoraBox.streamsSetPandoraBox();

        return pandoraBox;
    }

    toJSON(){
        return {
            version: this._version,
            name: this._name,
            categories: this._categories,
            description: this._description,
            metaDataHash: this._metaDataHash,
            streams: this._streams.map( it => it.toJSON() ),
            sybilProtectIndex: this._sybilProtectIndex,
            sybilProtectTime: this._sybilProtectTime,
            sybilProtectSignature: this._sybilProtectSignature,
        }
    }

    convertToPandoraBoxMeta(){
        return new PandoraBoxMeta(this._kademliaNode, this._version, this._name, this._size, this._categories, this._metaDataHash, this._sybilProtectIndex, this._sybilProtectTime, this._sybilProtectSignature);
    }

    get percent(){
        return this.chunksTotalAvailable / ( this.chunksTotal || 1) * 100;
    }

    async save(){

        let out = await this._kademliaNode.storage.getItem('pandoraBoxes:box:hash-exists:'+this.hashHex);

        if ( out && out === "1" ) return false;

        const json = {
            encoded: bencode.encode( this.toArray() ).toString('base64'),
            absolutePath: this.absolutePath,
        }

        out = await this._kademliaNode.storage.setItem('pandoraBoxes:box:hash:'+this.hashHex, JSON.stringify(json) );

        out = await this._kademliaNode.storage.setItem('pandoraBoxes:box:hash-exists:'+this.hashHex, "1" );

        for (const stream of this.streams)
            await stream.saveStatus();

    }

    async remove(){

        let out = await this._kademliaNode.storage.removeItem('pandoraBoxes:box:hash:'+this.hashHex);

        out = await this._kademliaNode.storage.setItem('pandoraBoxes:box:hash-exists:'+this.hashHex);

        for (const stream of this.streams)
            await stream.removeStatus();

    }

    static async load(kademliaNode, hash){

        let out = await kademliaNode.storage.getItem('pandoraBoxes:box:hash:'+hash);

        if (!out) throw 'PandoraBox was not found by hash';

        const json = JSON.parse(out);

        const decoded = bencode.decode( Buffer.from( json.encoded, 'base64') );
        const box = PandoraBox.fromArray( kademliaNode, decoded ) ;
        box.absolutePath = json.absolutePath;

        for (const stream of box.streams)
            await stream.loadStatus();

        box.isDone = box.calculateIsDone;
        box.chunksTotalAvailable = box._calculateChunksTotal(true);

        return box;

    }

}