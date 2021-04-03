import { Db } from 'mongodb';

type ContextType = {
  db: Db;
  user?: {
    name: string;
    email: string;
  };
};
