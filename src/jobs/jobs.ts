/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

import mongoose from 'mongoose';
import parentPort from 'worker_threads';
import MongoConnection from '../config/mongoConnection';

console.log('Running crons!');

(async () => {
  if (mongoose.connection.readyState === 0) await MongoConnection();

  console.log('mongoose connection', mongoose.connection.readyState);

  // Get the current date and time
  const currentDate = new Date();
  // Get the current day of the week as a number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDayNumber = currentDate.getDay();
  // Define an array of day names
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  // Get the current day name
  const currentDayName = dayNames[currentDayNumber];
  // Get the current hour (0-23)
  const currentHour = currentDate.getHours();

  // throw Error("error in code");
  // signal to parent that the job is done
  if (parentPort) parentPort?.postMessage('done');
  else process.exit(0);
})();
