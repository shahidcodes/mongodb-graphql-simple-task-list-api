require("dotenv").config();
const { MongoClient, ObjectID } = require("mongodb");
const { ApolloServer, gql } = require("apollo-server");
const bcrypt = require("bcryptjs");
const { sign, verify } = require("./jwt");
const authenticated = require("./middleware/authenticated");

const typeDefs = gql`
  type Query {
    myTaskList: [TaskList!]!
    me: User
    taskList(id: ID!): TaskList
  }

  # mutation

  type Mutation {
    signUp(input: SignUpInput!): AuthUser!
    signIn(input: SignInInput!): AuthUser!
    createTaskList(title: String!): TaskList!
    updateTaskList(title: String!, id: ID!): TaskList!
    deleteTaskList(id: ID!): Boolean
    addUserToTaskList(taskListId: ID!, userId: ID!): TaskList
    createTodo(taskListId: ID!, content: String!): TaskList!
    updateTodo(id: ID!, content: String, isCompleted: Boolean): Todo!
    deleteTodo(id: ID!): Boolean
  }

  #input

  input SignInInput {
    email: String!
    password: String!
  }

  input SignUpInput {
    email: String!
    password: String!
    name: String!
  }

  # custom types

  type AuthUser {
    user: User!
    token: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
  }

  type TaskList {
    id: ID!
    createdAt: String!
    title: String!
    progress: Float!
    users: [User!]!
    todos: [Todo!]!
  }

  type Todo {
    id: ID!
    content: String!
    isCompleted: Boolean!
    taskList: TaskList!
  }
`;

const resolvers = {
  Query: {
    myTaskList: authenticated(async (root, data, { db, user }) => {
      const taskLists = await db
        .collection("task_list")
        .find({
          userIds: ObjectID(user._id),
        })
        .toArray();
      return taskLists;
    }),
    me: authenticated((root, data, { db, user }) => {
      return user;
    }),
    taskList: authenticated(async (
      _,
      { id },
      /** @type {{db: import('mongodb').Db, user:any}} */ { db, user }
    ) => {
      console.log("get task", id);
      const result = await db.collection("task_list").findOne({
        _id: ObjectID(id),
      });
      return result;
    }),
  },
  Mutation: {
    async signUp(_, { input }, { db }) {
      // console.log(input);
      const hashedPassword = bcrypt.hashSync(input.password);
      const user = {
        ...input,
        password: hashedPassword,
      };
      const result = await db.collection("users").insertOne(user);
      const userDoc = result.ops[0];

      return {
        user: userDoc,
        token: await sign(user),
      };
    },
    async signIn(_, { input }, { db }) {
      console.log(input);
      const user = await db.collection("users").findOne({
        email: input.email,
      });
      if (!user) {
        throw new Error("Invalid Credentials");
      }
      const isValid = bcrypt.compareSync(input.password, user.password);
      if (!isValid) {
        throw new Error("Invalid Credentials");
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
        userIds: [ObjectID(user._id)],
      };
      const result = await db.collection("task_list").insertOne(doc);
      return result.ops[0];
    }),
    updateTaskList: authenticated(async (
      _,
      { title, id },
      /** @type {{db: import('mongodb').Db, user:any}} */ { db, user }
    ) => {
      const result = await db.collection("task_list").findOneAndUpdate(
        {
          _id: ObjectID(id),
        },
        {
          $set: {
            title,
          },
        }
      );
      return result.value;
    }),
    deleteTaskList: authenticated(async (
      _,
      { id },
      /** @type {{db: import('mongodb').Db, user:any}} */ { db, user }
    ) => {
      const result = await db.collection("task_list").deleteOne({
        _id: ObjectID(id),
      });
      return result.deletedCount !== 0;
    }),
    addUserToTaskList: authenticated(async (
      _,
      { taskListId, userId },
      /** @type {{db: import('mongodb').Db, user:any}} */ { db, user }
    ) => {
      const result = await db.collection("task_list").findOneAndUpdate(
        {
          _id: ObjectID(taskListId),
        },
        {
          $addToSet: {
            userIds: ObjectID(userId),
          },
        }
      );
      console.log(result);
      return result.value;
    }),
    createTodo: authenticated(async (
      _,
      { taskListId, content },
      /** @type {{db: import('mongodb').Db, user:any}} */ { db, user }
    ) => {
      const todoItem = {
        taskListId: ObjectID(taskListId),
        content,
        isCompleted: false,
      };

      const taskTodo = await db.collection("task_todos").insertOne(todoItem);

      const result = await db.collection("task_list").findOneAndUpdate(
        {
          _id: ObjectID(taskListId),
        },
        {
          $addToSet: {
            todoIds: ObjectID(taskTodo.insertedId),
          },
        }
      );
      console.log(result.value);
      return result.value;
    }),

    updateTodo: authenticated(async (
      _,
      { id, content, isCompleted },
      /** @type {{db: import('mongodb').Db, user:any}} */ { db, user }
    ) => {
      const todoItem = {};

      if (content) todoItem.content = content;
      if (isCompleted) todoItem.isCompleted = isCompleted;

      console.log(todoItem);

      const result = await db.collection("task_todos").findOneAndUpdate(
        {
          _id: ObjectID(id),
        },
        {
          $set: todoItem,
        },
        { returnOriginal: false }
      );
      return result.value;
    }),
  },
  User: {
    // if user is coming from some other resolver which will id instead of _id
    id: ({ _id, id }) => _id || id,
  },
  Todo: {
    id: ({ _id, id }) => _id || id,
  },
  TaskList: {
    id: ({ _id, id }) => _id || id,
    progress: async (
      { todoIds = [] },
      data,
      /** @type {{db: import('mongodb').Db}} */ { db }
    ) => {
      console.log("total", todoIds.length);
      if (todoIds.length === 0) return 0;
      const taskTodos = await db
        .collection("task_todos")
        .find({
          _id: { $in: todoIds.map((id) => ObjectID(id)) },
        })
        .toArray();
      const completed = taskTodos.filter((todo) => todo.isCompleted);
      if (completed.length === 0) return 0;
      const progress = (completed.length / todoIds.length) * 100;
      return Math.round(progress);
    },
    users: async (
      { userIds },
      data,
      /** @type {{db: import('mongodb').Db}} */ { db }
    ) => {
      const users = await db
        .collection("users")
        .find({
          _id: { $in: userIds.map((id) => ObjectID(id)) },
        })
        .toArray();
      return users;
    },
    todos: async (
      { todoIds },
      data,
      /** @type {{db: import('mongodb').Db}} */ { db }
    ) => {
      if (!todoIds) return null;

      console.log("getting todos");
      const todos = await db
        .collection("task_todos")
        .find({
          _id: { $in: todoIds.map((id) => ObjectID(id)) },
        })
        .toArray();

      return todos;
    },
  },
};

async function start() {
  const client = new MongoClient(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  const db = client.db(process.env.DB_NAME);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    async context({ req }) {
      let user;
      try {
        user = await verify(req.headers.authorization);
      } catch (error) {
        user = null;
      }
      return {
        db,
        user,
      };
    },
  });
  const { url } = await server.listen();
  console.log(`🚀 listening at ${url}`);
}

start();
