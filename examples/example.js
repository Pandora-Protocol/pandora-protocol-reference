const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const path = require('path');
const config = require('../config/config')

console.log("PANDORA PROTOCOL REFERENCE EXAMPLE");

let sybilKeys = config.SYBIL_PROTECT_KEYS, sybilKeyIsNotEmpty = false;
for (const sybilKey of sybilKeys)
    if (!sybilKey.publicKey.equals(Buffer.alloc(65)) || ( sybilKey.privateKey && sybilKey.privateKey.equals(Buffer.alloc(32) )) ) {
        sybilKeyIsNotEmpty = true;
        break;
    }

if (!sybilKeyIsNotEmpty)
    sybilKeys = [ KAD.helpers.ECCUtils.createPair() ];

KAD.init({
    PLUGINS:{
        CONTACT_SYBIL_PROTECT: {
            SYBIL_PUBLIC_KEYS: sybilKeys ,
        }
    }
});

PANDORA_PROTOCOL.init({});

if (sybilKeys[0].privateKey)
    console.info("SYBIL PRIVATE KEY", sybilKeys[0].privateKey.toString('hex') );

console.info("SYBIL PUBLIC KEY", sybilKeys[0].publicKey.toString('hex') );

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

async function execute() {

    for (let i = 0; i < nodes.length; i++) {
        await nodes[i].start({port: 10000 + i});
        console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode( nodes[i].contact.toArray()).toString('hex') )
    }

    for (let i = 1; i < nodes.length; i++) {
        const out = await nodes[i].bootstrap(nodes[0].contact, true);
        console.log("BOOTSTRAPING...", out.length);
    }

    console.log('NODES BOOTSTRAPPED');
    for (let i = 0; i < nodes.length; i++)
        console.log(i, nodes[i].routingTable.count, nodes[i].routingTable.array.map(it => it.contact.contactType));

    const name = 'Example 1 box simple';
    const out = await nodes[3].seedPandoraBox( './examples/public/data1',  name, 'Example1 Description', ['category1','category2'] );

    nodes[3].pandoraBoxes.on( 'pandora-box/creating', (data) =>{

        if (data.name === name){
            console.log(data.status);
            if (data.chunkIndex && data.chunkIndex % 100 === 0)
                console.log("update", data.chunkIndex, data.path );

        }

    });

    console.info('pandora box hash', out.pandoraBox.hash.toString('hex'))

    let initialized = false;
    while (!initialized)
        initialized = await out.pandoraBox.streamliner.initializeStreamliner();

    const out2 = await nodes[4].findPandoraBoxesByName('box simple');
    if (!out2) throw "pandora box was not found by name";

    console.info('pandora box found', !!out2[out.pandoraBox.hash.toString('hex')] )

    const out3 = await nodes[4].getPandoraBox( out.pandoraBox.hash );
    console.info('pandora box get', out3.pandoraBox.hash.toString('hex'));

    nodes[4].pandoraBoxes.on("stream/chunk/done", ({pandoraBox, stream, chunkIndex}) => {

        if (pandoraBox.hash.equals(out.pandoraBox.hash) && chunkIndex % 100 === 0)
            console.log(stream.path, chunkIndex);

    });

    nodes[4].pandoraBoxes.on("pandora-box/done", ({pandoraBox}) =>{

        if (pandoraBox.hash.equals(out.pandoraBox.hash))
            console.log("streamliner done!");

    })

    console.log( JSON.stringify( out3.pandoraBox.toJSON(true), null, 4 ) );
    console.log('isDone', out3.pandoraBox.isDone)

}

execute();
global.nodes = nodes;
