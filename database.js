const { 
  Pool, 
  //Client,
} = require('pg');

// const accessDB = async () => {
//   // pools will use environment variables
//   // for connection information
//   const pool = new Pool()

//   pool.query('SELECT * FROM signups', (err, res) => {
//     // console.log(err, res)
//     console.log(res.rows[0]);
//     pool.end()
//   })

//   // // you can also use async/await
//   // const res = await pool.query('SELECT NOW()')
//   // await pool.end()

//   // // clients will also use environment variables
//   // // for connection information
//   // const client = new Client()
//   // await client.connect()

//   // const res = await client.query('SELECT NOW()')
//   // await client.end()
// };

//accessDB();

const queryDB = (query) => {
  const { Client } = require('pg');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
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