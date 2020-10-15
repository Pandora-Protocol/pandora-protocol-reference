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
            SYBIL_PUBLIC_KEYS: sybilKeys,
        }
    }
});

PANDORA_PROTOCOL.init({});

if (sybilKeys[0].privateKey)
    console.info("SYBIL PRIVATE KEY", sybilKeys[0].privateKey.toString('hex') );

console.info("SYBIL PUBLIC KEY", sybilKeys[0].publicKey.toString('hex') );

const port = Number.parseInt(process.env.PORT || 10000);

//addresses
const node = new PANDORA_PROTOCOL.PandoraProtocolNode( path.resolve( __dirname + '/_temp/start_'+port) );

async function execute() {

    await node.start({ port });

    console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode( node.contact.toArray() ).toString('hex') )

    if (process.env.BOOTSTRAP || config.BOOTSTRAP_CONTACT){
        const bootstrap = process.env.BOOTSTRAP||config.BOOTSTRAP_CONTACT;
        console.log("bootstrap", bootstrap)
        const out = await node.bootstrap( bootstrap, true);
        console.log("BOOTSTRAPING...", out.length);
    }

}

execute();
global.node = node;
