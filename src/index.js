require('dotenv').config();
const { MongoClient } = require('mongodb');
const { ApolloServer } = require('apollo-server');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');

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
