module.exports = {

    /**
     * The stream has to return chunks of size chunkSize in order to boost the performance
     * @param stream
     * @param chunkSize
     * @param cb
     */
    splitStreamIntoChunks( stream, chunkSize, cb){

        let chunkIndex = 0;

        stream.on('data', (chunk)=>{
            try {

                cb(null, {done: false, chunk, chunkIndex: chunkIndex++})

            } catch (ex) {
                return cb(ex, {} )
            }
        })
        stream.on('end', ()=>{


            cb(null, {done: true })

        })
        stream.on('error',()=>{
            cb(new Error('Stream raised an error'), { });
        })

    },


}