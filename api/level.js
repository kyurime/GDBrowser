const request = require('request')
const fs = require('fs')
const Level = require('../classes/Level.js')

module.exports = async (app, req, res, api, analyze) => {

  if (req.offline) {
    if (!api) return res.redirect('search/' + req.params.id)
    else return res.send("-1")
  }

  let levelID = req.params.id
  if (levelID == "daily") return app.run.download(app, req, res, api, 'daily', analyze)
  else if (levelID == "weekly") return app.run.download(app, req, res, api, 'weekly', analyze)
  else if (levelID.match(/[^0-9]/)) {
    if (!api) return res.redirect('search/' + req.params.id)
    else return res.send("-1")
  }
  else levelID = levelID.replace(/[^0-9]/g, "")

  if (analyze || req.query.hasOwnProperty("download")) return app.run.download(app, req, res, api, levelID, analyze)

  req.gdRequest('getGJLevels21', { str: levelID, type: 0 }, function (err, resp, body) {

    if (err || !body || body == '-1' || body.startsWith("<") || body.startsWith("##")) {
      if (!api) return res.redirect('search/' + req.params.id)
      else return res.send("-1")
    }

    let preRes = body.split('#')[0].split('|', 10)
    let author = body.split('#')[1].split('|')[0].split(':')
    let song = '~' + body.split('#')[2];
    song = app.parseResponse(song, '~|~')

    let levelInfo = app.parseResponse(preRes[0])
    let level = new Level(levelInfo, req.server, false, author)

    if (level.customSong) {
      level.songName = song[2] || "Unknown"
      level.songAuthor = song[4] || "Unknown"
      level.songSize = (song[5] || "0") + "MB"
      level.songID = song[1] || String(level.customSong)
    }

    else {
      let foundSong = require('../misc/level.json').music[parseInt(levelInfo[12]) + 1] || { "null": true }
      level.songName = foundSong[0] || "Unknown"
      level.songAuthor = foundSong[1] || "Unknown"
      level.songSize = "0MB"
      level.songID = "Level " + [parseInt(levelInfo[12]) + 1]
    }

    if (level.author != "-" && app.config.cacheAccountIDs) app.accountCache[req.id][level.author.toLowerCase()] = [level.accountID, level.authorID, level.author]

    if (req.isGDPS) level.gdps = (req.onePointNine ? "1.9/" : "") + req.endpoint
    if (req.onePointNine) {
      level.orbs = 0
      level.diamonds = 0
    }

    function sendLevel() {

      if (api) return res.send(level)

      else return fs.readFile('./html/level.html', 'utf8', function (err, data) {
        let html = data;
        let filteredSong = level.songName.replace(/[^ -~]/g, "")  // strip off unsupported characters
        level.songName = filteredSong || level.songName
        let variables = Object.keys(level)
        variables.forEach(x => {
          let regex = new RegExp(`\\[\\[${x.toUpperCase()}\\]\\]`, "g")
          html = html.replace(regex, app.clean(level[x]))
        })
        if (req.server.downloadsDisabled) html = html.replace('id="additional" class="', 'class="downloadDisabled ')
          .replace('analyzeBtn"', 'analyzeBtn" style="filter: opacity(30%)"')
        return res.send(html)
      })
    }

    if (req.demonlistEndpoint && level.difficulty == "Extreme Demon") {
      request.get(req.demonlistEndpoint + '/api/v2/demons/?name=' + level.name.trim(), function (err, resp, demonList) {
          if (err) return sendLevel()
          let demon = JSON.parse(demonList)
          if (demon[0] && demon[0].position) level.demonList = demon[0].position
          return sendLevel()
      })
  }

    else return sendLevel()

  })
}