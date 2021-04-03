const { ObjectID } = require('mongodb');
const { authenticated } = require('../../middleware');

/** @typedef {import('../../../global').ContextType} Context */

module.exports = {
  createTodo: authenticated(async (
    _,
    { taskListId, content },
    /** @type {Context} */ { db },
  ) => {
    const todoItem = {
      taskListId: new ObjectID(taskListId),
      content,
      isCompleted: false,
    };

    const taskTodo = await db.collection('task_todos').insertOne(todoItem);

    const result = await db.collection('task_list').findOneAndUpdate(
      {
        _id: new ObjectID(taskListId),
      },
      {
        $addToSet: {
          todoIds: new ObjectID(taskTodo.insertedId),
        },
      },
    );
    console.log(result.value);
    return result.value;
  }),

  updateTodo: authenticated(async (
    _,
    { id, content, isCompleted },
    /** @type {Context} */ { db },
  ) => {
    const todoItem = {};

    if (content) todoItem.content = content;
    if (isCompleted) todoItem.isCompleted = isCompleted;

    console.log(todoItem);

    const result = await db.collection('task_todos').findOneAndUpdate(
      {
        _id: new ObjectID(id),
      },
      {
        $set: todoItem,
      },
      { returnOriginal: false },
    );
    return result.value;
  }),
};
