const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const EventEmitter = require('events')
const PandoraBoxStreamType = require('./stream/pandora-box-stream-type')

const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBoxMeta = require('../meta/pandora-box-meta')

module.exports = class PandoraBox extends PandoraBoxMeta {

    // size and metaDataHash are not required for this constructor, but we kept it
    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, streams, ) {

        super(kademliaNode, version, name, size, categories, metaDataHash )

        this.absolutePath = absolutePath;
        this._kademliaNode = kademliaNode;
        this.events = new EventEmitter();

        description = description.toString();

        for (let i=0; i < streams.length; i++)
            if ( !(streams[i] instanceof PandoraBoxStream) )
                streams[i] = PandoraBoxStream.fromArray( this, streams[i] );

        PandoraBoxHelper.validatePandoraBox(version, description,  this._metaDataHash, streams);

        this.absolutePath = absolutePath;

        this._streams = streams;
        this.streamsSetPandoraBox();

        this._description = description;

        this.streamliner = new PandoraBoxStreamliner(kademliaNode, this);

        this.isDone = this.calculateIsDone;

        this.chunksTotal = this._calculateChunksTotal(false);
        this.chunksTotalAvailable = this._calculateChunksTotal(true);

        this._keys.push('description', 'streams');

    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxMeta){
        return new boxClass(  kademliaNode, '', ...arr);
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

    convertToPandoraBoxMeta(){
        const array = this.toArray({description:true, streams:true});
        return new PandoraBoxMeta(this._kademliaNode, ...array );
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

    static async load(kademliaNode, hash, boxClass = PandoraBox){

        let out = await kademliaNode.storage.getItem('pandoraBoxes:box:hash:'+hash);

        if (!out) throw 'PandoraBox was not found by hash';

        const json = JSON.parse(out);

        const decoded = bencode.decode( Buffer.from( json.encoded, 'base64') );
        const box = boxClass.fromArray( kademliaNode, decoded ) ;
        box.absolutePath = json.absolutePath;

        for (const stream of box.streams)
            await stream.loadStatus();

        box.isDone = box.calculateIsDone;
        box.chunksTotalAvailable = box._calculateChunksTotal(true);

        return box;

    }

}