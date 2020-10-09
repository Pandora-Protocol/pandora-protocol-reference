# Pandora Protocol - Protocol Reference

Decentralized Peer to Peer Network for Binary Data Streams (BDS). Protocol Reference.

### Installation

``` 
git clone https://github.com/Pandora-Protocol/protocol-reference

cd protocol-reference
npm install
```

download, and install the other repositories
```
npm link pandora-protocol-kad-reference ;
npm link webpack-config ;
```

### Deploying a Pandora Protocol reference network

a. Creating a new network.

1. Follow the `spartacus-provider-demo` tutorial
2. run `npm run start`
3. copy the Bootstrap contact info (it is a hex string)

b. Joining a network

1. Set `SYBIL_PUBLIC_KEYS` of the network you want to connect.
2. run `PORT=10010 BOOTSTRAP=XXX npm run start` where XXX is the bootstrap contact info in hex.
3. you should see `BOOTSTRAPPING... X` (how many nodes you connected to)

# To Do:

1. Garlic Circuit Encryption 



## DISCLAIMER: 

This source code is released for educational and research purposes only, with the intent of researching and studying a decentralized p2p protocol for binary data streams.

**PANDORA PROTOCOL IS AN OPEN SOURCE COMMUNITY DRIVEN RESEARCH PROJECT. THIS IS RESEARCH CODE PROVIDED TO YOU "AS IS" WITH NO WARRANTIES OF CORRECTNESS. IN NO EVENT SHALL THE CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES. USE AT YOUR OWN RISK.**

**You may not use this source code for any illegal or unethical purpose; including activities which would give rise to criminal or civil liability.**

**Under no event shall the Licensor be responsible for the activities, or any misdeeds, conducted by the Licensee.**
