/* eslint-disable global-require */

const authentication = require('./authentication');
const taskList = require('./tasklist');
const todo = require('./todo');

const Mutation = {
  ...authentication,
  ...taskList,
  ...todo,
};

module.exports = Mutation;
