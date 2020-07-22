module.exports = function (rules){

    delete rules._allowedStoreTables[''];
    rules._allowedStoreTables.box = true;

    delete rules._allowedStoreSortedListTables[''];
    rules._allowedStoreSortedListTables.peers = true;

}