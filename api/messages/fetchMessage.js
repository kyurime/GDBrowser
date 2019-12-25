const request = require('request')
const XOR = require("../../classes/XOR");
const xor = new XOR();

module.exports = async (app, req, res, api) => {

  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  let params = {
    accountID: req.body.accountID,
    gjp: xor.encrypt(req.body.password, 37526),
    messageID: req.params.id,
    secret: app.secret,
  }

  request.post(app.endpoint + 'downloadGJMessage20.php', {
    form: params
  }, async function (err, resp, body) {

    if (err || body == '-1' || !body) return res.status(400).send("Error fetching message!")

    let x = app.parseResponse(body)
    let msg = {}
    msg.id = x[1];
    msg.playerID = x[2]
    msg.accountID = x[3]
    msg.author = x[6]
    msg.subject = Buffer.from(x[4], "base64").toString()
    msg.content = xor.decrypt(x[5], 14251)
    msg.date = x[7] + app.config.timestampSuffix

    return res.status(200).send(msg)
  })

}