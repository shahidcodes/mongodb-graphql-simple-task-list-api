const bcrypt = require('bcryptjs');
const { ObjectID } = require('mongodb');
const { sign } = require('../jwt');
const authenticated = require('../middleware/authenticated');

/** @typedef {import('../../global').ContextType} ContextType */

const Mutation = {
  async signUp(_, { input }, { db }) {
    // console.log(input);
    const hashedPassword = bcrypt.hashSync(input.password);
    const user = {
      ...input,
      password: hashedPassword,
    };
    const result = await db.collection('users').insertOne(user);
    const userDoc = result.ops[0];

    return {
      user: userDoc,
      token: await sign(user),
    };
  },
  async signIn(_, { input }, { db }) {
    console.log(input);
    const user = await db.collection('users').findOne({
      email: input.email,
    });
    if (!user) {
      throw new Error('Invalid Credentials');
    }
    const isValid = bcrypt.compareSync(input.password, user.password);
    if (!isValid) {
      throw new Error('Invalid Credentials');
    }

    return {
      user,
      token: await sign(user),
    };
  },
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
    /** @type {ContextType} */ { db },
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
    /** @type {ContextType} */ { db },
  ) => {
    const result = await db.collection('task_list').deleteOne({
      _id: new ObjectID(id),
    });
    return result.deletedCount !== 0;
  }),
  addUserToTaskList: authenticated(async (
    _,
    { taskListId, userId },
    /** @type {ContextType} */ { db },
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
  createTodo: authenticated(async (
    _,
    { taskListId, content },
    /** @type {ContextType} */ { db },
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
    /** @type {ContextType} */ { db },
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

module.exports = Mutation;
