var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

function Match(teams, match, data, opponent) {
    this.played = typeof data !== 'undefined';
    this.teams = teams;
    this.level = match.comp_level;
    this.match_number = match.match_number;

    if (this.played) {
        this.points = data.totalPoints;
        this.opponent_points = opponent.totalPoints;
        this.won = this.points > this.opponent_points;
        this.auto = {
            high: data.autoBouldersHigh,
            low: data.autoBouldersLow,
            cross: data.autoCrossingPoints
        };
        this.teleop = {
            high: data.teleopBouldersHigh,
            low: data.teleopBouldersLow,
            crossing: data.teleopCrossingPoints,
            challenge: data.teleopChallengePoints,
            scale: data.teleopScalePoints,
            breach_point: data.teleopDefensesBreached,
            capture_point: data.teleopTowerCaptured,
            crossed: [
                { 'category': 'L',
                   'type': 'lowbar',
                  'crosses': data.position1crossings },
                { 'category': data.position2.substring(0, 1),
                  'type': data.position2.substring(2),
                  'crosses': data.position2crossings },
                { 'category': data.position3.substring(0, 1),
                   'type': data.position3.substring(2),
                   'crosses': data.position3crossings },
                { 'category': data.position4.substring(0, 1),
                   'type': data.position4.substring(2),
                   'crosses': data.position4crossings },
                { 'category': data.position5.substring(0, 1),
                   'type': data.position5.substring(2),
                   'crosses': data.position5crossings },
            ],
        };
        this.fouls = data.foulPoints,
        this.rank_points = (this.won ? 2 : 0)
                         + (this.teleop.breach_point ? 1 : 0)
                         + (this.teleop.capture_point ? 1 : 0);
    }
}

function EventData(data) {
    var matches = [];
    var lineups = [];
    data.forEach(function(match) {
        if (match.score_breakdown === null) {
            match.score_breakdown = {};
        }

        var lineup = {
            level: match.comp_level,
            match_number: match.match_number,
            played: Object.keys(match.score_breakdown).length !== 0,
            red: new Match(match.alliances.red.teams, match,
                         match.score_breakdown.red, match.score_breakdown.blue),
            blue: new Match(match.alliances.blue.teams, match,
                         match.score_breakdown.blue, match.score_breakdown.red),
        };
        lineups.push(lineup);
        matches.push(lineup.red);
        matches.push(lineup.blue);
    });
    this.matches = matches;
    this.lineups = lineups.sort(function(a, b) {
        if (a.level === b.level) {
            return a.match_number - b.match_number;
        } else {
            return a.level === 'qm' ? -1 : 1;
        }
    });
    var qual_matches = matches.filter(function(match) {
        return match.level === 'qm';
    });
    this.qual_matches = qual_matches;

    var teams = [];
    this.matches.forEach(function(match) {
        match.teams.forEach(function(team) {
            if (teams.indexOf(team) === -1) {
                teams.push(team);
            }
        });
    });
    this.teams = teams;

    var rank_points = {};
    this.teams.forEach(function(team) {
        rank_points[team] = qual_matches.filter(function(match) {
            return match.teams.indexOf(team) !== -1;
        }).reduce(function(sum, match) {
            return sum + match.rank_points;
        }, 0);
    });
    this.rank_points = rank_points;

    var rank_points_list = [];
    for (var key in rank_points) {
        rank_points_list.push(rank_points[key]);
    }
    rank_points_list.sort(function(a, b) { return b - a; });

    var rank = {};
    this.teams.forEach(function(team) {
        rank[team] = rank_points_list.indexOf(rank_points[team]) + 1;
    });
    this.rank = rank;
}

var event_data = {};
function get_event_data(id, year, callback) {
    var full_event_id = year + id;

    tba.getMatchesAtEvent(id, year, function(err, data) {
        if (err) {
            return callback(err);
        }

        var update_data = false;
        if (!event_data.hasOwnProperty(full_event_id)) {
            update_data = true;
        } else {
            event_data[full_event_id].every(function(stored) {
                if (stored.score_breakdown === null) {
                    var retrieved = data.filter(function(retrieved) {
                        return retrieved.comp_level == stored.comp_level &&
                               retrieved.match_number == stored.match_number;
                    })[0];

                    // the match found was played, but stored was not
                    if (retrieved.score_breakdown !== null) {
                        update_data = true;
                        return false; // exit loop
                    }
                }

                return true;
            });
        }

        event_data[full_event_id] = data;
        callback(null, new EventData(event_data[full_event_id]), update_data);
    });
}

module.exports = { EventData: EventData, get_event_data: get_event_data }
