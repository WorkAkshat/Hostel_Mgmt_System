import client, { BASE_URL } from './api/client';
import * as auth from './api/auth';
import * as students from './api/students';
import * as rooms from './api/rooms';
import * as leaves from './api/leaves';
import * as complaints from './api/complaints';
import * as visitors from './api/visitors';
import * as fees from './api/fees';
import * as mess from './api/mess';
import * as staff from './api/staff';
import * as dashboard from './api/dashboard';

export default client;
export {
  BASE_URL,
  auth,
  students,
  rooms,
  leaves,
  complaints,
  visitors,
  fees,
  mess,
  staff,
  dashboard
};
