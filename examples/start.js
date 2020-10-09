const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const path = require('path');

console.log("PANDORA PROTOCOL REFERENCE EXAMPLE");

//const sybilKeys = KAD.helpers.ECCUtils.createPair();
const sybilKeys = {
    //WARNING! PRIVATE KEY IS PROVIDED ONLY FOR TESTING PURPOSES ONLY!
    privateKey: Buffer.from("68a595199d55260b90d97e6714f27c2a22548f9ee4b2c61956eb628189a8e2ed", "hex"),
    publicKey: Buffer.from("049cf62611922a64575439fd14e0a1190c40184c4d20a1c7179828693d574e84b94b70c3f3995b7a2cd826e1e8ef9eb8ccf90e578891ecfe10de6a4dc9371cd19a", 'hex'),
    uri: 'http://pandoraprotocol.ddns.net:9090/challenge/', //LINK FOR THE PANDORA PROTOCOL SPARTACUS SYBIL PROTECT CHALLENGE
    origin: 'http://pandoraprotocol.ddns.net:9090', //LINK FOR THE PANDORA PROTOCOL SPARTACUS SYBIL PROTECT ORIGIN
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

const port = Number.parseInt(process.env.PORT || 10000);

//addresses
const node = new PANDORA_PROTOCOL.PandoraProtocolNode( path.resolve( __dirname + '/_temp/start_'+port) );

async function execute() {

    await node.start({ port });
    console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode( node.contact.toArray()).toString('hex') )

    if (process.env.BOOTSTRAP){
        const bootstrap = process.env.BOOTSTRAP;
        console.log("bootstrap", bootstrap)
        const out = await node.bootstrap( bootstrap, true);
        console.log("BOOTSTRAPING...", out.length);
    }

}

execute();
global.node = node;
