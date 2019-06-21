const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

const APP_CONFIG = require('./config/app.json');

APP_CONFIG.config = {
  devMode: process.argv[2] === '--dev',
  browserRefreshURL: process.env.BROWSER_REFRESH_URL,
};

const table_name = 'members';

const { queryDB, } = require('./database');

var cookieParser = require('cookie-parser');
var session = require('express-session');

const md5 = require('md5');

const getGuid = () => {
  return md5(Math.random().toString(36) + '_' + new Date().getTime() + Math.random().toString(36))
};

const getUser = (req) => {
  const user = {};
  user.is_admin = req.route.path === '/admin';
  if (!req.session.guid) {
    user.guid = req.session.guid = getGuid();
  } else {
    user.guid = req.session.guid;
  }
  return user;
};

const getMembers = () => {
  return queryDB(`SELECT * FROM ${table_name} WHERE confirmed = true`);
};

const escapeInsertedString = (string) => {
  return string.replace(/\'/g, '\'\'')
};

const signupUser = (data) => {
  data.expires = `LOCALTIMESTAMP + interval '3 minute'`;
  return queryDB(`
    INSERT INTO ${table_name} 
      (member_guid, member_name, team_id, expires, confirmed)
    VALUES
      ('${data.guid}', '${escapeInsertedString(data.full_name)}', '${data.team_id}', ${data.expires}, 'true');
  `).then(r => {
    return { success: Array.isArray(r) };
  });
};

function slugify(text)
{
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

const getTeams = (members) => {
  return require('./config/teams.json')
    .map((team, index) => {
      team.id = index;
      team.slug = slugify(team.name);
      team.members = members.filter(function(member) {
        return member.team_id === team.id && member.confirmed === true;
      });
      return team;
    });
};

const getHomepage = (req, res) => {
  getMembers().then(members => {
    res.render('pages/index', {
      app: APP_CONFIG,
      teams: getTeams(members),
      members,
      user: getUser(req),
    });
  });
};

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(cookieParser())
  .use(session({secret: "Shh, its a secret!"}))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  
  .get('/', getHomepage)
  .get('/admin', getHomepage)

  .get('/api/admin/reset', (req, res) => {
    queryDB(`DELETE FROM ${table_name}`).then((r) => {
      res.json({ success: Array.isArray(r) });
    });
  })
  .get('/api/admin/remove_member', (req, res) => {
    queryDB(`DELETE FROM ${table_name} WHERE member_guid = '${req.query.guid}'`).then((r) => {
      res.json({ success: Array.isArray(r) });
    });
  })
  .get('/api/*', (req, res) => {
    const data = req.query;
    if (req.params[0] === 'signup') {
      signupUser(data).then((r) => {
        res.json({success: r.success, data});
      });
    }
  })
  
  .listen(PORT, () => {
    if (process.send) {
      process.send('online');
    }
    console.log(`Listening on ${ PORT }`);
  });
