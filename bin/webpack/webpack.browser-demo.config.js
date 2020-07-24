const path = require('path');
const base = require('./webpack-config-browser');
const merge = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv, pathResolve) => {

    if (!pathResolve)
        pathResolve = p => path.resolve( __dirname + p);

    return merge ( base(env, argv, pathResolve), {

        output: {
            filename: './demo/bundle-protocol-demo.js'
        },

        plugins: [
            new CopyPlugin({
                patterns: [

                    {
                        from: './build/output/demo/',
                        to: '../../../browser-demo/dist/protocol/'
                    }

                ]
            })
        ]

    });
};
