const PandoraBox = require('./../pandora-box/pandora-box')
const PandoraStreamType = require('../pandora-box/stream/pandora-box-stream-type')

module.exports = class PandoraBoxes {

    constructor(pandoraProtocolNode) {

        this._pandoraProtocolNode = pandoraProtocolNode;

        this._boxesMap = {};
        this._streamsMap = {};

        this._startedStreamling = false;
    }

    get startedStreamling(){
        return this._startedStreamling;
    }

    startStreamlining(){
        if (this._startedStreamling) return false;
        this._startedStreamling = true;

        for (const boxKey in this._boxesMap)
            this._boxesMap[boxKey].streamliner.start();

    }

    stopStreamlining(){
        if (!this._startedStreamling) return false;
        this._startedStreamling = false;

        for (const boxKey in this._boxesMap)
            this._boxesMap[boxKey].streamliner.stop();
    }

    addPandoraBox( pandoraBox ){

        if (!pandoraBox || !(pandoraBox instanceof PandoraBox) ) throw Error('PandoraBox arg is invalid');

        if (this._boxesMap[pandoraBox.hash.toString('hex')])
            return false; //already

        this._boxesMap[pandoraBox.hash.toString('hex')] = pandoraBox;

        const empty =  Buffer.alloc( global.KAD_OPTIONS.NODE_ID_LENGTH );
        const streams = pandoraBox.streams;
        for (const stream of streams) {

            if (!stream.hash.equals(empty) && !this._streamsMap[stream.hash.toString('hex')])
                this._streamsMap[stream.hash.toString('hex')] = stream;

        }

        if (this.startedStreamling)
            if (!pandoraBox.calculateIsDone)
                pandoraBox.streamliner.start();

        return true;

    }


}