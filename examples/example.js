const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const async = require('pandora-protocol-kad-reference').library.async;
const path = require('path');

console.log("SIMPLE Encrypted PANDORA PROTOCOL REFERENCE");

//const sybilKeys = KAD.helpers.ECCUtils.createPair();
const sybilKeys = {
    publicKey: Buffer.from("049cf62611922a64575439fd14e0a1190c40184c4d20a1c7179828693d574e84b94b70c3f3995b7a2cd826e1e8ef9eb8ccf90e578891ecfe10de6a4dc9371cd19a", 'hex'),
    uri: 'http://pandoraprotocol.ddns.net:9090'
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

                nodes[4].findPandoraBoxesByName('box simple',(err, out2)=>{
                    console.info('pandora box found', !!out2.result[out.pandoraBox.hash.toString('hex')] )
                })

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


