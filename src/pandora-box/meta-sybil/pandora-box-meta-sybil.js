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

            if (indexAlready[vote.sybilProtectIndex])
                throw "Sybil Protect Index already used";

            indexAlready[vote.sybilProtectIndex] = true;

            vote.validateSybilProtectVote(vote.sybilProtectIndex, [vote.sybilProtectTime, vote.sybilProtectVotes ], vote.sybilProtectSignature, this._hash);
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

    getScore(){

        let totalVotes = 0;
        for (const vote of this._sybilProtectVotes)
            totalVotes += vote.sybilProtectVotes;

        return totalVotes;
    }

    async boxMetaSybilProtectVoteSign(){

        const index = this._kademliaNode.sybilProtectSign.getRandomSybilIndex();

        let oldSignature,oldVotes;

        for (const vote of this._sybilProtectVotes)
            if (vote.sybilProtectIndex === index){
                oldSignature = vote.sybilProtectSignature;
                oldVotes = vote.sybilProtectVotes;
            }

        const out = await this._kademliaNode.sybilProtectSign.sign( {message: this.hash }, {includeTime: true, includeVotes: true, votes: oldVotes, signature: oldSignature }, index );

        const vote = new SybilProtectVote(out.index+1, out.time, out.votes, out.signature);


    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxMetaSybil){
        return super.fromArray(kademliaNode, arr, boxClass);
    }

}