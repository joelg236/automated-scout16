var express = require('express');
var router = express.Router();
var numeric = require('numeric');
var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');
var event = require('../data/event')
var eventdata = require('../data/eventdata')
var stats = require('../data/stats')
var predict = require('../data/eventdataprediction')

router.get('/:event/:year', function(req, res, next) {
    if (req.params.year !== '2016') return next();
    event.get_event(req.params.event, req.params.year, function(err, event) {
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

                res.render('event', {
                    name: event.name,
                    id: event.id,
                    year: event.year,
                    start_date: event.start_date,
                    end_date: event.end_date,
                    location: event.location,
                    teams: event.teams,
                    event: data,
                    stats: stats,
                    pred: new predict.Prediction(data.lineups, stats)
                });
            });
        });
    });
});

router.get('/:event/:year/compare', function(req, res, next) {
    if (req.params.year !== '2016') return next();
    eventdata.get_event_data(req.params.event, req.params.year, function(err, data, update) {
        if (err) {
            return next(err);
        }

        stats.get_team_stats(req.params.event, req.params.year, data, update, function(err, stats) {
            if (err) {
                return next(err);
            }

            res.render('eventcompare', {
                event: data,
                year: req.params.year,
                id: req.params.event,
                stats: stats,
                teams: data.teams,
                pred: new predict.Prediction(data.lineups, stats)
            });
        });
    });
});

module.exports = router;
