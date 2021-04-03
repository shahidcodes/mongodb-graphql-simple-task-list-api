module.exports = (fn) => (root, data, context) => {
  if (!context.user) throw new Error('unauthorized');
  return fn(root, data, context);
};
