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


const COUNT = 5;
//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

function newStore(index){
    return new KAD.storage.StoreMemory(index);
}

const keyPairs = new Array(COUNT).fill(1).map( it => KAD.helpers.ECCUtils.createPair() );

const contacts = [];
for (let i=0; i < COUNT; i++) {

    const sybilSignature = KAD.helpers.ECCUtils.sign( sybilKeys.privateKey, KAD.helpers.CryptoUtils.sha256( keyPairs[i].publicKey ) );
    const nonce = Buffer.concat([
        Buffer.from("00", "hex"),
        sybilSignature,
    ]);

    contacts.push([
        KAD_OPTIONS.VERSION.APP,
        KAD_OPTIONS.VERSION.VERSION,
        Buffer.alloc(KAD_OPTIONS.NODE_ID_LENGTH), //empty identity
        protocol,
        '127.0.0.1',
        10000 + i,
        '',
        keyPairs[i].publicKey,
        nonce,
        Math.floor(new Date().getTime() / 1000),
        Buffer.alloc(64), //empty signature
        true,
    ])
}

const nodes = contacts.map(
    (contact, index) => new PANDORA_PROTOCOL.PandoraProtocolNode(
        [ ],
        contact,
        newStore(index),
        undefined,
        path.resolve( __dirname + '/_temp/' + index )
    ) )

nodes.forEach( (it, index) => {
    it.contact.privateKey = keyPairs[index].privateKey
    //it.contact.identity = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH);
    it.contact.identity = it.contact.computeContactIdentity();
    it.contact.signature = it.contact.sign( );

    it.locations.removeDirectory( it.locations.trailingSlash( it.locations._prefix ), ()=>{

        it.start();

    } );
} );

console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode( nodes[0].contact.toArray() ).toString('hex') )

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