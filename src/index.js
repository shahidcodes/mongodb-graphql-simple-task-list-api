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
  }

  # mutation

  type Mutation {
    signUp(input: SignUpInput!): AuthUser!
    signIn(input: SignInInput!): AuthUser!
    createTaskList(title: String!): TaskList!
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
  },
  User: {
    // if user is coming from some other resolver which will id instead of _id
    id: ({ _id, id }) => _id || id,
  },
  TaskList: {
    id: ({ _id, id }) => _id || id,
    progress: ({ todos = [] }) => todos.length,
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
