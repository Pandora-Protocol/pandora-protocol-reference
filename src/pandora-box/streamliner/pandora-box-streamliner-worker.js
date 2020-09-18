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

    async connect(  ){

        console.log("establishing connection", this.peer.contact.toJSON(), this.peer.contact.rendezvousContact ? this.peer.contact.rendezvousContact.identityHex : '');

        //establish connection
        try{

            const connection = await  this._kademliaNode.rules.establishConnection( this.peer.contact );
            console.log("establishing connection answer", connection.id );

            if (!connection) throw "Connection was not established";

            connection.once("closed",()=>{
                this._pandoraBoxStreamlinerWorkers.removeWorker(this);
            })

            this.start();

        }catch(err){
            this._pandoraBoxStreamlinerWorkers.removeWorker(this);
        }

    }

    start(){

        if (this._started) return false;
        this._started = true;

        this._workerAsyncInterval = setAsyncInterval(
            this._work.bind(this),
            0,
        );

    }

    stop(){

        if (!this._started) return false;
        this._started = false;

        clearAsyncInterval(this._workerAsyncInterval);

    }


    _work(){
        return this._pandoraBoxStreamliner.work(this)
    }

}