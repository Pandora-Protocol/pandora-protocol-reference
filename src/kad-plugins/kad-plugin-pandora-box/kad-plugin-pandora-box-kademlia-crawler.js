const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('./../../pandora-box/pandora-box')
const PandoraBoxMeta = require('./../../pandora-box/meta/pandora-box-meta')
const PandoraBoxMetaHelper = require('../../pandora-box/meta/pandora-box-meta-helper')
const SubsetsHelper = require('./../../helpers/subsets-helper')
const tableBox =  Buffer.from('box', 'ascii');
const tablePeers =  Buffer.from('peers', 'ascii');
const tableName =  Buffer.from('name', 'ascii');

const async = require('pandora-protocol-kad-reference').library.async;
const { CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = function(options){

    return class MyCrawler extends options.Crawler {

        iterativeStorePandoraBox( pandoraBox, cb ){
            this.iterativeStoreValue( tableBox, pandoraBox.hash, '', bencode.encode( pandoraBox.toArray() ), cb);
        }

        iterativeFindPandoraBox( hash, cb ){

            this.iterativeFindValue( tableBox, hash, (err, out)=>{

                if (err) return cb(err, null);

                try{

                    if (!out.result) throw Error(`PandoraBox couldn't be found`);
                    const pandoraBox = PandoraBox.fromArray(this._kademliaNode, bencode.decode( out.result[''].value ) );

                    cb(null, pandoraBox);

                }catch(err){
                    cb(err);
                }

            });
        }

        iterativeStorePandoraBoxPeer( pandoraBox, contact = this._kademliaNode.contact, date, cb ){

            if (pandoraBox instanceof PandoraBox) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) return cb(new Error('PandoraBox needs to be hash'));

            if ( (new Date().getTime()/1000 - contact.timestamp) >= KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE )
                contact.contactUpdated();

            const signature = contact.sign( pandoraBox );

            this.iterativeStoreSortedListValue( tablePeers, pandoraBox, contact.identity, bencode.encode( [ contact.toArray(), signature] ), contact.timestamp, cb);
        }

        iterativeFindPandoraBoxPeersList( pandoraBox, cb){

            if (pandoraBox instanceof PandoraBox) pandoraBox = pandoraBox.hash;
            if (!Buffer.isBuffer(pandoraBox)) return cb(new Error('PandoraBox needs to be hash'));

            this.iterativeFindSortedList( tablePeers, pandoraBox, (err, out ) =>{

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

        iterativeStorePandoraBoxName( pandoraBoxMeta, cb ){

            if (pandoraBoxMeta instanceof PandoraBox) pandoraBoxMeta = pandoraBoxMeta.convertToPandoraBoxMeta();

            const name = PandoraBoxMetaHelper.processPandoraBoxMetaName(pandoraBoxMeta.name);
            const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name).slice(0, PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_FIND_BY_NAME_MAX_WORDS );

            const subsets = SubsetsHelper.generatePowerSet(words);

            const pandoraBoxMetaArray = pandoraBoxMeta.toArray();

            const array = new Array(subsets.length).fill(1).map( (it, index) => index)
            const output = [];

            async.eachLimit(  array, 1, ( index, next) => {

                const subset = subsets[index];

                const v = [];

                for (const index of subset)
                    v.push( words[ index ] );

                const s = v.join(' ');
                const hash = CryptoUtils.sha256(Buffer.from(s));

                this.iterativeStoreSortedListValue( tableName, hash, pandoraBoxMeta.hash, bencode.encode( [ pandoraBoxMetaArray, subset] ), 0, (err, out) => {
                    if (err) return next(err);
                    output[index] = out;
                    next();
                });


            }, (err, out)=>{

                if (err) return cb(err);
                cb(null, output);

            });


        }

        iterativeFindPandoraBoxesByName(name, cb){

            name = PandoraBoxMetaHelper.processPandoraBoxMetaName(name);
            const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name).slice(0, PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_FIND_BY_NAME_MAX_WORDS );

            const s = words.join(' ');
            const hash = CryptoUtils.sha256(Buffer.from(s));

            this.iterativeFindSortedList( tableName, hash, (err, out) =>{

                if (err) return cb(err, null);

                try{

                    if (!out.result) throw Error(`PandoraBox couldn't be found`);


                    for (const key in out.result){
                        const decoded = bencode.decode( out.result[key].value );
                        const pandoraBoxMeta = PandoraBoxMeta.fromArray(this._kademliaNode, decoded[0]  );

                        out.result[key] = pandoraBoxMeta;
                    }
                    cb(null, out );

                }catch(err){
                    cb(err);
                }

            } );

        }

    }



}