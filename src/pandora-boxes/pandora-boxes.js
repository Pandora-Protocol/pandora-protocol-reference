const PandoraBox = require('./../pandora-box/pandora-box')
const PandoraStreamType = require('../pandora-box/stream/pandora-box-stream-type')
const EventEmitter = require('events')

module.exports = class PandoraBoxes extends EventEmitter{

    constructor(pandoraProtocolNode) {

        super();

        this._pandoraProtocolNode = pandoraProtocolNode;

        this._boxesMap = {};
        this._streamsMap = {};

        this._startedStreamlining = false;
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

    addPandoraBox( pandoraBox ){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw Error('PandoraBox arg is invalid');

        if (this._boxesMap[pandoraBox.hash.toString('hex')])
            return false; //already

        this._boxesMap[pandoraBox.hash.toString('hex')] = pandoraBox;

        const empty =  Buffer.alloc( KAD_OPTIONS.NODE_ID_LENGTH );
        const streams = pandoraBox.streams;
        for (const stream of streams) {

            if (!stream.hash.equals(empty) && !this._streamsMap[stream.hash.toString('hex')])
                this._streamsMap[stream.hash.toString('hex')] = stream;

        }

        if (this.startedStreamling)
            if (!pandoraBox.calculateIsDone)
                pandoraBox.streamliner.start();

        this.emit('pandora-box/added', pandoraBox);

        return true;

    }


}