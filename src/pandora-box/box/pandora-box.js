const PandoraBoxHelper = require('./pandora-box-helper')
const PandoraBoxStream = require('./stream/pandora-box-stream')
const PandoraBoxStreamliner = require('./streamliner/pandora-box-streamliner')
const PandoraBoxStreamType = require('./stream/pandora-box-stream-type')

const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBoxMeta = require('../meta/pandora-box-meta')

module.exports = class PandoraBox extends PandoraBoxMeta {

    // size and metaDataHash are not required for this constructor, but we kept it
    constructor ( kademliaNode, absolutePath, version, name, size, categories, metaDataHash, description, chunkSize, streams, onlyValidation  ) {

        super(kademliaNode, version, name, size, categories, metaDataHash )

        this.absolutePath = absolutePath;
        this._kademliaNode = kademliaNode;

        description = description.toString();

        for (let i=0; i < streams.length; i++)
            if ( !(streams[i] instanceof PandoraBoxStream) )
                streams[i] = PandoraBoxStream.fromArray( this, chunkSize, streams[i] );

        PandoraBoxHelper.validatePandoraBox(version, description, chunkSize, this._metaDataHash, streams);

        this.absolutePath = absolutePath;

        this._streams = streams;
        this.streamsSetPandoraBox();

        this._chunkSize = chunkSize;
        this._description = description;

        if (!onlyValidation) {
            this.streamliner = new this.PandoraBoxStreamlinerClass(kademliaNode, this);
            this.isDone = this.calculateIsDone;
            this.chunksTotal = this._calculateChunksTotal(false);
            this.chunksTotalAvailable = this._calculateChunksTotal(true);
        }

        this._keys.push('description', 'chunkSize', 'streams');

        this._started = false;
    }

    get chunkSize(){
        return this._chunkSize;
    }

    get PandoraBoxStreamlinerClass(){
        return PandoraBoxStreamliner;
    }

    static fromArray(kademliaNode, arr){
        return new this(  kademliaNode, '', ...arr);
    }

    static fromBuffer(kademliaNode, buffer, onlyValidation = false){
        if (!Buffer.isBuffer(buffer) || buffer.length > PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_META_MAX_SIZE) throw "data is not a buffer or too big";

        const arr = bencode.decode(buffer);
        arr.push(onlyValidation);
        return this.fromArray(kademliaNode, arr);
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

        const json = {
            encoded: bencode.encode( this.toArray() ).toString('base64'),
            absolutePath: this.absolutePath,
        }

        await this._kademliaNode.storage.setItem('pandoraBoxes:box:hash:'+this.hashHex, JSON.stringify(json) );

        for (const stream of this.streams)
            await stream.saveStatus();

        await this._kademliaNode.storage.setItem('pandoraBoxes:box:hash:exists:'+this.hashHex, "1" );

        return true;
    }

    async remove(){

        await this._kademliaNode.storage.removeItem('pandoraBoxes:box:hash:'+this.hashHex);

        for (const stream of this.streams)
            await stream.removeStatus();

        await this._kademliaNode.storage.removeItem('pandoraBoxes:box:hash:exists:'+this.hashHex);

        return true;
    }

    static async load(kademliaNode, hash){

        let out = await kademliaNode.storage.getItem('pandoraBoxes:box:hash:'+hash);
        if (!out) return null;

        const json = JSON.parse(out);

        const decoded = bencode.decode( Buffer.from( json.encoded, 'base64') );
        const box = this.fromArray( kademliaNode, decoded ) ;
        box.absolutePath = json.absolutePath;

        for (const stream of box.streams)
            await stream.loadStatus();

        box.isDone = box.calculateIsDone;
        box.chunksTotalAvailable = box._calculateChunksTotal(true);

        return box;

    }



}