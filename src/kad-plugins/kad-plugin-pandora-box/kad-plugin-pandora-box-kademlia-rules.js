const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBox = require('../../pandora-box/box/pandora-box')
const PandoraBoxMeta = require('../../pandora-box/meta/pandora-box-meta')
const PandoraBoxHelper = require('../../pandora-box/box/pandora-box-helper')
const PandoraBoxMetaHelper = require('../../pandora-box/meta/pandora-box-meta-helper')
const {CryptoUtils, ECCUtils} = require('pandora-protocol-kad-reference').helpers;

module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            delete this._allowedStoreTables[''];
            delete this._allowedStoreSortedListTables[''];

            this._allowedStoreTables.box = {
                validation: this.validatePandoraBox.bind(this),
                expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                immutable: true,
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

        validatePandoraBox(srcContact, self, [table, key, value], old){

            try {

                const pandoraBox = PandoraBox.fromArray(this._kademliaNode, bencode.decode( value )  );
                if (!pandoraBox.hash.equals(key)) return null;

                if (!pandoraBox.sybilProtectIndex) return null;
                if (!pandoraBox.sybilProtectTime) return null;

                return value;

            }catch(err){
            }

        }

        validatePeer(srcContact, self, [table, masterKey, key, value, score], old ){

            try{

                if ( old && old.score >= score ) return null;

                const decoded = bencode.decode( value );
                const contact = this._kademliaNode.createContact( decoded[0], false );

                if ( score !== contact.timestamp ) {
                    console.error("Timestamp is not matching with score", score, contact.timestamp );
                    return null;
                }

                if ( !contact.verify( masterKey, decoded[1] ) ) return null;

                return {value, score};

            }catch(err){
            }

        }

        validateName(srcContact, self, [table, masterKey, key, value, score]){
            try{

                const decoded = bencode.decode( value );

                const pandoraBoxMeta = PandoraBoxMeta.fromArray(this._kademliaNode, decoded[0] );
                if (!pandoraBoxMeta.hash.equals(key)) return null;

                const boxScore = pandoraBoxMeta.sybilProtectTime;
                if ( score !== boxScore ) return null;

                const name = PandoraBoxMetaHelper.processPandoraBoxMetaName(pandoraBoxMeta.name);
                const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name);

                const subset = decoded[1];
                if (!subset || !Array.isArray(subset)) return null;

                const v = [];
                for (const index of subset)
                    if (typeof index !== "number" || index >= words.length || index < 0)
                        return false;
                    else
                        v.push( words[ index ] );

                if (!v.length) return null;

                const s = v.join(' ');
                const hash = CryptoUtils.sha256(Buffer.from(s));
                if (!masterKey.equals(hash)) return null;

                return {value, score};

            }catch(err){

            }

        }

    }


}