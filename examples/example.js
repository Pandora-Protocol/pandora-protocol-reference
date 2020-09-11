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
            SYBIL_PUBLIC_KEYS: [ sybilKeys ],
        }
    }
});
PANDORA_PROTOCOL.init({});

console.info("SYBIL PRIVATE KEY", sybilKeys.privateKey.toString('hex') );
console.info("SYBIL PUBLIC KEY", sybilKeys.publicKey.toString('hex') );

const COUNT = 6;

// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
//KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

//addresses
const array = new Array( COUNT ).fill(1).map( (it, i) => i )

const nodes = array.map(
    (contact, index) => new PANDORA_PROTOCOL.PandoraProtocolNode(
        path.resolve( __dirname + '/_temp/' + index ),
    ) )

async.eachLimit( array, 1, (index, next ) => {

    nodes[index].start( { port: 10000+index } ).then((out)=>{
        console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode( nodes[index].contact.toArray()).toString('hex'))
        next(null, out)
    })

}, (err, out)=>{

    async.eachLimit(  nodes, 1, (node, next) => {
        node.bootstrap( nodes[0].contact, false, ()=>{
            console.log("BOOTSTRAPING...");
            //fix for websockets
            setTimeout( next, 100 );
        } );

    }, (err, out)=>{

        console.log('NODES BOOTSTRAPPED');

        nodes[3].seedPandoraBox( './examples/public/data1',  'Example 1 box simple', 'Example1 Description',  undefined,
            (err, out) => {

                if (out.chunkIndex % 100 === 0)
                    console.log("update", out.chunkIndex, out.path );

            },
            (err, out )=>{

                if (err) return console.error(err);
                console.info('pandora box hash', out.pandoraBox.hash.toString('hex'))

                nodes[4].getPandoraBox( out.pandoraBox.hash, (err, out )=>{

                    if (err) return console.error(err);

                    out.pandoraBox.events.on("stream-chunk/done", (data)=>{

                        if (data.chunkIndex % 100 === 0)
                            console.log(data.stream.path, data.chunkIndex);

                    });

                    out.pandoraBox.events.on("streamliner/done", (data)=>{
                        console.log("streamliner done!");
                    })

                    console.log( JSON.stringify( out.pandoraBox.toJSON(), null, 4 ) );
                    console.log('isDone', out.pandoraBox.isDone)

                })

            });

    });

})

global.nodes = nodes;


