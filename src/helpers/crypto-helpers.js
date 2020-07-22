const crypto = require('crypto');

module.exports = {

    sha256(buffer){
        const hash = crypto.createHash('sha256');
        hash.update(buffer);
        return hash.digest('buffer');
    }

}