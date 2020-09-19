const PandoraBoxStreamliner = require('../../box/streamliner/pandora-box-streamliner')
const SybilProtect = require('../../../sybil-protect/sybil-protect')
const SybilProtectVote = require('../../../sybil-protect/sybil-protect-vote')

module.exports = class PandoraBoxSybilStreamliner extends PandoraBoxStreamliner {

    constructor() {
        super(...arguments);

    }

    async mergePandoraBoxMeta(){

        try{
            const pandoraBoxMeta = await this._kademliaNode.crawler.iterativeFindPandoraBoxMeta( this._pandoraBox.hash );

            if (!pandoraBoxMeta) return;

            if (!this._pandoraBoxMeta.sybilProtect.sybilProtectIndex || this._pandoraBoxMeta.sybilProtect.sybilProtectTime < pandoraBoxMeta.sybilProtect.sybilProtectTime)
                this._pandoraBoxMeta._sybilProtect = new SybilProtect(this._kademliaNode, ...this._pandoraBoxMeta.sybilProtect.toArray() );


            for (const vote of pandoraBoxMeta.sybilProtectVotes){
                let found = false;

                for (let i=0; i < this._pandoraBoxMeta.sybilProtectVotes.length; i++) {

                    const vote2 = this._pandoraBoxMeta.sybilProtectVotes[i];

                    if (vote2.sybilProtectIndex === vote.sybilProtectIndex) {
                        found = true;

                        if (vote2.sybilProtectVoteProtectVotesCount < vote.sybilProtectVoteProtectVotesCount) {
                            const newVote = new SybilProtectVote(this._kademliaNode, ...vote.toArray());
                            this._pandoraBoxMeta._sybilProtectVotes[i] = newVote;
                        }

                        break;
                    }
                }

                if (!found){
                    const vote = new SybilProtectVote(this._kademliaNode, ...vote.toArray() );
                    this._pandoraBoxMeta._sybilProtectVotes.push( vote );
                }

            }

        }catch(err){

        }
    }

    async initialize( ){

        if (!this._pandoraBoxMeta){
            this._pandoraBoxMeta = this._pandoraBox.convertToPandoraBoxMeta();
        }

        console.log("initialize", this._pandoraBox._name, this._pandoraBox.hashHex, this._kademliaNode.contact.identityHex);

        const out = await this._kademliaNode.crawler.iterativeStorePandoraBox( this._pandoraBox );
        if (!out) return;

        await this.mergePandoraBoxMeta();

        const out2 = await this._kademliaNode.crawler.iterativeStorePandoraBoxMeta( this._pandoraBoxMeta );
        if (!out2) return;

        const out3 = await this._kademliaNode.crawler.iterativeStorePandoraBoxName( this._pandoraBox );
        if (!out3) return;

        this._initialized = new Date().getTime();

        return true;

    }

}