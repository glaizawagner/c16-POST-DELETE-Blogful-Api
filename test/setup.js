process.env.TZ = 'UTC'; //use to make the date work coz of timezone
require('dotenv').config();
const { expect } = require('chai');
const supertest = require('supertest');

global.expect = expect;
global.supertest = supertest;