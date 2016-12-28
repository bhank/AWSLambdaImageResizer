var nodeExternals = require('webpack-node-externals');

module.exports = {
    target: 'node', // don't bundle native node modules // http://stackoverflow.com/questions/33001237/webpack-not-excluding-node-modules
    externals: [nodeExternals()], // don't bundle external node modules
    entry: './handler.js',
    output: {
        libraryTarget: 'commonjs2',
        filename: "./dist/main.js"
    },    
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                query: {
                    presets: ['es2015', 'stage-0']
                }
            }
        ]
    }    
}