const PandoraBox = require('../../pandora-box/pandora-box')
const bencode = require('pandora-protocol-kad-reference').library.bencode;

module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            delete this._allowedStoreTables[''];
            this._allowedStoreTables.box = {
                validation: this.validatePandoraBox.bind(this),
                expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
            };

            delete this._allowedStoreSortedListTables[''];
            this._allowedStoreSortedListTables.peers = {
                validation: this.validatePeer.bind(this),
                expiry: PANDORA_PROTOCOL_OPTIONS.T_STORE_PEER_KEY_EXPIRY,
            };

        }

        validatePandoraBox(srcContact, [table, key, value]){

            try {

                const pandoraBox = PandoraBox.fromArray(this._kademliaNode, bencode.decode( value )  );
                if (!pandoraBox.hash.equals(key)) return false;

                return true;

            }catch(err){
            }

        }

        validatePeer(srcContact, [table, treeKey, key, value, score] ){

            try{

                if ( score >= new Date().getTime()/1000 + KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_MAX_DRIFT )
                    return false;

                const decoded = bencode.decode( value );
                const contact = this._kademliaNode.createContact( decoded[0] );

                if ( score > contact.timestamp ) return false;
                if ( !contact.verify( treeKey, decoded[1] ) ) return false;

                return true;

            }catch(err){
            }

        }

    }


}