const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;


module.exports = class PandoraBoxStreamlinerWorker {

    constructor(pandoraProtocolNode, pandoraBox, pandoraBoxStreamliner, peer ) {

        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;
        this._pandoraBoxStreamliner = pandoraBoxStreamliner;

        this.peer = peer;

        this._started = false;
    }

    connect(cb){

        //establish connection
        this._pandoraProtocolNode.rules.sendConnectionPing( this.peer.contact,  ( err, out )=>{

            cb(err, out);

        });

    }

    start(){

        if (this._started) return false;
        this._started = true;

        this._workerAsyncInterval = setAsyncInterval(
            next => this._work(next),
            0,
        );

    }

    stop(){

        if (!this._started) return false;
        this._started = false;

        clearAsyncInterval(this._workerAsyncInterval);

    }


    _work(next){
        this._pandoraBoxStreamliner.work(this, next)
    }

}