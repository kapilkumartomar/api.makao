/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

import mongoose from 'mongoose';
import parentPort from 'worker_threads';
import MongoConnection from '../config/mongoConnection';

console.log('Running crons!');

(async () => {
  if (mongoose.connection.readyState === 0) await MongoConnection();

  console.log('mongoose connection', mongoose.connection.readyState);

  console.log('cron job executed!');

  // Call or create functions here

  // throw Error("error in code");
  // signal to parent that the job is done
  if (parentPort) parentPort?.postMessage('done');
  else process.exit(0);
})();
