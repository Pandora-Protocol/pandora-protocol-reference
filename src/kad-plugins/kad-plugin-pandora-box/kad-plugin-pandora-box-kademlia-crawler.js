const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('./../../pandora-box/pandora-box')
const PandoraBoxMeta = require('./../../pandora-box/meta/pandora-box-meta')
const PandoraBoxMetaHelper = require('../../pandora-box/meta/pandora-box-meta-helper')
const SubsetsHelper = require('./../../helpers/subsets-helper')
const tableBox =  Buffer.from('box', 'ascii');
const tablePeers =  Buffer.from('peers', 'ascii');
const tableName =  Buffer.from('name', 'ascii');
const { CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = function(options){

    return class MyCrawler extends options.Crawler {

        iterativeStorePandoraBox( pandoraBox ){
            return this.iterativeStoreValue( tableBox, pandoraBox.hash, bencode.encode( pandoraBox.toArray() ) );
        }

        async iterativeFindPandoraBox( hash ){

            const out = await this.iterativeFindValue( tableBox, hash );

            if (!out.result) throw `PandoraBox couldn't be found`;
            const pandoraBox = PandoraBox.fromArray(this._kademliaNode, bencode.decode( out.result.value ) );

            return pandoraBox;

        }

        iterativeStorePandoraBoxPeer( pandoraBox, contact = this._kademliaNode.contact, date ){

            if (pandoraBox instanceof PandoraBox) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) throw 'PandoraBox needs to be hash';

            if ( (new Date().getTime()/1000 - contact.timestamp) >= KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE )
                contact.contactUpdated();

            const signature = contact.sign( pandoraBox );

            console.log("iterativeStorePandoraBoxPeer", contact.identityHex);

            return this.iterativeStoreSortedListValue( tablePeers, pandoraBox, contact.identity, bencode.encode( [ contact.toArray(), signature] ), contact.timestamp );
        }

        async iterativeFindPandoraBoxPeersList( pandoraBox ){

            if (pandoraBox instanceof PandoraBox) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) throw 'PandoraBox needs to be hash';

            const out = await this.iterativeFindSortedList( tablePeers, pandoraBox );

            if ( !out.result) return null;

            const peers = [];
            for (const peerId in out.result){

                try{

                    const peer = out.result[peerId];

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

        async iterativeStorePandoraBoxName( pandoraBoxMeta ){

            if (pandoraBoxMeta instanceof PandoraBox) pandoraBoxMeta = pandoraBoxMeta.convertToPandoraBoxMeta();

            const name = PandoraBoxMetaHelper.processPandoraBoxMetaName(pandoraBoxMeta.name);
            const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name);

            const subsets = SubsetsHelper.generatePowerSet(words);

            const pandoraBoxMetaArray = pandoraBoxMeta.toArray();

            const output = [];

            for (let index = 0; index < subsets.length; index++ ){

                const subset = subsets[index];

                const v = [];

                for (const index of subset)
                    v.push( words[ index ] );

                const s = v.join(' ');
                const hash = CryptoUtils.sha256( Buffer.from(s) );

                const out = await this.iterativeStoreSortedListValue( tableName, hash, pandoraBoxMeta.hash, bencode.encode( [ pandoraBoxMetaArray, subset ] ), pandoraBoxMeta.sybilProtectTime);
                output[index] = out;

            }

        }

        async iterativeFindPandoraBoxesByName(name){

            name = PandoraBoxMetaHelper.processPandoraBoxMetaName(name);
            const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name);

            const s = words.join(' ');
            const hash = CryptoUtils.sha256(Buffer.from(s));

            const out = await this.iterativeFindSortedList( tableName, hash );

            if (!out.result) throw `PandoraBox couldn't be found`;

            for (const key in out.result){
                const decoded = bencode.decode( out.result[key].value );
                const pandoraBoxMeta = PandoraBoxMeta.fromArray(this._kademliaNode, decoded[0]  );

                out.result[key] = pandoraBoxMeta;
            }

            return out;

        }

    }



}