const PandoraBoxMeta = require('../meta/pandora-box-meta')
const SybilProtectVote = require('../../sybil-protect/sybil-protect-vote');
const SybilProtect = require('../../sybil-protect/sybil-protect');
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
                sybilProtectVotes[i] = SybilProtectVote.fromArray(sybilProtectVotes[i]);

            const vote = sybilProtectVotes[i];

            if (indexAlready[vote._sybilProtectIndex])
                throw "Sybil Protect Index already used";

            indexAlready[vote._sybilProtectIndex] = true;

            vote.validateSybilProtectVote(vote._sybilProtectIndex, [vote._sybilProtectTime, vote._sybilProtectVotes ], vote._sybilProtectSignature, this._hash);
        }

        this._sybilProtectVotes = sybilProtectVotes;

        this._keys.push('sybilProtect','sybilProtectVotes');

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

        const ts = this._sybilProtect._sybilProtectTime -  PANDORA_PROTOCOL_OPTIONS.SYBIL_VOTE_DATE_OFFSET;

        let totalVotes = 0;
        for (const vote of this._sybilProtectVotes)
            totalVotes += vote._sybilProtectVotesCount - 2*vote._sybilProtectVotesDown;

        const x = 1 + totalVotes;
        const y = Math.sign(x);
        const z = Math.max(1, Math.abs(x) );

        return Math.trunc( Math.log10( z + (y * ts) / 45000 ) );
    }

    getTotalVotes(){
        let totalVotes = 0;

        for (const vote of this._sybilProtectVotes)
            totalVotes += vote._sybilProtectVotesCount;

        return totalVotes;
    }

    async boxMetaSybilProtectVoteSign(){

        const index = this._kademliaNode.sybilProtectSigner.getRandomSybilIndex();

        let oldSignature, oldVotesCount, oldVotesDown, oldTime;

        for (const vote of this._sybilProtectVotes)
            if (vote.sybilProtectIndex === index){
                oldTime = vote.sybilProtectTime;
                oldVotesCount = vote.sybilProtectVotesCount;
                oldVotesDown = vote.sybilProtectVotesDown;
                oldSignature = vote.sybilProtectSignature;
            }

        const out = await this._kademliaNode.sybilProtectSigner.sign( {
            message: this.hash
        }, {
            includeTime: true,
            includeVotes: true,
            old: {
                time: oldTime,
                votesCount: oldVotesCount,
                votesDown: oldVotesDown,
                signature: oldSignature
            },

        }, index );

        const vote = new SybilProtectVote( this._kademliaNode,out.index+1, out.time, out.votesCount, out.votesDown, out.signature);


    }

    async mergePandoraBoxMetaSybil(){

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
                    const vote = new SybilProtectVote(this._kademliaNode, ...vote.toArray() );
                    this._sybilProtectVotes.push( vote );
                    changes = true;
                }

            }

            if (changes)
                this._kademliaNode.pandoraBoxes.emit('pandora-box-meta/updated-sybil', this );

        }catch(err){

        }
    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxMetaSybil){
        return super.fromArray(kademliaNode, arr, boxClass);
    }

}