const PandoraBox = require('../pandora-box/box/pandora-box')

module.exports = class PandoraBoxesSaveManager {

    constructor(kademliaNode, pandoraBoxes) {
        this._kademliaNode = kademliaNode;
        this._pandoraBoxes = pandoraBoxes;

        this._loaded = false;
        this._saved = false;

    }

    async save( box  ) {

        const boxes = this._pandoraBoxes.boxes;

        let out = await this._kademliaNode.storage.setItem('pandoraBoxes:count', boxes.length.toString() );

        for (let i=0; i < boxes.length; i++){

            if (box && boxes[i] !== box) return;

            out = await this._kademliaNode.storage.setItem('pandoraBoxes:box:index:'+i, boxes[i].hashHex);

            out = await boxes[i].save();

        }

        this._saved = true;
        return boxes.length;
    }

    async load(){

        const boxes = [];

        let out = await this._kademliaNode.storage.getItem('pandoraBoxes:count');

        if (!out){
            this._loaded = true;
            return [];
        }

        let length = Number.parseInt(out);
        for (let i=0; i < length; i++){

            let hash = await this._kademliaNode.storage.getItem('pandoraBoxes:box:index:'+i);
            if (!hash) throw 'PandoraBox hash was not found by index';

            const box = await PandoraBox.load(this._kademliaNode, hash);
            boxes.push( box );

        }

        for (const box of boxes)
            await this._pandoraBoxes.addPandoraBox(box, false);

        this._loaded = true;
        return boxes;


    }


}