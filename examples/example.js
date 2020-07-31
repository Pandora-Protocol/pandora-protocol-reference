const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const async = require('pandora-protocol-kad-reference').library.async;
const path = require('path');

KAD.init({});
PANDORA_PROTOCOL.init({});

console.log("SIMPLE Encrypted PANDORA PROTOCOL REFERENCE");

const COUNT = 5;
//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

function newStore(index){
    return new KAD.storage.StoreMemory(index);
}

const keyPairs = [];
for (let i=0; i < COUNT; i++) {
    const privateKey = KAD.helpers.ECCUtils.createPrivateKey();
    keyPairs[i] = {
        publicKey: KAD.helpers.ECCUtils.getPublicKey(privateKey),
        privateKey
    }
}

const contacts = [];
for (let i=0; i < COUNT; i++)
    contacts.push( [
        0,
        Buffer.alloc( global.KAD_OPTIONS.NODE_ID_LENGTH ), //empty identity
        protocol,
        '127.0.0.1',
        10000 + i,
        '',
        keyPairs[i].publicKey,
        new Date().getTime(),
        KAD.helpers.BufferUtils.genBuffer( 64 ),
        Buffer.alloc(64), //empty signature
        true,
    ] )

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

    nodes[3].seedPandoraBox( './examples/public/data1',  'Example1', 'Example1 Description',  undefined,(err, out )=>{

        console.info('pandora box hash', out.pandoraBox.hash.toString('hex'))
        if (err) return console.log(err);

        nodes[4].getPandoraBox( out.pandoraBox.hash, (err, out )=>{

            out.pandoraBox.on("streamliner/done", (data)=>{
                console.log("streamliner done!");
            })

            console.log( JSON.stringify( out.pandoraBox.toJSON(), null, 4 ) );

        })

    } );

});