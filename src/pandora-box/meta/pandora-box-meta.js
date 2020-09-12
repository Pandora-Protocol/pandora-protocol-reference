const PandoraBoxMetaHelper = require('./pandora-box-meta-helper')

module.exports = class PandoraBoxMeta {

    constructor(kademliaNode, version, name, description, streamsHash) {

        this._kademliaNode = kademliaNode;

        PandoraBoxMetaHelper.validatePandoraBoxMeta(version, name, description, streamsHash);

        this._version = version;
        this._name = name;
        this._description = description;
        this._streamsHash = streamsHash;

        this._hash = PandoraBoxMetaHelper.computePandoraBoxMetaHash(version, name, description, streamsHash);
        this._hashHex = this._hash.toString('hex');

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

    get name(){
        return this._name;
    }

    get description(){
        return this._description;
    }

    get streamsHash(){
        return this._streamsHash;
    }


    toArray(){
        return [ this.version, this.name, this.description, this.streamsHash ];
    }

    static fromArray(kademliaNode, arr){
        return new PandoraBoxMeta(kademliaNode, arr[0].toString(), arr[1].toString(), arr[2].toString(), arr[3] );
    }

    toJSON(){
        return {
            name: this.name,
            description: this.description,
            streamsHash: this.streamsHash,
        }
    }

}