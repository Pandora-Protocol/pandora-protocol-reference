const PandoraBoxStreamlinerWorker = require('./pandora-box-streamliner-worker')

module.exports = class PandoraBoxStreamliner {

    constructor(pandoraProtocolNode, pandoraBox) {

        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;

        this.peers = []; //known peers to have this pandoraBox

        this.queue = [];
        this._workers = [];

        this._started = false;
    }

    start(){
        if (this._started) return false;
        this._started = true;

        this.queue = [];
        this.updateQueueStreams(this._pandoraBox.streams);

        this.workersCount = 5;

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

        this._workers.splice(0, newValue);
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


}