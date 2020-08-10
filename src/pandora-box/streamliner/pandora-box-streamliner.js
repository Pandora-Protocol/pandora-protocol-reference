const PandoraBoxStreamlinerWorker = require('./pandora-box-streamliner-worker')

module.exports = class PandoraBoxStreamliner {

    constructor(pandoraProtocolNode, pandoraBox) {

        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;

        this.peers = []; //known peers to have this pandoraBox

        this.queue = [];
        this._workers = [];

        this._started = false;

        this._initialized = 0;
        this._initializing = false;

    }

    start(){

        if (this._started) return true;
        if (this._pandoraBox.isDone) return true;

        this._started = true;

        this.queue = [];
        this.updateQueueStreams(this._pandoraBox.streams);

        this.workersCount = 20;

    }

    stop(){

        if (!this._started) return false;
        this._started = false;

        this.queue = [];

        for (const worker of this._workers)
            worker.stop();

    }

    get workersCount(){
        return this._workers.length;
    }

    set workersCount(newValue){

        if (this._workers.length === newValue) return;

        for (let i=0; i < newValue; i++)
            if (!this._workers[i]) {
                this._workers[i] = new PandoraBoxStreamlinerWorker(this._pandoraProtocolNode, this._pandoraBox, this);
                if (this._started)
                    this._workers[i].start();
            }

        for (let i = newValue; i < this._workers.length; i++)
            this._workers[i].stop();

        this._workers.splice(newValue);
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

        for (const peer of peers)
            if ( !peer.contact.identity.equals(this._pandoraProtocolNode.contact.identity) ){

                let found = false;
                for (let j=0; j < this.peers.length; j++)
                    if (this.peers[j].contact.identity.equals(peer.contact.identity)){
                        found = true;
                        this.peers[j].contact.updateContactNewer( peer.contact );
                        break;
                    }

                if (!found)
                    this.peers.push(peer);

            }

    }

    initialize(cb){

        if (!this._started || this._initializing) return cb(null, false);

        this._initializing = true;

        this._pandoraProtocolNode.crawler.iterativeFindPandoraBoxPeersList( this._pandoraBox.hash, (err, peers ) => {

            if (err) {
                this._initializing = false;
                this._initialized = new Date().getTime();
                return cb(err, null);
            }

            this.addPeers(peers);

            this._pandoraProtocolNode.crawler.iterativeStorePandoraBoxPeer( this._pandoraBox.hash, this._pandoraProtocolNode.contact, new Date().getTime(), (err, out2)=>{

                if (err) {
                    this._initializing = false;
                    this._initialized = new Date().getTime();
                    return cb(err, null);
                }

                this._initialized = new Date().getTime();
                this._initializing = false;
                cb(null, true);

            });

        } );

    }

}