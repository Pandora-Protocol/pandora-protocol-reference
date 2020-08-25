const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('./../../pandora-box/pandora-box')

const tableBox =  Buffer.from('box', 'ascii');
const tablePeers =  Buffer.from('peers', 'ascii');

module.exports = function(options){

    return class MyCrawler extends options.Crawler {

        iterativeStorePandoraBox( pandoraBox, cb ){
            this.iterativeStoreValue( tableBox, pandoraBox.hash, bencode.encode( pandoraBox.toArray() ), cb);
        }

        iterativeFindPandoraBox( hash, cb ){

            this.iterativeFindValue( tableBox, hash, true, (err, out)=>{

                if (err) return cb(err, null);

                try{

                    if (!out.result) throw Error(`PandoraBox couldn't be found`);
                    const pandoraBox = PandoraBox.fromArray(this._kademliaNode, bencode.decode( out.result.value ) );

                    cb(null, pandoraBox);

                }catch(err){
                    cb(err);
                }

            });
        }



        iterativeStorePandoraBoxPeer( pandoraBox, contact = this._kademliaNode.contact, date, cb ){

            if (pandoraBox instanceof PandoraBox) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) return cb(new Error('PandoraBox needs to be hash'));

            if ( new Date().getTime()/1000 - contact.timestamp >= KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE )
                contact.contactUpdated();

            const signature = contact.sign( pandoraBox );

            this.iterativeStoreSortedListValue( tablePeers, pandoraBox, contact.identity, bencode.encode( [ contact.toArray(), signature] ), contact.timestamp, cb);

        }

        iterativeFindPandoraBoxPeersList( pandoraBox, cb){

            if (pandoraBox instanceof PandoraBox) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) return cb(new Error('PandoraBox needs to be hash'));

            this.iterativeFindSortedList( tablePeers, pandoraBox, false, (err, out ) =>{

                if (err) return cb(err, null);

                if ( !out.result) return cb( new Error('Peers not found') );

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

                cb(null, peers);

            });
        }



    }

}