const PandoraBoxStreamlinerWorker = require('./pandora-box-streamliner-worker')
const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;
const {Utils} = require('pandora-protocol-kad-reference').helpers;

module.exports = class PandoraBoxStreamliner {

    constructor(pandoraProtocolNode, pandoraBox) {

        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;

        this.peers = []; //known peers to have this pandoraBox

        this.queue = [];
        this._workers = [];

        this._started = false;

        this._initialized = 0;

    }

    start(){

        if (this._started) return true;

        this._initialized = 0;
        this._streamlinerInitializeAsyncInterval = setAsyncInterval(
            next => this._workStreamlinerInitialize(next),
            5*1000,
        );

        this._started = true;

        if (this._pandoraBox.isDone) return true;

        this.queue = [];
        this.updateQueueStreams(this._pandoraBox.streams);

        this.workersCount = 20;

    }

    stop(){

        if (!this._started) return false;
        this._started = false;

        this.queue = [];
        this.refreshWorkers();

        clearAsyncInterval(this._streamlinerInitializeAsyncInterval);

    }

    _workStreamlinerInitialize(next){

        const time = new Date().getTime();

        if ( (this._initialized < time - KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000) ) ||
            (!this.peers.length && this._initialized < time - 5*1000 ) ){

            return this.initialize( (err, out)=>{

                console.log("initialized", this._pandoraBox._name, this._pandoraBox.hashHex, out);
                next();

            } )

        }

        next();

    }

    get workersWorkingCount(){
        return this._workers.length;
    }

    get workersCount(){
        return this._workersCount;
    }

    set workersCount(newValue){

        this._workersCount = newValue;
        this.refreshWorkers();

    }

    refreshWorkers(){

        if ( !this._started || this.isDone ){

            for (let i=0; i < this._workers.length; i++)
                this._workers[i].stop();
            this._workers = [];

        } else {

            for (let i=0; i < this._workersCount; i++)
                if (!this._workers[i]) {
                    this._workers[i] = new PandoraBoxStreamlinerWorker(this._pandoraProtocolNode, this._pandoraBox, this);
                    if (this._started)
                        this._workers[i].start();
                }

            //close if we have more
            for (let i = this._workersCount; i < this._workers.length; i++)
                this._workers[i].stop();

            this._workers.splice(this._workersCount);

        }
    }

    updateQueueStreams(streams, priority = 1){

        for (const stream of streams)
            if (!stream.isDone)
                this.queue.push({
                    stream,
                    priority,
                })

        this.queue.sort((a,b)=>a.priority - b.priority);

    }

    removeQueueStream(stream){

        for (let i=0; i < this.queue.length; i++ )
            if (this.queue[i].stream === stream){
                this.queue.splice(i, 1);
                return;
            }

    }

    addPeers(peers){

        try{

            for (const peer of peers)
                if ( !peer.contact.identity.equals(this._pandoraProtocolNode.contact.identity) ){

                    let found = false;
                    for (let j=0; j < this.peers.length; j++)
                        if (this.peers[j].contact.identity.equals(peer.contact.identity)){
                            found = true;

                            if (peer.contact.isContactNewer(this.peers[j].contact))
                                this._pandoraBox._pandoraProtocolNode.updateContact(peer.contact);

                            break;
                        }

                    if (!found)
                        this.peers.push(peer);

                }

        }catch(err){

        }

    }

    initialize(cb){

        this._pandoraProtocolNode.crawler.iterativeStorePandoraBox( this._pandoraBox, (err, out)=> {

            if (err) return cb(err, null);

            this._pandoraProtocolNode.crawler.iterativeFindPandoraBoxPeersList( this._pandoraBox, (err, peers ) => {

                if (peers && peers.length)
                    this.addPeers(peers);

                this._pandoraProtocolNode.crawler.iterativeStorePandoraBoxPeer( this._pandoraBox, undefined, undefined, (err, out2)=>{

                    this._initialized = new Date().getTime();
                    this.refreshWorkers();

                    if (err) return cb(err, null);
                    else cb(null, true);

                });

            } );

        });



    }

}