const PandoraBox = require('./../pandora-box/pandora-box')
const PandoraStreamType = require('../pandora-box/stream/pandora-box-stream-type')
const EventEmitter = require('events')
const PandoraBoxesSaveManager = require('./pandora-boxes-save-manager')

module.exports = class PandoraBoxes extends EventEmitter{

    constructor(pandoraProtocolNode) {

        super();

        this._pandoraProtocolNode = pandoraProtocolNode;

        this._boxesMap = {};
        this._streamsMap = {};

        this._startedStreamlining = false;
        this.saveManager = new PandoraBoxesSaveManager(pandoraProtocolNode, this);

    }

    get boxesMap(){
        return this._boxesMap;
    }

    get boxes(){
        return Object.values( this._boxesMap );
    }

    get startedStreamling(){
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

    addPandoraBox( pandoraBox, save = true, cb ){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw Error('PandoraBox arg is invalid');

        if (this._boxesMap[pandoraBox.hashHex])
            return cb(null, false); //already

        this._boxesMap[pandoraBox.hashHex] = pandoraBox;

        for (const stream of pandoraBox.streams)
            if (!stream.hash.equals(KAD_OPTIONS.NODE_ID_EMPTY) && !this._streamsMap[stream.hashHex])
                this._streamsMap[stream.hashHex] = stream;

        if (!save)
            return this._addedBox(pandoraBox, cb);

        this.saveManager.save(pandoraBox, (err, out)=>{

            if (err) return cb(err);
            this._addedBox(pandoraBox, cb);

        })

    }

    removeBox(pandoraBox, cb){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw Error('PandoraBox arg is invalid');

        if (!this._boxesMap[pandoraBox.hashHex])
            return cb(null, false); //already

        pandoraBox.streamliner.stop();

        delete this._boxesMap[pandoraBox.hashHex];

        for (const stream of pandoraBox.streams)
            if ( this._streamsMap[stream.hashHex] === stream)
                delete this._streamsMap[stream.hashHex];

        this.saveManager.remove(pandoraBox, (err, out)=>{
            if (err) return cb(err);

            this._removedBox(pandoraBox, cb);
        });

    }

    _addedBox(pandoraBox, cb){

        if (this.startedStreamling)
            if (!pandoraBox.calculateIsDone)
                pandoraBox.streamliner.start();

        this.emit('pandora-box/added', pandoraBox);
        cb(null, pandoraBox )
    }

    _removedBox(pandoraBox, cb){

        this.emit('pandora-box/removed', pandoraBox);
        cb(null, pandoraBox)

    }

}