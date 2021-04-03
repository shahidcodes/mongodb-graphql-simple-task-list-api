const Query = require('./query');
const Mutation = require('./mutation');
const typeResolvers = require('./type');
/** @type {any} */
module.exports = {
  Query,
  Mutation,
  ...typeResolvers,
};
