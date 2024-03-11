/* eslint-disable no-console */

import Bree from 'bree';
import Graceful from '@ladjs/graceful';

const bree = new Bree({
  worker: {
    env: {
      CONNECTION_STRING:
        'mongodb+srv://kapilupwork:itIMKgxtqchCvEX0@cluster0.x3br2lu.mongodb.net/?retryWrites=true&w=majority',
      API_URL: 'http://localhost:9987/',
      JWT_STRING: 'makao#321',
    },
  },
  jobs: [
    {
      name: 'job',
      interval: 'at 12:00 am',
      // interval: '1m',
    },
    {
      name: 'trustNote',
      interval: 'at 12:00 am',
      // interval: '1m',
    },
  ],
  errorHandler: (error, workerMetadata) => {
    // workerMetadata will be populated with extended worker information only if
    // Bree instance is initialized with parameter `workerMetadata: true`
    if (workerMetadata.threadId) {
      console.log(
        `There was an error while running a worker ${workerMetadata.name} with thread ID: ${workerMetadata.threadId}`,
      );
    } else {
      console.log(
        `There was an error while running a worker ${workerMetadata.name}`,
      );
    }
  },
});

// handle graceful reloads, pm2 support, and events like SIGHUP, SIGINT, etc.
const graceful = new Graceful({ brees: [bree] });
graceful.listen();

// start all jobs (this is the equivalent of reloading a crontab):
bree.start();

export default bree;
