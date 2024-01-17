/* eslint-disable global-require */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-destructuring */
import express, { Express } from 'express';
import { readdir, stat } from 'node:fs/promises';
import path from 'path';

const routes = express.Router();

async function walk(dir: string, fileList: any = []) {
  const files = await readdir(dir);
  for (const file of files) {
    const stats = await stat(path.join(dir, file));
    if (stats.isDirectory()) {
      // eslint-disable-next-line no-param-reassign
      fileList = await walk(path.join(dir, file), fileList);
    } else fileList.push(path.join(dir, file));
  }
  return fileList;
}

export default async function allRoutes(app: Express) {
  const allFiles = await walk('src/v1');

  allFiles.forEach((file: string) => {
    if (file.indexOf('route') > -1) {
      let fileName = file.split('.')[0];
      let routeName = fileName.split('/')[3];
      if (process.platform === 'win32') {
        routeName = fileName.split('\\')[3];
      }
      if (process.platform === 'win32') {
        fileName = fileName.replaceAll('\\', '/');
      }
      fileName = fileName.replace('src', '..');

      // eslint-disable-next-line no-console
      console.log('registering route: ', `/${routeName}`, `${fileName}.routes`);

      // eslint-disable-next-line import/no-dynamic-require
      routes.use(`/${routeName}`, require(`${fileName}.routes`));
    }
  });

  app.use('/api/v1', routes);

  app.route('*').all((req, res) => res.status(404).send({
    msg: `'${req.originalUrl}' is not a invalid endpoint. please check the request URL, Method and try again.`,
  }));
}
