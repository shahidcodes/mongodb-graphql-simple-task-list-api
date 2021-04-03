const Query = require("./query");
const Mutation = require("./mutation");
const typeResolvers = require("./type");

module.exports = {
  Query,
  Mutation,
  ...typeResolvers,
};
