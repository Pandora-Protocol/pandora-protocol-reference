module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            delete this._allowedStoreTables[''];
            this._allowedStoreTables.box = true;

            delete this._allowedStoreSortedListTables[''];
            this._allowedStoreSortedListTables.peers = true;

        }

    }


}