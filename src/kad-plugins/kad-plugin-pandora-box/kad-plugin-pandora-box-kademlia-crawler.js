const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('./../../pandora-box/pandora-box')
const Contact = require('pandora-protocol-kad-reference').Contact;

const tableBox =  Buffer.from('box', 'ascii');
const tablePeers =  Buffer.from('peers', 'ascii');

module.exports = function(crawler){

    crawler.iterativeStorePandoraBox = iterativeStorePandoraBox;
    crawler.iterativeFindPandoraBox = iterativeFindPandoraBox;

    crawler.iterativeStorePandoraBoxPeer = iterativeStorePandoraBoxPeer;
    crawler.iterativeFindPandoraBoxPeersList = iterativeFindPandoraBoxPeersList;



    function iterativeStorePandoraBox( pandoraBox, cb ){
        this.iterativeStoreValue( tableBox, pandoraBox.hash, bencode.encode( pandoraBox.toArray() ).toString('hex'), cb);
    }

    function iterativeFindPandoraBox( hash, cb ){

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



    function iterativeStorePandoraBoxPeer( pandoraBox, contact, date, cb ){
        this.iterativeStoreSortedListValue( tablePeers, pandoraBox, bencode.encode( contact.toArray() ).toString('hex'), date, cb);
    }

    function iterativeFindPandoraBoxPeersList(hash, cb){

        this.iterativeFindSortedList( tablePeers, hash , (err, out ) =>{

            if (err) return cb(err, null);

            const peers = [];
            for (const peer of out.result){
                const decoded = bencode.decode( Buffer.from( peer[0], 'hex') );
                peers.push({
                    contact: Contact.fromArray(this._kademliaNode, decoded),
                    score: peer[1],
                })
            }

            cb(null, peers);

        });
    }


}