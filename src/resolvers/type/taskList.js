const { ObjectID } = require('mongodb');

/** @typedef {import('../../../global').ContextType} Context */

module.exports = {
  id: ({ _id, id }) => _id || id,
  progress: async ({ todoIds = [] }, data, /** @type {Context} */ { db }) => {
    console.log('total', todoIds.length);
    if (todoIds.length === 0) return 0;
    const taskTodos = await db
      .collection('task_todos')
      .find({
        _id: { $in: todoIds.map((id) => new ObjectID(id)) },
      })
      .toArray();
    const completed = taskTodos.filter((todo) => todo.isCompleted);
    if (completed.length === 0) return 0;
    const progress = (completed.length / todoIds.length) * 100;
    return Math.round(progress);
  },
  users: async ({ userIds }, data, /** @type {Context} */ { db }) => {
    const users = await db
      .collection('users')
      .find({
        _id: { $in: userIds.map((id) => new ObjectID(id)) },
      })
      .toArray();
    return users;
  },
  todos: async ({ todoIds }, data, /** @type {Context} */ { db }) => {
    if (!todoIds) return null;

    console.log('getting todos');
    const todos = await db
      .collection('task_todos')
      .find({
        _id: { $in: todoIds.map((id) => new ObjectID(id)) },
      })
      .toArray();

    return todos;
  },
};
