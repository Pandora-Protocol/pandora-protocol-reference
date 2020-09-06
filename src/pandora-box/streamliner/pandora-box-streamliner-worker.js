const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;


module.exports = class PandoraBoxStreamlinerWorker {

    constructor( kademliaNode, pandoraBox, pandoraBoxStreamliner, pandoraBoxStreamlinerWorkers, peer ) {

        this._kademliaNode = kademliaNode;
        this._pandoraBox = pandoraBox;
        this._pandoraBoxStreamliner = pandoraBoxStreamliner;
        this._pandoraBoxStreamlinerWorkers = pandoraBoxStreamlinerWorkers;

        this.peer = peer;

        this._started = false;
    }

    connect(cb){

        //establish connection
        this._kademliaNode.rules.establishConnection( this.peer.contact,  ( err, connection )=>{

            if (err || !connection)
                this._pandoraBoxStreamlinerWorkers.removeWorker(this);
            else {

                connection.once("closed",()=>{
                    this._pandoraBoxStreamlinerWorkers.removeWorker(this);
                })

                this.start();
            }

            cb(err, connection);

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