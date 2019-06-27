const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

const APP_CONFIG = require('./config/app.json');

APP_CONFIG.config = {
  devMode: process.argv[2] === '--dev',
  browserRefreshURL: process.env.BROWSER_REFRESH_URL,
};

const table_name = 'members';

const { queryDB } = require('./database');

var session = require('express-session');
const md5 = require('md5');

const getGuid = () => {
  return md5(Math.random().toString(36) + '_' + new Date().getTime() + Math.random().toString(36));
};

const getUser = (req) => {
  const user = {};
  user.is_admin = req.route.path === '/admin';
  if (!req.session.guid) {
    user.guid = req.session.guid = getGuid();
  } else {
    user.guid = req.session.guid;
  }
  user.full_name = user.guid ? req.session.full_name : false;
  return user;
};

const getMembers = () => {
  return queryDB(`SELECT * FROM ${table_name} WHERE confirmed = true`);
};

const escapeInsertedString = (string) => {
  return string.replace(/'/g, '\'\'');
};

const isTeamFull = (team_id) => {
  return queryDB(`SELECT * FROM ${table_name} WHERE team_id = '${team_id}' AND confirmed = true`).then(exists => {
    return exists.length >= getTeamConfig()[team_id].slots;
  });
};

const alreadySignedUp = (user_guid) => {
  return queryDB(`SELECT * FROM ${table_name} WHERE member_guid = '${user_guid}' AND confirmed = true`).then(found => found.length > 0);
};

const signupUser = (data) => {
  data.expires = 'LOCALTIMESTAMP + interval \'3 minute\'';
  return alreadySignedUp(data.guid).then(signedUp => {
    if (!signedUp) {
      return isTeamFull(data.team_id).then((full) => {
        if (full) {
          return { success: false, reason: 'Sorry, but this team is full.' };
        } else {
          return queryDB(`
            INSERT INTO ${table_name}
              (member_guid, member_name, team_id, expires, confirmed)
            VALUES
              ('${data.guid}', '${escapeInsertedString(data.full_name)}', '${data.team_id}', ${data.expires}, 'true')
          `).then(r => {
            return { success: Array.isArray(r) };
          });
        }
      });
    } else {
      return { success: false, reason: 'You already signed up a team!' };
    }
  });
};

const slugify = (text) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

const getTeamConfig = () => {
  return require('./config/teams.json')
    .filter((team) => team && team.name && team.slots > 0)
    .map((team, index) => {
      team.id = index;
      team.slug = slugify(team.name);
      return team;
    });
};

const getTeams = (members, user) => {
  return getTeamConfig()
    .map((team) => {
      team.members = members.filter((member) => {
        member.isMe = member.member_guid === user.guid;
        return member.team_id === team.id && member.confirmed === true;
      });
      return team;
    });
};

const getDefaultData = (req) => {
  const user = getUser(req);
  const clientConfig = JSON.stringify({
    refreshTeamTime: APP_CONFIG.refreshTeamTime,
    isAdmin: user.is_admin,
  });
  return getMembers().then(members => {
    const me = members.filter(member => member.member_guid === user.guid)[0];
    const teams = getTeams(members, user);
    const memberCount = members.filter(member => teams.filter(team => team.id === member.team_id).length > 0).length;
    if (typeof me !== 'undefined' && typeof me.team_id !== 'undefined') {
      user.team_id = me.team_id;
    } else {
      user.team_id = null;
    }
    return {
      app: APP_CONFIG,
      clientConfig,
      teams,
      members,
      memberCount,
      user,
    };
  });
};

const getHomepage = (req, res) => getDefaultData(req).then(data => res.render('pages/index', data));

const getMemberListPage = (req, res) => getDefaultData(req).then(data => res.render('pages/member_list', data));

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(session({
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: null,
    },
    secret:'eeuqram',
    resave: true,
    saveUninitialized: true,
  }))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')

  .get('/team', (req, res) => getDefaultData(req).then(data => {
    const team = data.teams[req.query.team_id];
    data.user.is_admin = req.query.is_admin === 'true';
    res.render('partials/team', {
      user: data.user,
      team,
    });
  }))

  .get('/', getHomepage)
  .get('/admin', getHomepage)
  .get('/members', getMemberListPage)

  .get('/api/setname', (req, res) => {
    req.session.full_name = req.query.full_name;
    res.json({success: true, session: req.session});
  })
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
        res.json({success: r.success, data, reason: r.reason});
      });
    }
  })

  .listen(PORT, () => {
    if (process.send) {
      process.send('online');
    }
    console.log(`Listening on ${ PORT }`);
  });
