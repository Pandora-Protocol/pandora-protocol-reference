module.exports = {

    PANDORA_BOX_FIND_BY_NAME_MAX_WORDS: 6,

    PANDORA_BOX_MAX_SIZE: 32*1024*1024, //32kb
    PANDORA_BOX_META_MAX_SIZE: 2*1024*1024, //2kb

    SYBIL_VOTE_DATE_OFFSET: 1582149600,

    T_STORE_PEER_KEY_EXPIRY: 30*1000,
    T_STORE_PEER_KEY_EXPIRY_CONVOY: 10*1000,

    PLUGINS: {
        STREAMLINER:{
            MAX_STREAMLINER_SENDING_CHUNKS_QUEUE_COUNT: 200,
        }
    },


}