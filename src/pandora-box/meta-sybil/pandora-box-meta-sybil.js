const PandoraBoxMeta = require('../meta/pandora-box-meta')
const PandoraBoxMetaHelper = require('../../pandora-box/meta/pandora-box-meta-helper')
const SybilProtectVote = require('../../sybil-protect/sybil-protect-vote');
const SybilProtect = require('../../sybil-protect/sybil-protect');
const bencode = require('pandora-protocol-kad-reference').library.bencode;

module.exports = class PandoraBoxMetaSybil extends PandoraBoxMeta{

    constructor(kademliaNode, version, name, size, categories, metaDataHash, sybilProtect, sybilProtectVotes ) {

        super(kademliaNode, version, name, size, categories, metaDataHash);

        if ( !(sybilProtect instanceof SybilProtect ))
            sybilProtect = SybilProtect.fromArray(kademliaNode, sybilProtect);

        sybilProtect.validateSybilProtect(this._hash);
        this._sybilProtect = sybilProtect;


        const indexAlready = {};
        for (let i=0; i < sybilProtectVotes.length; i++) {

            if ( !(sybilProtectVotes[i] instanceof SybilProtectVote ))
                sybilProtectVotes[i] = SybilProtectVote.fromArray(this._kademliaNode, sybilProtectVotes[i] );

            const vote = sybilProtectVotes[i];

            if (indexAlready[vote._sybilProtectIndex])
                throw "Sybil Protect Index already used";

            indexAlready[vote._sybilProtectIndex] = true;

            vote.validateSybilProtectVote( this._hash );
        }

        this._sybilProtectVotes = sybilProtectVotes;

        this._keys.push('sybilProtect','sybilProtectVotes');
        this.autoSave = false;

    }

    get sybilProtect(){
        return this._sybilProtect;
    }

    get sybilProtectVotes(){
        return this._sybilProtectVotes;
    }

    /**
     * Based on https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9
     * @returns {number}
     */
    getScore(){

        if (!this._sybilProtect._sybilProtectIndex || !this._sybilProtect._sybilProtectTime) return 0;

        let totalVotes = 0;
        for (const vote of this._sybilProtectVotes)
            totalVotes += vote._sybilProtectVotesCount - 2*vote._sybilProtectVotesDown;

        const s = totalVotes;
        const order = Math.log( Math.max(s, 1) );
        const sign = Math.sign(order );

        const seconds = this._sybilProtect._sybilProtectTime - PANDORA_PROTOCOL_OPTIONS.SYBIL_VOTE_DATE_OFFSET;

        return Math.round((sign * order + seconds / 45000) * 10000000 );
    }

    getTotalVotes(){
        let totalVotes = 0;

        for (const vote of this._sybilProtectVotes)
            totalVotes += vote._sybilProtectVotesCount;

        return totalVotes;
    }

    getVotes(){

        let votesUp = 0, votesDown = 0, votesTotal = 0;

        for (const vote of this._sybilProtectVotes) {
            votesTotal += vote._sybilProtectVotesCount;
            votesDown += vote._sybilProtectVotesDown;
        }

        votesUp = votesTotal - votesDown;

        return {
            votesUp,
            votesDown,
            votesTotal,
        };

    }

    async sybilProtectVoteSign( statusName, vote = true ){

        const {subsets, words} =  PandoraBoxMetaHelper.computePandoraBoxMetaNameSubsets(this.name);
        this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/crawler/store/count-operations', {hash: this.hash, count: subsets.length + 1, statusName });

        await this.mergePandoraBoxMetaSybil(statusName);

        const index = this._kademliaNode.sybilProtectSigner.getRandomSybilIndex();

        let found, oldSignature, oldVotesCount = 0, oldVotesDown = 0, oldTime;

        for (let i=0; i < this._sybilProtectVotes.length; i++ ) {

            const vote = this._sybilProtectVotes[i];
            if (vote.sybilProtectIndex === index+1) {
                found = i;
                oldTime = vote.sybilProtectTime;
                oldVotesCount = vote.sybilProtectVotesCount;
                oldVotesDown = vote.sybilProtectVotesDown;
                oldSignature = vote.sybilProtectSignature;
            }
        }

        const out = await this._kademliaNode.sybilProtectSigner.sign( {
            message: this.hash
        }, {
            includeTime: true,
            includeVotes: true,
            oldVotes: {
                time: oldTime,
                votesCount: oldVotesCount,
                votesDown: oldVotesDown,
                signature: oldSignature
            },
            vote,

        }, index );

        if (out.votesCount !== oldVotesCount + 1) throw "The new votesCount is not right";
        if (vote && out.votesDown !== oldVotesDown) throw "The new votesDown is not right";
        if (!vote && out.votesDown !== oldVotesDown + 1) throw "The new votesDown is not right";

        const newVote = new SybilProtectVote( this._kademliaNode,out.index+1, out.time, out.votesCount, out.votesDown, out.signature);

        if (found === undefined)
            this._sybilProtectVotes.push(newVote);
        else
            this._sybilProtectVotes[found] = newVote;

        this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/updated-sybil', this );
        if (this.autoSave) await this.save();

        await this.publishPandoraBoxMetaSybil( statusName, subsets, words);

    }

    async mergePandoraBoxMetaSybil(statusName){

        try{

            let changes;

            const pandoraBoxMeta = await this._kademliaNode.crawler.iterativeFindPandoraBoxMeta( this._hash );

            if (!pandoraBoxMeta) return;

            if (!this._sybilProtect._sybilProtectIndex || this._sybilProtect._sybilProtectTime < pandoraBoxMeta._sybilProtect._sybilProtectTime)
                this._sybilProtect = new SybilProtect(this._kademliaNode, ...pandoraBoxMeta._sybilProtect.toArray() );


            for (const vote of pandoraBoxMeta._sybilProtectVotes){
                let found = false;

                for (let i=0; i < this._sybilProtectVotes.length; i++) {

                    const vote2 = this._sybilProtectVotes[i];

                    if (vote2._sybilProtectIndex === vote._sybilProtectIndex) {
                        found = true;

                        if (vote2._sybilProtectVotesCount < vote._sybilProtectVotesCount) {
                            const newVote = new SybilProtectVote(this._kademliaNode, ...vote.toArray());
                            this._sybilProtectVotes[i] = newVote;
                            changes = true;
                        }

                        break;
                    }
                }

                if (!found){
                    const newVote = new SybilProtectVote(this._kademliaNode, ...vote.toArray() );
                    this._sybilProtectVotes.push( newVote );
                    changes = true;
                }

            }

            if (changes) {

                this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/updated-sybil', this);
                if (this.autoSave) await this.save();

            }

            this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/crawler/store/merge-by-hash', {hash: this.hash, status: "stored", statusName});

            return true;

        }catch(err){
            console.error(err);
        }

    }


    async publishPandoraBoxMetaSybil(statusName, subsets, words){

        const out = await this._kademliaNode.crawler.iterativeStorePandoraBoxMeta( this, ()=>  this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/crawler/store/by-hash', {hash: this.hash, status: "stored", statusName}) );
        if (!out) return;

        const out2 = await this._kademliaNode.crawler.iterativeStorePandoraBoxName( this, subsets, words, ({index})=>  this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/crawler/store/by-name', {hash: this.hash, status: "stored", index, count: subsets.length, statusName }) );

        if (!out2) return;

        return true;
    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxMetaSybil){
        return super.fromArray(kademliaNode, arr, boxClass);
    }

    async save(){

        const json = {
            encoded: bencode.encode( this.toArray() ).toString('base64'),
        }

        await this._kademliaNode.storage.setItem('pandoraBoxes:meta-box:hash:'+this.hashHex, JSON.stringify( json ) );

        return true;
    }

    async remove(){

        await this._kademliaNode.storage.removeItem('pandoraBoxes:meta-box:hash:'+this.hashHex);
        return true;

    }


    static async load(kademliaNode, hash){

        let out = await kademliaNode.storage.getItem('pandoraBoxes:meta-box:hash:'+hash);
        if (!out) return null;

        const json = JSON.parse(out);

        const decoded = bencode.decode( Buffer.from( json.encoded, 'base64') );
        const box = this.fromArray( kademliaNode, decoded ) ;

        return box;
    }


}