const request = require('request')
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const icons = require('../icons/gameSheet.json');
const colors = require('../misc/colors.json');
const forms = require('../icons/forms.json')

function recolor(img, col) {
  return img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    if (img.bitmap.data.slice(idx, idx+3).every(function(val) {return val >= 20 && val <= 255})) { // If it's not "black, i.e. we want to recolor it"
      this.bitmap.data[idx] = colors[col].r / (255 / this.bitmap.data[idx]);
      this.bitmap.data[idx + 1] = colors[col].g / (255 / this.bitmap.data[idx + 1]);
      this.bitmap.data[idx + 2] = colors[col].b / (255 / this.bitmap.data[idx + 2]);
    }
  })
}

/* Caveat of genFileName is that if there are any falsey values in the arguments they are ignored. 
This is usually a good thing though - avoid issues by not putting something like 0 instead of '0' */
function genFileName(...args) { return args.filter(function(val) {return val}).join('_') +'_001.png' }
function fromIcons(filename) { return `./icons/${filename}` }
let cache = {};

module.exports = async (app, req, res) => {

  function buildIcon(account) {

      if (!account) account = []

      reqForms = {0: 'cube', 1: 'ship', 2:'ball', 3:'ufo', 4:'wave'}

      // this messy chain here gets the correct icon no matter what
      let { form, ind } = forms[reqForms[account[14]]] || {};
      form = form || 'player';
      ind = 9;

      let iconID = req.query.icon || account[ind] || 1;
      let col1 = req.query.col1 || account[10] || 0;
      let col2 = req.query.col2 || account[11] || 3;
      let outline = req.query.glow || account[15] || "0";

      // meant for debugging robot/spider offsets, but i'll leave it in anyways
      let glowOffset = (req.query.off || "").split(",").map(x => Number(x))
      if (!glowOffset.some(x => x != 0)) glowOffset = []

      let topless = form == "bird" && req.query.topless
      let autoSize = req.query.size == "auto"
      let sizeParam = autoSize || (req.query.size && !isNaN(req.query.size))
      if (outline == "0") outline = false;

      if (iconID && iconID.toString().length == 1) iconID = "0" + iconID;

      if (col1 == 15) outline = true;
      function genImageName(...args) {
        return genFileName(form, iconID, ...args);
      }
      let icon, glow, extra;
      function setBaseIcons() {
        icon = genImageName(isSpecial && '01');
        glow = genImageName(isSpecial && '01', '2');
        extra = genImageName(isSpecial && '01', 'extra');
      }
      const isSpecial = ['robot', 'spider'].includes(form);
      setBaseIcons();

      if (!fs.existsSync(fromIcons(icon)) || (isSpecial && !fs.existsSync(fromIcons(genImageName('02'))))) {
        iconID = '01';
        setBaseIcons();
        // Condition on next line should never be satisfied but you never know!
        if (!fs.existsSync(fromIcons(icon))) return res.sendFile(path.join(__dirname, '../assets/unknownIcon.png'))
      }

      let ex = fromIcons(extra)
      let hasExtra = fs.existsSync(ex)

      if (!colors[col1]) col1 = 0
      if (!colors[col2]) col2 = 3

      let col3 = req.query.col3
      if (col3 && (!hasExtra || !colors[col3] || col3 == "12")) col3 = null

      let iconCode = `${req.query.form == "cursed" ? "cursed" : form}${topless ? "top" : ""}-${iconID}-${col1}-${col2}-${col3 || "x"}-${outline ? 1 : 0}` 

      if (!sizeParam && !glowOffset.length && cache[iconCode]) {
        clearTimeout(cache[iconCode].timeoutID);
        cache[iconCode].timeoutID = setTimeout(function() {delete cache[iconCode]}, 1800000);
        return res.end(cache[iconCode].value);
      }

      let useExtra = false

      let originalOffset = icons[icon].spriteOffset;
      let minusOrigOffset = function(x, y) { return x - originalOffset[y] }
      let offset = icons[glow].spriteOffset.map(minusOrigOffset);
      let ufoTop, ufoOffset, ufoCoords, ufoSprite
      let extrabit, offset2, size2;

      Jimp.read(fromIcons(glow)).then(async function (image) {

        let size = [image.bitmap.width, image.bitmap.height]
        let glow = recolor(image, col2)
        let imgOff = isSpecial ? 100 : 0

        let eb = fromIcons(extra)
        if (fs.existsSync(eb)) {
          extrabit = icons[extra]
          offset2 = extrabit.spriteOffset.map(minusOrigOffset);
          size2 = extrabit.spriteSize;
          extra = new Jimp(eb);
          if (col3) await Jimp.read(eb).then(e => { extra = recolor(e, col3) })
          useExtra = true
        }

        Jimp.read(fromIcons(icon)).then(async function (ic) {

          let iconSize = [ic.bitmap.width, ic.bitmap.height]
          recolor(ic, col1)
          ic.composite(glow, (iconSize[0] / 2) - (size[0] / 2) + offset[0], (iconSize[1] / 2) - (size[1] / 2) - offset[1], { mode: Jimp.BLEND_DESTINATION_OVER })

          if (form == "bird" && !topless) {
            ufoTop = genImageName('3')
            ufoOffset = icons[ufoTop].spriteOffset.map(minusOrigOffset).concat(icons[ufoTop].spriteSize);
            ufoCoords = [imgOff + (iconSize[0] / 2) - (ufoOffset[2] / 2) + ufoOffset[0], (iconSize[1] / 2) - (ufoOffset[3] / 2) - ufoOffset[1] + 300 - iconSize[1]]
            ufoSprite = fromIcons(ufoTop)
            ic.contain(iconSize[0], 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_BOTTOM)
            // Only add dome if there's no glow, otherwise the dome will be outlined as well
            if (!outline) ic.composite(await Jimp.read(ufoSprite), ufoCoords[0], ufoCoords[1], {mode: Jimp.BLEND_DESTINATION_OVER})
          }

          if (useExtra) ic.composite(extra, imgOff + (iconSize[0] / 2) - (size2[0] / 2) + offset2[0], (iconSize[1] / 2) - (size2[1] / 2) - offset2[1] + (form == "bird" && !req.query.topless ? 300 - iconSize[1] : 0))

          let finalSize = [ic.bitmap.width, ic.bitmap.height]

          function finish(img) {
            img.autocrop(0.01, false)
            if (form == "swing") img.resize(120, 111)
            if (img.bitmap.height == 300) ic.autocrop(1, false)
            if (sizeParam) {
              let thicc = img.bitmap.width > img.bitmap.height
              let imgSize = req.query.size == "auto" ? (thicc ? img.bitmap.width : img.bitmap.height) : Math.round(req.query.size)
              if (imgSize < 32) imgSize = 32
              if (imgSize > 512) imgSize = 512
              if (thicc) img.contain(img.bitmap.width, img.bitmap.width, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
              else img.contain(img.bitmap.height, img.bitmap.height, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
              img.resize(imgSize, Jimp.AUTO)
            }
            img.getBuffer(Jimp.AUTO, (err, buffer) => {
              if (!sizeParam && !glowOffset.length) {
                cache[iconCode] = {
                  value: buffer,
                  timeoutID: setTimeout(function() {delete cache[iconCode]}, 1800000)
                }
              }
              return res.end(buffer, 'base64')
            })
          }

          if (!outline) return finish(ic)

          else {

            ic.getBuffer(Jimp.AUTO, function (err, buff) {

              const Canvas = require('canvas')
                , Image = Canvas.Image
                , canvas = Canvas.createCanvas(finalSize[0] + 10, finalSize[1] + 10)
                , ctx = canvas.getContext('2d');

              if (col2 == 15) col2 = col1;
              if (col1 == 15 && col2 == 15) col2 = 12;

              const img = new Image()
              img.onload = () => {
                var dArr = [-1, -1, 0, -1, 1, -1, -1, 0, 1, 0, -1, 1, 0, 1, 1, 1], // offset array
                  s = 2, i = 0, x = canvas.width / 2 - finalSize[0] / 2, y = canvas.height / 2 - finalSize[1] / 2;

                for (; i < dArr.length; i += 2) ctx.drawImage(img, x + dArr[i] * s, y + dArr[i + 1] * s);

                ctx.globalCompositeOperation = "source-in";
                ctx.fillStyle = `rgba(${colors[col2].r}, ${colors[col2].g}, ${colors[col2].b}, 1})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.imageSmoothingEnabled = false;

                // Add UFO top last so it doesn't get glow'd
                if (form == "bird" && !topless) {
                  const dome = new Image()
                  dome.src = ufoSprite
                  ctx.drawImage(dome, ufoCoords[0]+5, ufoCoords[1]+5)
                }

                ctx.drawImage(img, x, y)

              }

              img.onerror = err => { throw err }
              img.src = buff

              Jimp.read(canvas.toBuffer()).then(b => {
                return finish(b)
              })
            })
          }
        })
      })
    }

    let username = req.params.text
    let result = []

    if (app.offline || req.query.hasOwnProperty("noUser") || req.query.hasOwnProperty("nouser") || username == "icon") return buildIcon()
    res.contentType('image/png');
  
    request.post(app.endpoint + '/incl/profiles/getGJUsers.php', {
      form: {
        str: username,
        gameVersion: 21,
      }
    }, function (err1, res1, body1) {
      if (err1 || !body1 || body1 == "-1") return buildIcon()
      else result = app.parseResponse(body1);
  
      // since 1.9 is wack icons don't work correctly - so we improvise (just make a cube tbh)
      // this gets the user entry on the global leaderboard, actually returning an object we can use
      request.post(app.endpoint + 'getGJScores19.php', {
        form: {
          accountID: result[16],
          gameVersion: 21,
          type: 'relative',
        }
      }, function (err2, res2, body2) {
        // next we have to actually get the user lol
        if (err2 || !body2 || body2 == "-1") return buildIcon()
        const players = body2.split('|');
        currentAccount = players.filter( player => player.includes(`:16:${result[16]}:`));

        if (!err2 && body2 && body2 != '-1') return buildIcon(app.parseResponse(currentAccount[0]));
        else return buildIcon()
    })
  });

}
