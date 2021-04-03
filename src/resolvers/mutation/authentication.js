const bcrypt = require('bcryptjs');
const { sign } = require('../../jwt');

module.exports = {
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
};
