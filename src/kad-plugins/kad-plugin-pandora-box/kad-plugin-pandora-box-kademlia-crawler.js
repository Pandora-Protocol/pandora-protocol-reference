const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBoxSybil = require('../../pandora-box/box-sybil/pandora-box-sybil')
const PandoraBoxMeta = require('./../../pandora-box/meta/pandora-box-meta')
const PandoraBoxMetaSybil = require('./../../pandora-box/meta-sybil/pandora-box-meta-sybil')
const PandoraBoxMetaHelper = require('../../pandora-box/meta/pandora-box-meta-helper')
const SubsetsHelper = require('./../../helpers/subsets-helper')
const { CryptoUtils } = require('pandora-protocol-kad-reference').helpers;

const tableBox =  Buffer.from('box', 'ascii');
const tableBoxMeta =  Buffer.from('meta', 'ascii');
const tablePeers =  Buffer.from('peers', 'ascii');
const tableName =  Buffer.from('name', 'ascii');

module.exports = function(options){

    return class MyCrawler extends options.Crawler {

        /**
         * Pandora Box
         * @param pandoraBox
         * @returns {*}
         */

        iterativeStorePandoraBox( pandoraBox ){
            if (! (pandoraBox instanceof PandoraBoxSybil)) throw "PandoraBox is invalid";
            return this.iterativeStoreValue( tableBox, pandoraBox.hash, bencode.encode( pandoraBox.toArray() ) );
        }

        async iterativeFindPandoraBox( hash ){

            const out = await this.iterativeFindValue( tableBox, hash );

            if (!out) return null;
            const pandoraBox = PandoraBoxSybil.fromArray(this._kademliaNode, bencode.decode( out.value ) );

            return pandoraBox;

        }


        /**
         * Pandora Box Meta
         * @param pandoraBoxMeta
         */

        iterativeStorePandoraBoxMeta( pandoraBoxMeta ){
            if (! (pandoraBoxMeta instanceof PandoraBoxMetaSybil)) throw "PandoraBoxMeta is invalid";
            return this.iterativeStoreValue( tableBoxMeta, pandoraBoxMeta.hash, bencode.encode( [ pandoraBoxMeta.toArray(), pandoraBoxMeta.getTotalVotes(), pandoraBoxMeta.sybilProtect.sybilProtectTime ] ) );
        }

        async iterativeFindPandoraBoxMeta( hash ){

            const out = await this.iterativeFindValue( tableBoxMeta, hash );

            if (!out) return null;

            const decoded = bencode.decode( out.value );
            const pandoraBoxMeta = PandoraBoxMetaSybil.fromArray(this._kademliaNode, decoded[0] );

            return pandoraBoxMeta;

        }

        /**
         * Pandora Box Peers
         */

        iterativeStorePandoraBoxPeer( pandoraBox, contact = this._kademliaNode.contact, date ){

            if (pandoraBox instanceof PandoraBoxMeta) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) throw 'PandoraBox needs to be a hash';

            if ( (new Date().getTime()/1000 - contact.timestamp) >= KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE )
                contact.contactUpdated();

            const signature = contact.sign( pandoraBox );

            return this.iterativeStoreSortedListValue( tablePeers, pandoraBox, contact.identity, bencode.encode( [ contact.toArray(), signature] ), contact.timestamp );
        }

        async iterativeFindPandoraBoxPeersList( pandoraBox ){

            if (pandoraBox instanceof PandoraBoxMeta) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) throw 'PandoraBox needs to be a hash';

            const out = await this.iterativeFindSortedList( tablePeers, pandoraBox );

            if ( !out) return null;

            const peers = [];
            for (const peerId in out){

                try{

                    const peer = out[peerId];

                    const decoded = bencode.decode( peer.value );
                    const contact = this._kademliaNode.createContact( decoded[0] )

                    //avoid myself
                    if (contact.identity.equals( this._kademliaNode.contact.identity ))
                        continue;

                    peers.push({
                        contact: contact,
                        score: peer.score,
                    })

                }catch(err){

                }

            }

            return peers;
        }

        /**
         * Pandora Box Name
         * @param pandoraBoxMeta
         * @returns {Promise<number>}
         */

        async iterativeStorePandoraBoxName( pandoraBoxMeta ){

            if (! (pandoraBoxMeta instanceof PandoraBoxMetaSybil)) throw "PandoraBoxMeta is invalid";

            const name = PandoraBoxMetaHelper.processPandoraBoxMetaName(pandoraBoxMeta.name);
            const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name);

            const subsets = SubsetsHelper.generatePowerSet(words);

            const metaArray = pandoraBoxMeta.toArray();

            const score = pandoraBoxMeta.getScore();
            const totalVotes = pandoraBoxMeta.getTotalVotes();

            const output = [];

            for (let index = 0; index < subsets.length; index++ ){

                const subset = subsets[index];

                const v = [];

                for (const index of subset)
                    v.push( words[ index ] );

                const s = v.join(' ');
                const hash = CryptoUtils.sha256( Buffer.from(s) );


                const out = await this.iterativeStoreSortedListValue( tableName, hash, pandoraBoxMeta.hash, bencode.encode( [ metaArray, subset, pandoraBoxMeta.sybilProtect.sybilProtectTime, totalVotes,  ] ), score );
                output[index] = out;

            }

            return output.length;

        }

        async iterativeFindPandoraBoxesByName(name){

            name = PandoraBoxMetaHelper.processPandoraBoxMetaName(name);
            const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name);

            const s = words.join(' ');
            const hash = CryptoUtils.sha256(Buffer.from(s));

            const out = await this.iterativeFindSortedList( tableName, hash );

            if (!out) return null;

            for (const key in out){
                const decoded = bencode.decode( out[key].value );
                const pandoraBoxMeta = PandoraBoxMetaSybil.fromArray(this._kademliaNode, decoded[0]  );

                out[key] = pandoraBoxMeta;
            }

            return out;

        }

    }



}