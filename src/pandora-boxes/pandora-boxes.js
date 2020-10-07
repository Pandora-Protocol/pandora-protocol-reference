const PandoraBox = require('../pandora-box/box/pandora-box')
const PandoraStreamType = require('../pandora-box/box/stream/pandora-box-stream-type')
const EventEmitter = require('events')
const PandoraBoxesSaveManager = require('./pandora-boxes-save-manager')

module.exports = class PandoraBoxes extends EventEmitter{

    constructor(kademliaNode) {

        super();

        this._kademliaNode = kademliaNode;

        this._boxesMap = {};
        this._streamsMap = {};

        this._startedStreamlining = false;
        this.saveManager = new PandoraBoxesSaveManager(kademliaNode, this);

    }

    get boxesMap(){
        return this._boxesMap;
    }

    get boxes(){
        return Object.values( this._boxesMap );
    }

    get streamsMap(){
        return this._streamsMap;
    }

    get streams(){
        return Object.values( this._streamsMap );
    }

    get startedStreamlinnig(){
        return this._startedStreamlining;
    }

    startStreamlining(){

        if (this._startedStreamlining) return false;
        this._startedStreamlining = true;

        for (const boxKey in this._boxesMap)
            this._boxesMap[boxKey].streamliner.start();

        this.emit('status', true);

    }

    stopStreamlining(){

        if (!this._startedStreamlining) return false;
        this._startedStreamlining = false;

        for (const boxKey in this._boxesMap)
            this._boxesMap[boxKey].streamliner.stop();

        this.emit('status', false);
    }

    async addPandoraBox( pandoraBox, save = true ){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw 'PandoraBox arg is invalid';

        if (this._boxesMap[pandoraBox.hashHex])
            return false; //already

        this._boxesMap[pandoraBox.hashHex] = pandoraBox;

        for (const stream of pandoraBox.streams)
            if (!stream.hash.equals(KAD_OPTIONS.NODE_ID_EMPTY) && !this._streamsMap[stream.hashHex])
                this._streamsMap[stream.hashHex] = stream;

        if (save){
            const out =  await this.saveManager.save(pandoraBox);
        }

        await this._addedBox(pandoraBox);
        return true;

    }

    async removeBox(pandoraBox){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw 'PandoraBox arg is invalid';

        if (!this._boxesMap[pandoraBox.hashHex])
            return false; //already

        pandoraBox.streamliner.stop();

        delete this._boxesMap[pandoraBox.hashHex];

        for (const stream of pandoraBox.streams)
            if ( this._streamsMap[stream.hashHex] === stream)
                delete this._streamsMap[stream.hashHex];

        const out = await pandoraBox.remove();
        this._removedBox(pandoraBox);

    }

    async _addedBox(pandoraBox){

        if (this._startedStreamlining)
            await pandoraBox.streamliner.start();

        this.emit('pandora-box/added', pandoraBox);

        return pandoraBox;
    }

    _removedBox(pandoraBox){

        this.emit('pandora-box/removed', pandoraBox);
        return true;

    }

}