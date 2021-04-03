const { gql } = require('apollo-server');

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

module.exports = typeDefs;
