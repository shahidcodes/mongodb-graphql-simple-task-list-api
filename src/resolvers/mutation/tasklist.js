const { ObjectID } = require('mongodb');
const { authenticated } = require('../../middleware');

/** @typedef {import('../../../global').ContextType} Context */

module.exports = {
  createTaskList: authenticated(async (_, { title }, { db, user }) => {
    const doc = {
      title,
      createdAt: new Date().toISOString(),
      userIds: [new ObjectID(user._id)],
    };
    const result = await db.collection('task_list').insertOne(doc);
    return result.ops[0];
  }),
  updateTaskList: authenticated(async (
    _,
    { title, id },
    /** @type {Context} */ { db },
  ) => {
    const result = await db.collection('task_list').findOneAndUpdate(
      {
        _id: new ObjectID(id),
      },
      {
        $set: {
          title,
        },
      },
    );
    return result.value;
  }),
  deleteTaskList: authenticated(async (
    _,
    { id },
    /** @type {Context} */ { db },
  ) => {
    const result = await db.collection('task_list').deleteOne({
      _id: new ObjectID(id),
    });
    return result.deletedCount !== 0;
  }),
  addUserToTaskList: authenticated(async (
    _,
    { taskListId, userId },
    /** @type {Context} */ { db },
  ) => {
    const result = await db.collection('task_list').findOneAndUpdate(
      {
        _id: new ObjectID(taskListId),
      },
      {
        $addToSet: {
          userIds: new ObjectID(userId),
        },
      },
    );
    console.log(result);
    return result.value;
  }),
};
