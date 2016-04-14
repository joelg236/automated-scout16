var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');
var eventdata = require('../data/eventdata');
var stats = require('../data/stats');
var all_stats = {};
var comparison = {};

function add_stats(id, year, stats) {
    if (!all_stats.hasOwnProperty(year)) {
        all_stats[year] = {};
    }
    all_stats[year][id] = stats;
}

function get_comparison(stats, year, update) {
    if (!update) {
        if (comparison.hasOwnProperty(year)) {
            return comparison[year];
        }
    }
    var comp = { teams: [], OPRs: {}, CCWMs: {} };
    for (key in stats) {
        comp.teams = comp.teams.concat(stats[key].teams);
        comp.teams = comp.teams.filter(function(e, i, arr) {
            // unique teams
            return arr.lastIndexOf(e) === i;
        });
        stats[key].teams.forEach(function(team) {
            if (!comp.OPRs.hasOwnProperty(team)) {
                comp.OPRs[team] = [];
                comp.CCWMs[team] = [];
            }
            comp.OPRs[team].push(stats[key].OPR[team].val);
            comp.CCWMs[team].push(stats[key].CCWM[team].val);
        });
    }

    comparison[year] = comp;

    return comp;
}

function get_all(year, callback) {
    tba.getListOfEvents(year, function(err, data) {
        if (err) {
            callback(err);
        }

        var all_updates = false;
        data.filter(function(event) {
            var to = new Date(Date.parse(event.end_date));
            to.setDate(to.getDate() + 1);
            return Date.now() > to && event.official;
        }).forEach(function(event, ind, array) {
            var event_key = event.key.substring(4);

            eventdata.get_event_data(event_key, year, function(err, data, update) {
                if (err) {
                    callback(err);
                }
                if (update) {
                    all_updates = true;
                }

                stats.get_team_stats(event_key, year, data, update, function(err, stats) {
                    if (err) {
                        callback(err);
                    }

                    if (update) {
                        add_stats(event_key, year, stats);
                    }

                    if (ind === array.length - 1) {
                        callback(null, get_comparison(all_stats[year], year, all_updates));
                    }
                });
            });
        });
    });
}

module.exports = { get_all: get_all }
