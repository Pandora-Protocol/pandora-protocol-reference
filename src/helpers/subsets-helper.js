module.exports.generatePowerSet = function (array) {

    var result = [];

    const power = (1 << array.length);

    for (var i = 1; i < power; i++) {
        var subset = [];
        for (var j = 0; j < array.length; j++)
            if (i & (1 << j))
                subset.push(j);

        result.push(subset);
    }

    return result;
}
