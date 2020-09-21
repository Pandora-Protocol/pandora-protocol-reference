const bencode = require('pandora-protocol-kad-reference').library.bencode;
const PandoraBoxSybil = require('../../pandora-box/box-sybil/pandora-box-sybil')
const PandoraBoxMetaSybil = require('../../pandora-box/meta-sybil/pandora-box-meta-sybil')
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

            this._allowedStoreTables.meta = {
                validation: this.validatePandoraBoxMeta.bind(this),
                expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                immutable: false,
            };

            this._allowedStoreSortedListTables.peers = {
                validation: this.validatePeer.bind(this),
                expiry: PANDORA_PROTOCOL_OPTIONS.T_STORE_PEER_KEY_EXPIRY,
                immutable: false,
            };

            this._allowedStoreSortedListTables.name = {
                validation: this.validateName.bind(this),
                expiry: PANDORA_PROTOCOL_OPTIONS.T_STORE_KEY_EXPIRY,
                immutable: false,
            };

        }

        validatePandoraBox(srcContact, self, [table, key, value], oldExtra ){

            try {

                const arr = bencode.decode( value );
                arr.push(true); //onlyValidation = true

                const pandoraBox = PandoraBoxSybil.fromArray(this._kademliaNode, arr, undefined );
                if (!pandoraBox.hash.equals(key)) return null;

                if (!pandoraBox._sybilProtect._sybilProtectIndex) return;
                if (!pandoraBox._sybilProtect._sybilProtectTime) return;

                return {value, extra: true};

            }catch(err){
            }

        }

        validatePandoraBoxMeta(srcContact, self, [table, key, value], oldExtra ){

            try {

                const decoded = bencode.decode( value );
                let [ metaArray, totalVotes, sybilProtectTime ] = decoded;

                if (oldExtra){
                    if (oldExtra[0] < sybilProtectTime ) return; //last was better
                    if (oldExtra[1] > totalVotes ) return; //last had more votes
                    if (oldExtra[1] === totalVotes && oldExtra[0] === sybilProtectTime) return; //identical
                }

                const pandoraBoxMeta = PandoraBoxMetaSybil.fromArray(this._kademliaNode, metaArray );
                if (!pandoraBoxMeta.hash.equals(key)) return;

                if (!pandoraBoxMeta._sybilProtect._sybilProtectIndex) return;
                if (!pandoraBoxMeta._sybilProtect._sybilProtectTime) return;

                if (totalVotes !== pandoraBoxMeta.getTotalVotes() ) return;
                if (sybilProtectTime !== pandoraBoxMeta._sybilProtect._sybilProtectTime) return;

                return {value, extra: [sybilProtectTime, totalVotes ]};

            }catch(err){
            }

        }

        validatePeer(srcContact, self, [table, masterKey, key, value, score], oldExtra ){

            try{

                if ( oldExtra && oldExtra[0].score >= score ) return; //identical

                const decoded = bencode.decode( value );
                const contact = this._kademliaNode.createContact( decoded[0], false );

                if ( score !== contact.timestamp ) return;

                if ( !contact.verify( masterKey, decoded[1] ) ) return;

                return {value, score, extra: [score] };

            }catch(err){
            }

        }

        validateName(srcContact, self, [table, masterKey, key, value, score], oldExtra){
            try{

                const decoded = bencode.decode( value );
                const [ metaArray, subset, sybilProtectTime, totalVotes ] = decoded;

                if (oldExtra){
                    if (oldExtra[0] < sybilProtectTime ) return; //last was better
                    if (oldExtra[1] > totalVotes ) return; //last had more votes
                    if (oldExtra[1] === totalVotes && oldExtra[0] === sybilProtectTime) return; //identical
                }

                const pandoraBoxMeta = PandoraBoxMetaSybil.fromArray(this._kademliaNode, metaArray );
                if (!pandoraBoxMeta.hash.equals(key)) return;

                const boxScore = pandoraBoxMeta.getScore() ;
                if ( score !== boxScore ) return;

                if (totalVotes !== pandoraBoxMeta.getTotalVotes() ) return;
                if (sybilProtectTime !== pandoraBoxMeta._sybilProtect._sybilProtectTime) return;

                const name = PandoraBoxMetaHelper.processPandoraBoxMetaName(pandoraBoxMeta.name);
                const words = PandoraBoxMetaHelper.splitPandoraBoxMetaName(name);

                if (!subset || !Array.isArray(subset)) return;

                const v = [];
                for (const index of subset)
                    if (typeof index !== "number" || index >= words.length || index < 0)
                        return;
                    else
                        v.push( words[ index ] );

                if (!v.length) return;

                const s = v.join(' ');
                const hash = CryptoUtils.sha256(Buffer.from(s));
                if (!masterKey.equals(hash)) return;

                return { value, score, extra: [sybilProtectTime, totalVotes] };

            }catch(err){

            }

        }

    }


}