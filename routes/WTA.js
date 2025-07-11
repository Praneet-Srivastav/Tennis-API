const router = require('express').Router();
const axios  = require('axios');
const cheerio = require('cheerio');

// URLS
const WTA_RANKINGS_URL = 'https://www.wtatennis.com/rankings';

/* WTA RANKINGS */
/**
 * @openapi
 * /wta/rankings/singles:
 *   get:
 *     description: Returns WTA singles rankings
 *     responses:
 *       200:
 *         description: Success
 */
const WTA_PLAYER_INDEX_URL = 'https://www.wtatennis.com/players';
const WTA_COACHES_URL = 'https://www.wtatennis.com/coaches';

// WTA singles rankings API response
router.get('/rankings/singles', (req, res) => {
  let rankings = [];
  let countries = [];
  let players = [];
  let ages = [];
  let points = [];
  let tournaments = [];
  let JSONResponse = [];

  axios.get(WTA_RANKINGS_URL).then((response) => {
    const $ = cheerio.load(response.data);

    $('table tbody tr').each((i, tr) => {
      const rank = $(tr).find('td:nth-child(1)').text().trim();
      const age = $(tr).find('td:nth-child(3)').text().trim();
      let playerInfo = $(tr).find('td:nth-child(2)').text().trim();

      // Extract player name, country, points and tournaments played
      let parts = playerInfo.split('  ');
      let player = parts[0].trim();
      let country = parts[1] ? parts[1].trim() : "";

      // Extract points and tournaments played using regex
      const regex = /([0-9,]+)\s*([0-9]+)/;
      const match = playerInfo.match(regex);
      const pointsValue = match ? match[1] : "";
      const tournamentsValue = match ? match[2] : "";

      rankings.push(rank.replace(/(\n|\r)/g, "").trim());
      countries.push(country);
      players.push(player);
      ages.push(age);
      points.push(pointsValue);
      tournaments.push(tournamentsValue);

      JSONResponse.push({
        "ranking": rank.replace(/(\n|\r)/g, "").trim(),
        "country": country,
        "player": player,
        "age": age,
        "points": pointsValue,
        "tournaments_played": tournamentsValue
    });
    });

    res.json(JSONResponse);
  });
});

/**
 * @openapi
 * /wta/players/index:
 *   get:
 *     description: Returns WTA player index
 *     responses:
 *       200:
 *         description: Success
 */
// WTA doubles rankings API response
router.get('/wta/doubles', (req, res) => {
  res.json({status: 'wta doubles!'})
});

/* WTA STATISTICS */

/**
 * @openapi
 * /wta/players/coaches:
 *   get:
 *     description: Returns WTA coaches
 *     responses:
 *       200:
 *         description: Success
 */
/* WTA PLAYER INFORMATION */
// WTA player index API response
router.get('/players/index', (req, res) => {

  let rankings = [];
  let countries = [];
  let players = [];
  let JSONResponse = [];

  axios.get(WTA_PLAYER_INDEX_URL).then((response) => {
    const $ = cheerio.load(response.data);

    $('tbody tr .views-field-field-singles-ranking').each((i, td) => {
      rankings.push($(td).text().trim());
    });

    $('tbody tr span').each((i, span) => {
      countries.push($(span).data('tooltip'));
    });

    $('tbody tr .views-field-field-lastname').each((i, td) => {
      const lastFirst = $(td).text().trim().replace(/\s/g, '');
      const parts = lastFirst.split(',');
      players.push(parts[1] + ' ' + parts[0]);
    });

    for (let i = 0; i < rankings.length; i++){
      JSONResponse.push({
        "ranking": rankings[i],
        "country": countries[i],
        "player": players[i]
      })
    }

    res.json(JSONResponse);
  });
});

// WTA coaches API response
router.get('/players/coaches', function (req, res) {

  let coaches = [];
  let countries = [];
  let players = [];
  let prev_players = [];
  let JSONResponse = [];

  axios.get(WTA_COACHES_URL).then((response) => {
    const $ = cheerio.load(response.data);

    $('tbody tr .profile__prev-name').each((i, div) => {
      const lastFirst = $(div).text().trim().replace(/\s/g, '');
      const parts = lastFirst.split(',');
      coaches.push(parts[1] + ' ' + parts[0]);
    });

    for (let i = 0; i < coaches.length; i++){
      JSONResponse.push({
        "coach": coaches[i]
      })
    }
    res.json(JSONResponse);
  })
})

// WTA Player Detection Service imports
const wtaPlayerService = require('../services/wta-player-service');
const cacheService = require('../services/cache-service');

/* WTA PLAYER DETECTION ENDPOINTS */

/**
 * @openapi
 * /wta/check-player:
 *   post:
 *     description: Check if a player is WTA-eligible
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerName:
 *                 type: string
 *                 description: Full name of the tennis player
 *                 example: "Serena Williams"
 *     responses:
 *       200:
 *         description: Player check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isWTA:
 *                       type: boolean
 *                     confidence:
 *                       type: number
 *                     reason:
 *                       type: string
 *       400:
 *         description: Invalid request
 */
router.post('/check-player', async (req, res) => {
    try {
        const { playerName } = req.body;
        
        if (!playerName) {
            return res.status(400).json({
                success: false,
                error: 'playerName is required'
            });
        }

        const result = await wtaPlayerService.checkPlayer(playerName);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error checking player:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/check-match:
 *   post:
 *     description: Check if a tennis match involves WTA players
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               homePlayer:
 *                 type: string
 *                 description: Home player name
 *                 example: "Serena Williams"
 *               awayPlayer:
 *                 type: string
 *                 description: Away player name
 *                 example: "Venus Williams"
 *     responses:
 *       200:
 *         description: Match check result
 *       400:
 *         description: Invalid request
 */
router.post('/check-match', async (req, res) => {
    try {
        const { homePlayer, awayPlayer } = req.body;
        
        if (!homePlayer || !awayPlayer) {
            return res.status(400).json({
                success: false,
                error: 'Both homePlayer and awayPlayer are required'
            });
        }

        const result = await wtaPlayerService.checkMatch(homePlayer, awayPlayer);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error checking match:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/bulk-check-players:
 *   post:
 *     description: Bulk check multiple players for WTA eligibility
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               players:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of player names
 *                 example: ["Serena Williams", "Rafael Nadal", "Venus Williams"]
 *     responses:
 *       200:
 *         description: Bulk check results
 *       400:
 *         description: Invalid request
 */
router.post('/bulk-check-players', async (req, res) => {
    try {
        const { players } = req.body;
        
        if (!players || !Array.isArray(players)) {
            return res.status(400).json({
                success: false,
                error: 'players array is required'
            });
        }

        if (players.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 50 players per request'
            });
        }

        const results = await wtaPlayerService.checkPlayersBulk(players);
        
        res.json({
            success: true,
            data: {
                totalPlayers: players.length,
                results: results
            }
        });
    } catch (error) {
        console.error('Error bulk checking players:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/bulk-check-matches:
 *   post:
 *     description: Bulk check multiple tennis matches for WTA eligibility
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matches:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     homePlayer:
 *                       type: string
 *                     awayPlayer:
 *                       type: string
 *                 description: Array of match objects
 *     responses:
 *       200:
 *         description: Bulk match check results
 *       400:
 *         description: Invalid request
 */
router.post('/bulk-check-matches', async (req, res) => {
    try {
        const { matches } = req.body;
        
        if (!matches || !Array.isArray(matches)) {
            return res.status(400).json({
                success: false,
                error: 'matches array is required'
            });
        }

        if (matches.length > 25) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 25 matches per request'
            });
        }

        // Validate match format
        for (const match of matches) {
            if (!match.homePlayer || !match.awayPlayer) {
                return res.status(400).json({
                    success: false,
                    error: 'Each match must have homePlayer and awayPlayer'
                });
            }
        }

        const results = await wtaPlayerService.checkMatchesBulk(matches);
        
        res.json({
            success: true,
            data: {
                totalMatches: matches.length,
                results: results
            }
        });
    } catch (error) {
        console.error('Error bulk checking matches:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/stats:
 *   get:
 *     description: Get WTA detection service statistics
 *     responses:
 *       200:
 *         description: Service statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await wtaPlayerService.getStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/cache/clear:
 *   post:
 *     description: Clear the WTA player cache
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/cache/clear', async (req, res) => {
    try {
        await cacheService.clear();
        
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/override-player:
 *   post:
 *     description: Manually override a player's WTA status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerName:
 *                 type: string
 *               isWTA:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Override set successfully
 */
router.post('/override-player', async (req, res) => {
    try {
        const { playerName, isWTA, reason } = req.body;
        
        if (!playerName || typeof isWTA !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'playerName and isWTA (boolean) are required'
            });
        }

        const result = await wtaPlayerService.setPlayerStatus(
            playerName, 
            isWTA, 
            reason || 'Manual override'
        );
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error setting player override:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/test-gender-detection:
 *   get:
 *     description: Test the new offline gender detection system
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: First name to test
 *         example: "Maria"
 *     responses:
 *       200:
 *         description: Gender detection test results
 */
router.get('/test-gender-detection', async (req, res) => {
    try {
        const { name = 'Maria' } = req.query;
        
        const genderDetectionService = require('../services/gender-detection-service');
        const result = await genderDetectionService.testAllMethods(name);
        const stats = genderDetectionService.getUsageStats();
        
        res.json({
            success: true,
            data: {
                testResults: result,
                serviceStats: stats
            }
        });
    } catch (error) {
        console.error('Error testing gender detection:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/check-wta-status:
 *   post:
 *     description: Simple WTA status check - returns "WTA" or empty string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               homePlayer:
 *                 type: string
 *                 description: Home player(s) name
 *                 example: "Serena Williams"
 *               awayPlayer:
 *                 type: string
 *                 description: Away player(s) name  
 *                 example: "Maria Sharapova"
 *     responses:
 *       200:
 *         description: WTA status result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wtaStatus:
 *                   type: string
 *                   description: Either "WTA" or empty string
 *                   example: "WTA"
 */
router.post('/check-wta-status', async (req, res) => {
    try {
        const { homePlayer, awayPlayer } = req.body;
        
        if (!homePlayer || !awayPlayer) {
            return res.status(400).json({
                error: 'Both homePlayer and awayPlayer are required'
            });
        }

        const simpleWTAClassifier = require('../services/simple-wta-classifier');
        const wtaStatus = await simpleWTAClassifier.getWTAStatus(homePlayer, awayPlayer);
        
        res.json({
            wtaStatus: wtaStatus
        });
    } catch (error) {
        console.error('Error checking WTA status:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * @openapi
 * /wta/process-excel-simple:
 *   post:
 *     description: Process Excel data and return with WTA status populated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     homeopponent:
 *                       type: string
 *                     awayopponent:
 *                       type: string
 *     responses:
 *       200:
 *         description: Processed data with WTA status
 */
router.post('/process-excel-simple', async (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                error: 'data array is required'
            });
        }

        if (data.length > 200) {
            return res.status(400).json({
                error: 'Maximum 200 records per request'
            });
        }

        const simpleWTAClassifier = require('../services/simple-wta-classifier');
        const processedData = await simpleWTAClassifier.processExcelData(data);
        
        const wtaCount = processedData.filter(row => row['WTA?'] === 'WTA').length;
        
        res.json({
            success: true,
            data: processedData,
            summary: {
                totalProcessed: data.length,
                wtaMatches: wtaCount,
                nonWtaMatches: data.length - wtaCount
            }
        });
    } catch (error) {
        console.error('Error processing Excel data:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Export API routes
module.exports = router;
