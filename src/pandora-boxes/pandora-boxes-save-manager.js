const async = require('pandora-protocol-kad-reference').library.async;
const PandoraBox = require('./../pandora-box/pandora-box')

module.exports = class PandoraBoxesSaveManager {

    constructor(pandoraProtocolNode, pandoraBoxes) {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBoxes = pandoraBoxes;

        this._loaded = false;
        this._saved = false;

    }

    save( box , cb ) {

        const boxes = this._pandoraBoxes.boxes;

        this._pandoraProtocolNode.storage.setItem('pandoraBoxes:count', boxes.length.toString(), (err, out)=>{

            if (err) return cb(err);

            const array = new Array(boxes.length).fill(1).map( (it, index) => index)
            async.eachLimit( array, 1, ( index, next )=>{

                if (box && boxes[index] !== box) return next();

                this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:index:'+index, boxes[index].hashHex, (err, out)=>{

                    if (err) return next(err);

                    boxes[index].save((err, out)=>{

                        if (err) return next(err);
                        next();

                    });

                } )
            }, (err, out)=>{

                if (err) return cb(err);

                this._saved = true;
                cb(null, boxes.length );

            });

        })

    }

    load(cb){

        const boxes = [];

        this._pandoraProtocolNode.storage.getItem('pandoraBoxes:count', (err, out)=>{

            if (err) return cb(err);
            if (!out){
                this._loaded = true;
                return cb(null, [] )
            }

            let length = Number.parseInt(out);
            const array = new Array(length).fill(1).map( (it, index) => index)

            async.eachLimit( array, 1, ( index, next )=>{
                this._pandoraProtocolNode.storage.getItem('pandoraBoxes:box:index:'+index, (err, hash )=>{

                    if (err) return next(err);
                    if (!hash) return next(new Error('PandoraBox hash was not found by index'))

                    PandoraBox.load(this._pandoraProtocolNode, hash, (err, box )=>{

                        if (err) return next(err);

                        boxes.push( box );
                        next();

                    })

                } )
            }, (err, out)=>{

                if (err) return cb(err);

                async.eachLimit( boxes, 1, ( box, next )=>{

                    this._pandoraBoxes.addPandoraBox(box, false, next);

                }, (err, out)=>{

                    this._loaded = true;
                    cb(err, boxes);

                });

            });

        });

    }


}