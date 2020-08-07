const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const async = require('pandora-protocol-kad-reference').library.async;
const path = require('path');

console.log("SIMPLE Encrypted PANDORA PROTOCOL REFERENCE");

//const sybilKeys = KAD.helpers.ECCUtils.createPair();
const sybilKeys = {
    privateKey: Buffer.from("b485c3728923b3cc3ad88d8b10c69b3c68818594ca0d213542caad212fa7c063", 'hex'),
    publicKey: Buffer.from("04e67b866b907ad108d1bb1fbddf2672dfe96c8f1e24a9f922f57e330eca7ab1af821a40e4a29594df1e014083ab2112c5a3d1f1333c7717b7e73d63cea7feeef8", 'hex'),
}

KAD.init({
    PLUGINS:{
        CONTACT_SYBIL_PROTECT: {
            SYBIL_PUBLIC_KEYS: [ sybilKeys.publicKey ],
        }
    }
});
PANDORA_PROTOCOL.init({});

console.info("SYBIL PRIVATE KEY", sybilKeys.privateKey.toString('hex') );
console.info("SYBIL PUBLIC KEY", sybilKeys.publicKey.toString('hex') );

const COUNT = 6;

//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

//addresses
const array = new Array( COUNT ).fill(1).map( (it, i) => i )

const nodes = array.map(
    (contact, index) => new PANDORA_PROTOCOL.PandoraProtocolNode(
        path.resolve( __dirname + '/_temp/' + index ),
    ) )

async.eachLimit( array, 1, (index, next )=>{

    nodes[index].contactStorage.loadContact( (err, out) =>{

        if (!err) return next();

        const keyPair = KAD.helpers.ECCUtils.createPair();

        const sybilSignature = KAD.helpers.ECCUtils.sign( sybilKeys.privateKey, KAD.helpers.CryptoUtils.sha256( keyPair.publicKey ) );
        const nonce = Buffer.concat([
            Buffer.from("00", "hex"),
            sybilSignature,
        ]);

        const contact = nodes[index].contactStorage.createContactArgs( keyPair.privateKey, keyPair.publicKey, nonce, protocol, undefined, 8000+index )

        nodes[index].contactStorage.setContact( keyPair.privateKey, contact, true, true, next)

    } );


}, ()=>{

    for (const node of nodes) {
        node.start();
        console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode(node.contact.toArray()).toString('hex'))
    }

    async.eachLimit(  nodes, 1, (node, next) => {
        node.bootstrap( nodes[0].contact, false, ()=>{
            console.log("BOOTSTRAPING...");
            //fix for websockets
            setTimeout( ()=>{
                next()
            }, 200 );
        } );
    }, (err, out)=>{

        console.log('NODES BOOTSTRAPPED');

        nodes[3].seedPandoraBox( './examples/public/data1',  'Example1', 'Example1 Description',  undefined,
            (err, out) => {

                if (out.chunkIndex % 100 === 0)
                    console.log("update", out.chunkIndex, out.path );

            },
            (err, out )=>{

                console.info('pandora box hash', out.pandoraBox.hash.toString('hex'))
                if (err) return console.log(err);

                nodes[4].getPandoraBox( out.pandoraBox.hash, (err, out )=>{

                    out.pandoraBox.on("stream-chunk/done", (data)=>{

                        if (data.chunkIndex % 100 === 0)
                            console.log(data.stream.path, data.chunkIndex);

                    });

                    out.pandoraBox.on("streamliner/done", (data)=>{
                        console.log("streamliner done!");
                    })

                    console.log( JSON.stringify( out.pandoraBox.toJSON(), null, 4 ) );

                })

            });

    });

})




