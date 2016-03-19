var express = require('express');
var router = express.Router();
var numeric = require('numeric');
var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

function Team(id) {
    this.number = Number(id.substr(3));
    this.id = id;
    this.matches = [];
    this.opr = 0;
    this.rank_points = 0;
    this.breaches = 0;
    this.captures = 0;
    this.scales = 0;
    this.predicted_rank_points = 0;
}

router.get('/*', function(req, res, next) {
    tba.getMatchesAtEvent(req.url.substring(5), req.url.substring(1, 5), function(err, matches) {
        if (err) {
            console.error(err);
        } else {
            var teams = {};
            matches.forEach(function(match) {
                if (match.score_breakdown != null) { // match has happened
                    for (alliance_name in match.alliances) { // red & blue
                        var alliance = match.alliances[alliance_name];
                        var opponent = match.alliances[alliance_name == "red" ? "blue" : "red"];

                        alliance.teams.forEach(function(team_id) {
                            if (!(team_id in teams)) {
                                teams[team_id] = new Team(team_id);
                            }

                            alliance.breakdown = match.score_breakdown[alliance_name];

                            if (alliance.score > opponent.score) {
                                teams[team_id].rank_points += 2;
                            }
                            if (alliance.breakdown.teleopTowerCaptured) {
                                teams[team_id].rank_points += 1;
                                teams[team_id].captures += 1;
                            }
                            if (alliance.breakdown.teleopDefensesBreached) {
                                teams[team_id].rank_points += 1;
                                teams[team_id].breaches += 1;
                            }
                            if (alliance.breakdown.teleopScalePoints == 15) {
                                teams[team_id].scales += 1;
                            }

                            teams[team_id].matches.push(alliance);
                        });
                    }
                }
            });

            var team_numbers = [],
                points = [],
                num_teams = Object.keys(teams).length,
                played = new Array(num_teams);

            for (var i = 0; i < num_teams; i++) {
                played[i] = new Array(num_teams);
                for (var x = 0; x < num_teams; x++) {
                    played[i][x] = 0; // 2d matrix
                }
            }

            for (team_id in teams) {
                team_numbers.push(teams[team_id].number);

                points.push(teams[team_id].matches.reduce(function (sum, match) {
                    return sum + match.score; // sum of points
                }, 0));
            }

            matches.forEach(function(match) {
                var redteams = match.alliances.red.teams.map(function (team_id) {
                    return team_numbers.indexOf(Number(team_id.substr(3)));
                });
                var blueteams = match.alliances.blue.teams.map(function (team_id) {
                    return team_numbers.indexOf(Number(team_id.substr(3)));
                });
                if (match.score_breakdown != null) {
                    redteams.forEach(function(team1) {
                        redteams.forEach(function(team2) {
                            played[team1][team2]++; // opr matrix
                        });
                    });
                    blueteams.forEach(function(team1) {
                        blueteams.forEach(function(team2) {
                            played[team1][team2]++; // opr matrix
                        });
                    });
                }
            });

            // solve OPR
            var opr = numeric.solve(played, points);
            opr.forEach(function(e, i) {
                teams['frc' + team_numbers[i]].opr = e;
            });

            matches = matches.sort(function(a, b) {
                return a.match_number - b.match_number;
            }).map(function(a) {
                if (a.comp_level === 'qm') {
                    a.comp_level = 'Qualification';
                } else {
                    a.comp_level = 'Elimination';
                }

                if (a.score_breakdown == null) {
                    var blue_score = 0, red_score = 0;
                    blue_score = teams[a.alliances.blue.teams[0]].opr
                               + teams[a.alliances.blue.teams[1]].opr
                               + teams[a.alliances.blue.teams[2]].opr;
                    red_score = teams[a.alliances.red.teams[0]].opr
                              + teams[a.alliances.red.teams[1]].opr
                              + teams[a.alliances.red.teams[2]].opr;

                    a.predicted_score = { blue: blue_score, red: red_score };
                }

                return a;
            });

            for (match in matches) {
                var match = matches[match];
                if (match.score_breakdown == null) {
                        if (match.predicted_score.blue > match.predicted_score.red) {
                            teams[match.alliances.blue.teams[0]].predicted_rank_points += 2;
                            teams[match.alliances.blue.teams[1]].predicted_rank_points += 2;
                            teams[match.alliances.blue.teams[2]].predicted_rank_points += 2;
                        } else if (match.predicted_score.red > match.predicted_score.blue) {
                            teams[match.alliances.red.teams[0]].predicted_rank_points += 2;
                            teams[match.alliances.red.teams[1]].predicted_rank_points += 2;
                            teams[match.alliances.red.teams[2]].predicted_rank_points += 2;
                        }
                }
            }

            var team_array = [];
            for (team_id in teams) {
                team_array.push(teams[team_id]);
            }
            var team_array = team_array.sort(function (a, b) {
                var comp = (b.predicted_rank_points + b.rank_points) - (a.predicted_rank_points + a.rank_points);
                return comp == 0 ? b.opr - a.opr : comp;
            });
            res.render('event', {
                title: 'Automated Scout',
                event: req.url.substring(1),
                teams: team_array,
                matches: matches
            });
        }
    });
});

module.exports = router;
