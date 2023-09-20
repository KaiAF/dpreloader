require('dotenv').config();
const { execSync } = require('child_process');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const fs = require('fs');
const app = express();

const config = JSON.parse(fs.readFileSync('config.json').toString());

let worldPath = null;

(function () {
  worldPath = config.server.worldPath;
  if (!worldPath.endsWith('/datapacks') && !worldPath.endsWith('/datapacks/')) {
    console.warn('Appended \'/datapacks\' to the worldPath');
    worldPath = worldPath + '/datapacks';
  }

  try {
    new URL(config.datapackRepo);
  } catch (e) {
    console.error(`'${config.datapackRepo}' is an invalid URL. Closing.`);
    process.exit(1);
  }
})();

const MaxRequests = rateLimit({
  windowMs: config.ratelimit.maxTime,
  limit: config.ratelimit.limit,
  message: 'Too many requests were made in a short amount of time. Please try again later.'
});

app.use(MaxRequests);

app.get('/upload', async function (req, res) {
  try {
    fs.rmSync(config.server.worldPath, { recursive: true });
    execSync(`git clone ${config.datapackRepo} ${config.server.worldPath}`);
    try {
      switch (config.multiplexer.type) {
        case 'tmux':
          execSync(`tmux send-keys -t ${config.multiplexer.paneName}:0 "reload${config.server.isBukkit ? ' confirm' : ''}" C-m`);
          break;
        case 'screen':
          execSync(`screen -X -S ${config.multiplexer.paneName} stuff "reload${config.server.isBukkit ? ' confirm' : ''}^M"`);
          break;
        default:
          execSync(`reload${config.server.isBukkit ? ' confirm' : ''}`);
          break;
      }
    } catch (e) {
      console.warn(e);
      execSync(`reload${config.server.isBukkit ? ' confirm' : ''}`);
    }
    res.json({ OK: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ OK: false, e });
  }
});

app.all('*', (req, res) => res.status(404).send());

app.listen(config.PORT || 8080, () => console.log(`Website is enabled on port: ${config.PORT || 8080}`));