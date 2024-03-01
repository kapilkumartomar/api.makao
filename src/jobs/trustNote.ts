/* eslint-disable no-console */

import mongoose from 'mongoose';
import parentPort from 'worker_threads';
import MongoConnection from '../config/mongoConnection';

(async () => {
  try {
    if (mongoose.connection.readyState === 0) await MongoConnection();
    // Call or create functions here
  } catch (ex: any) {
    console.log('Error in cron', ex?.message);
  }
  // throw Error("error in code");
  // signal to parent that the job is done
  if (parentPort && parentPort?.postMessage) parentPort?.postMessage('done');
  else process.exit(0);
})();
