const PandoraBoxStreamlinerWorker = require('./pandora-box-streamliner-worker')

module.exports = class PandoraBoxStreamlinerWorkers {

    constructor(pandoraProtocolNode, pandoraBox, pandoraBoxStreamliner) {

        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBox = pandoraBox;
        this._pandoraBoxStreamliner = pandoraBoxStreamliner;

        this._workers = [];
        this._initialized = 0;

        this._workersCount = 0;
    }

    start(){
        this.workersCount = 20;
    }

    stop(){
        this.workersCount = 0;
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

    removeWorker(worker){

        worker.peer.worker = null;

        for (let j=0; j < this._workers.length; j++)
            if (this._workers[j] === worker)
                this._workers.splice(j, 1);

    }

    refreshWorkers(){

        if ( !this._pandoraBoxStreamliner._started || this._pandoraBoxStreamliner.isDone ){

            this._workers = [];

        } else {

            if (this._workers.length < this._workersCount)
                for (let i=0; i < this._pandoraBoxStreamliner.peers.length && this._workers.length < this._workersCount; i++) {
                    const peer = this._pandoraBoxStreamliner.peers[i];
                    if (!peer.worker) {

                        const worker = new PandoraBoxStreamlinerWorker(this._pandoraProtocolNode, this._pandoraBox, this._pandoraBoxStreamliner, peer);

                        this._workers.push(worker);
                        peer.worker = worker;

                        worker.connect((err, out) => {

                            if (err || !out)
                                this.removeWorker(worker);
                            else
                                worker.start();

                        });
                    }
                }

            //close if we have more
            for (let i = this._workersCount; i < this._workers.length; i++)
                this._workers[i].stop();

            this._workers.splice(this._workersCount);

        }
    }

}