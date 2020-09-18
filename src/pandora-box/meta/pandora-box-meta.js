const PandoraBoxMetaHelper = require('./pandora-box-meta-helper')
const {CryptoUtils, Utils} = require('pandora-protocol-kad-reference').helpers;

module.exports = class PandoraBoxMeta {

    constructor(kademliaNode, version, name, size, categories, metaDataHash ) {

        this._kademliaNode = kademliaNode;

        name = name.toString();
        categories = categories.map( it => it.toString() );

        PandoraBoxMetaHelper.validatePandoraBoxMeta(version, name, size, categories, metaDataHash);

        this._version = version;
        this._name = name;
        this._size = size;
        this._categories = categories;
        this._metaDataHash = metaDataHash;

        this._hash = CryptoUtils.sha256( PandoraBoxMetaHelper.computePandoraBoxMetaBuffer(this._version, this._name, this._size, this._categories, this._metaDataHash) ) ;
        this._hashHex = this._hash.toString('hex');

        this._keys = ['version', 'name', 'size', 'categories', 'metaDataHash'];
        this._keysFilter = {};

    }

    get hash(){
        return this._hash;
    }

    get hashHex(){
        return this._hashHex;
    }

    get version(){
        return this._version;
    }

    get categories(){
        return this._categories;
    }

    get name(){
        return this._name;
    }

    get size(){
        return this._size;
    }

    get metaDataHash(){
        return this._metaDataHash;
    }

    toArray(keysFilter = {}){
        return Utils.toArray(this, this._keys, {...keysFilter, ...this._keysFilter} );
    }

    static fromArray(kademliaNode, arr, boxClass = PandoraBoxMeta ){
        return new boxClass(  kademliaNode, ...arr);
    }

    toJSON(hex = false){
        return Utils.toJSON(this, this._keys, this._keysFilter, hex );
    }

}