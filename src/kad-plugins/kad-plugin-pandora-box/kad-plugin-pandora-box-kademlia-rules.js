const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('../../pandora-box/pandora-box')
const PandoraBoxMeta = require('../../pandora-box/meta/pandora-box-meta')
const PandoraBoxHelper = require('../../pandora-box/pandora-box-helper')
const PandoraBoxMetaHelper = require('../../pandora-box/meta/pandora-box-meta-helper')
const {CryptoUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            delete this._allowedStoreTables[''];
            delete this._allowedStoreSortedListTables[''];

            this._allowedStoreTables.box = {
                validation: this.validatePandoraBox.bind(this),
                expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
            };

            this._allowedStoreSortedListTables.peers = {
                validation: this.validatePeer.bind(this),
                expiry: PANDORA_PROTOCOL_OPTIONS.T_STORE_PEER_KEY_EXPIRY,
            };

            this._allowedStoreSortedListTables.name = {
                validation: this.validateName.bind(this),
                expiry: PANDORA_PROTOCOL_OPTIONS.T_STORE_KEY_EXPIRY,
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

        validateName(srcContact, [table, treeKey, key, value, score]){
            try{

                const decoded = bencode.decode( value );

                const pandoraBoxMeta = PandoraBoxMeta.fromArray(this._kademliaNode, bencode.decode( decoded[0] )  );
                if (!pandoraBoxMeta.hash.equals(key)) return false;

                const name = PandoraBoxMetaHelper.processPandoraBoxMetaName(pandoraBoxMeta.name);
                const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name).slice(0, PANDORA_PROTOCOL_OPTIONS.PANDORA_BOX_FIND_BY_NAME_MAX_WORDS );

                const subset = decoded[1];
                if (!subset || !Array.isArray(subset)) return false;

                const v = [];
                for (const index of subset)
                    if (typeof index !== "number" || index >= words.length || index < 0)
                        return false;
                    else
                        v.push( words[ index ] );

                if (!v.length) return false;

                const s = v.join(' ');
                const hash = CryptoUtils.sha26(Buffer.from(s));
                if (!treeKey.equals(hash)) return false;

                return true;

            }catch(err){

            }
        }

    }


}