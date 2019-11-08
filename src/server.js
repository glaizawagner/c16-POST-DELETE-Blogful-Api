/* eslint-disable no-console */
const knex = require('knex');
const app = require('./app');
const { PORT, DB_URL } = require('./config');

const db = knex({
  client: 'pg',
  connection: DB_URL
});

//use to set the Knex instance
app.set('db', db);

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});


//Note: Here where Knex instance is created
//The server.js file attaches the Knex instance to the app as a property called 'db'