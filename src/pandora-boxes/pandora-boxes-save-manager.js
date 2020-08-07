const bencode = require('pandora-protocol-kad-reference').library.bencode;
const async = require('pandora-protocol-kad-reference').library.async;

module.exports = class PandoraBoxesSaveManager {

    constructor(pandoraProtocolNode, pandoraBoxes) {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._pandoraBoxes = pandoraBoxes;

        this._loaded = false;
        this._saved = false;

    }

    remove(box, cb){

        this._pandoraProtocolNode.storage.removeItem('pandoraBoxes:box:hash:'+box.hashHex, (err, out)=>{

            if (err) return cb(err);

            this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:hash-exists:'+box.hashHex, cb )

        } )

    }

    save( boxes = this._pandoraBoxes.boxes, cb ) {

        this._pandoraProtocolNode.storage.setItem('pandoraBoxes:count', boxes.length.toString(), (err, out)=>{

            if (err) return cb(err);

            const array = new Array(boxes.length).fill(1).map( (it, index) => index)
            async.eachLimit( array, 1, ( index, next )=>{
                this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:index:'+index, boxes[index].hashHex, (err, out)=>{

                    if (err) return cb(err);

                    this._pandoraProtocolNode.storage.getItem('pandoraBoxes:box:hash-exists:'+boxes[index].hashHex, (err, out) =>{

                        if (err) return cb(err);

                        if ( out && out === "1" ) return next();

                        this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:hash:'+boxes[index].hashHex, bencode.encode( boxes[index].toArray() ).toString('base64'), (err, out)=>{

                            if (err) return cb(err);

                            this._pandoraProtocolNode.storage.setItem('pandoraBoxes:box:hash-exists:'+boxes[index].hashHex, "1", next )

                        } )

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

        this._pandoraProtocolNode.storage.setItem('pandoraBoxes:count', (err, out)=>{

            if (err) return cb(err);

            let length = Number.parseInt(out);
            const array = new Array(length).fill(1).map( (it, index) => index)

            async.eachLimit( array, 1, ( index, next )=>{
                this._pandoraProtocolNode.storage.getItem('pandoraBoxes:box:index:'+index, (err, hash )=>{

                    if (err) return cb(err);
                    this._pandoraProtocolNode.storage.getItem('pandoraBoxes:box:hash:'+hash, (err, out)=>{

                        if (err) return cb(err);

                        const buffer = Buffer.from(out, 'base64');
                        const box = bencode.decode( buffer );
                        boxes.push(box);

                    } )

                } )
            }, (err, out)=>{

                if (err) return cb(err);

                async.eachLimit( boxes, 1, ( box, next )=>{

                    this._pandoraBoxes.addPandoraBox(box, false, next);

                }, (err, out)=>{

                    this._loaded = true;
                    cb(err, out);

                });

            });

        });

    }

}