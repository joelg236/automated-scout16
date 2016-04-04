var express = require('express');
var router = express.Router();
var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');
var team = require('../data/team')
var eventdata = require('../data/eventdata')
var stats = require('../data/stats')

router.get('/:team/:year', function(req, res, next) {
    team.get_team(req.params.team, req.params.year, function(err, team) {
        if (err) {
            return next(err);
        }

        res.render('team', {
            number: team.number,
            id: team.id,
            year: req.params.year,
            name: team.name,
            location: team.location,
            picture: team.picture,
            events: team.events.sort(function(a, b) {
                var s = Date.parse(a.start_date) - Date.parse(b.start_date);
                if (s == 0) {
                    s = a.key.localeCompare(b.key);
                }
                return s;
            }),
        });
    });
});

router.get('/:team/:year/:event', function(req, res, next) {
    team.get_team(req.params.team, req.params.year, function(err, team) {
        if (err) {
            return next(err);
        }

        eventdata.get_event_data(req.params.event, req.params.year, function(err, data, update) {
            if (err) {
                return next(err);
            }

            stats.get_team_stats(req.params.event, req.params.year, data, update, function(err, stats) {
                if (err) {
                    return next(err);
                }

                res.render('teamevent', {
                    number: team.number,
                    id: team.id,
                    year: req.params.year,
                    name: team.name,
                    location: team.location,
                    picture: team.picture,
                    event_id: req.params.event,
                    stats: stats
                });
            });
        });
    });
});

module.exports = router;
