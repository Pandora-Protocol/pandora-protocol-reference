const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('./../../pandora-box/pandora-box')
const Contact = require('pandora-protocol-kad-reference').Contact;

const tableBox =  Buffer.from('box', 'ascii');
const tablePeers =  Buffer.from('peers', 'ascii');

module.exports = function(options){

    return class MyCrawler extends options.Crawler {

        iterativeStorePandoraBox( pandoraBox, cb ){
            this.iterativeStoreValue( tableBox, pandoraBox.hash, bencode.encode( pandoraBox.toArray() ).toString('hex'), cb);
        }

        iterativeFindPandoraBox( hash, cb ){

            this.iterativeFindValue( tableBox, hash, (err, out)=>{

                if (err) return cb(err, null);

                try{

                    if (!out.result) throw Error(`PandoraBox couldn't be found`);
                    const pandoraBox = PandoraBox.fromArray(this._kademliaNode, bencode.decode( Buffer.from(out.result, 'hex') ) );

                    cb(null, pandoraBox);

                }catch(err){
                    cb(err);
                }

            });
        }



        iterativeStorePandoraBoxPeer( pandoraBox, contact, date, cb ){
            this.iterativeStoreSortedListValue( tablePeers, pandoraBox, bencode.encode( contact.toArray() ).toString('hex'), date, cb);
        }

        iterativeFindPandoraBoxPeersList(hash, cb){

            this.iterativeFindSortedList( tablePeers, hash , (err, out ) =>{

                if (err) return cb(err, null);

                if ( !out.result) return cb( new Error('Peers not found') );

                try{

                    const peers = [];
                    for (const peer of out.result){
                        const decoded = bencode.decode( Buffer.from( peer[0], 'hex') );
                        const contact = this._kademliaNode.createContact( decoded)

                        if (contact.identity.equals( this._kademliaNode.contact.identity ))
                            continue;

                        peers.push({
                            contact: contact,
                            score: peer[1],
                        })
                    }

                    cb(null, peers);

                }catch(err){
                    cb(err);
                }


            });
        }



    }

}