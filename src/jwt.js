const { createSigner, createVerifier } = require("fast-jwt");

const sign = createSigner({ key: process.env.JWT_KEY });
const verify = createVerifier({ key: process.env.JWT_KEY });

module.exports = {
  sign,
  verify,
};
