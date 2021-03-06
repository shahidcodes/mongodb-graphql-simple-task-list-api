const { ObjectID } = require('mongodb');
const { authenticated } = require('../../middleware');

/** @typedef {import('../../../global').ContextType} Context */

const Query = {
  myTaskList: authenticated(async (root, data, { db, user }) => {
    const taskLists = await db
      .collection('task_list')
      .find({
        userIds: new ObjectID(user._id),
      })
      .toArray();
    return taskLists;
  }),
  me: authenticated((root, data, { user }) => user),
  taskList: authenticated(async (_, { id }, /** @type {Context} */ { db }) => {
    console.log('get task', id);
    const result = await db.collection('task_list').findOne({
      _id: new ObjectID(id),
    });
    return result;
  }),
};

module.exports = Query;
