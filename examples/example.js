const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const async = require('pandora-protocol-kad-reference').library.async;
const path = require('path');

console.log("SIMPLE Encrypted PANDORA PROTOCOL REFERENCE");

//const sybilKeys = KAD.helpers.ECCUtils.createPair();
const sybilKeys = {
    privateKey: Buffer.from("68a595199d55260b90d97e6714f27c2a22548f9ee4b2c61956eb628189a8e2ed", "hex"),
    publicKey: Buffer.from("049cf62611922a64575439fd14e0a1190c40184c4d20a1c7179828693d574e84b94b70c3f3995b7a2cd826e1e8ef9eb8ccf90e578891ecfe10de6a4dc9371cd19a", 'hex'),
    uri: 'http://pandoraprotocol.ddns.net:9090/challenge/',
}

KAD.init({
    PLUGINS:{
        CONTACT_SYBIL_PROTECT: {
            SYBIL_PUBLIC_KEYS: [ sybilKeys ],
        }
    }
});

PANDORA_PROTOCOL.init({});

if (sybilKeys.privateKey)
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

    const out = await nodes[3].seedPandoraBox( './examples/public/data1',  'Example 1 box simple', 'Example1 Description', ['category1','category2'],  undefined,
        (out) => {

            if (out.chunkIndex % 100 === 0)
                console.log("update", out.chunkIndex, out.path );

        });

    console.info('pandora box hash', out.pandoraBox.hash.toString('hex'))

    const out2 = await nodes[4].findPandoraBoxesByName('box simple');
    console.info('pandora box found', !!out2.result[out.pandoraBox.hash.toString('hex')] )

    const out3 = await nodes[4].getPandoraBox( out.pandoraBox.hash );
    console.info('pandora box get', out3.pandoraBox.hash.toString('hex'));

    out3.pandoraBox.events.on("stream-chunk/done", (data)=>{

        if (data.chunkIndex % 100 === 0)
            console.log(data.stream.path, data.chunkIndex);

    });

    out3.pandoraBox.events.on("streamliner/done", (data)=>{
        console.log("streamliner done!");
    })

    console.log( JSON.stringify( out3.pandoraBox.toJSON(true), null, 4 ) );
    console.log('isDone', out3.pandoraBox.isDone)

}

execute();
global.nodes = nodes;
