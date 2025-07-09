const router = require('express').Router();
const axios  = require('axios');

const ATP = require('./ATP');
const WTA = require('./WTA');
6 |
/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to swagger-jsdoc
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Connected!' });
});

router.use("/atp", ATP);
router.use("/wta", WTA);
module.exports = router;
