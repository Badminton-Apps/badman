module.exports = {
  module: {
    rules: [
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: '@graphql-tools/webpack-loader',
      },
    ],
  },
};
