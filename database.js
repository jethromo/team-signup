const queryDB = (query) => {
  const { Client } = require('pg');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.argv[2] !== '--dev',
  });
  
  client.connect();

  console.log({query});
  
  return new Promise(resolve => {
    client.query(query, (err, res) => {
      if (err) {
        console.error(err);
      }
      client.end();
      resolve(res && res.rows ? res.rows : res);
    });
  });
};

module.exports = {
  queryDB,
};