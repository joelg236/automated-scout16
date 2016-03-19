var express = require('express');
var router = express.Router();
var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

router.get('/*', function(req, res, next) {
    tba.getEventsForTeam(req.url.substring(4), function(err, events) {
        if (err) {
            console.error(err);
        } else {
            var events = events.sort(function(a, b) {
                return Date.parse(a.start_date) - Date.parse(b.start_date);
            });
            tba.getTeamById(req.url.substring(4), function(err, team) {
                if (err) {
                    console.error(err);
                } else {
                    res.render('team', { title: 'Automated Scout', team: team, events: events });
                }
            });
        }
    });
});

module.exports = router;
