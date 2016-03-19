var express = require('express');
var router = express.Router();
var numeric = require('numeric');
var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

function Team(id) {
    this.number = Number(id.substr(3));
    this.id = id;
    this.matches = [];
    this.rank_points = 0;
    this.breaches = 0;
    this.breaches_opr = 0;
    this.captures = 0;
    this.captures_opr = 0;
    this.defense = 0;
    this.defense_opr = 0;
    this.scales = 0;
    this.scales_opr = 0;
    this.challenge = 0;
    this.challenge_opr = 0;
    this.opr = 0;
    this.predicted_rank_points = 0;
}

router.get('/*', function(req, res, next) {
    tba.getMatchesAtEvent(req.url.substring(5), req.url.substring(1, 5), function(err, matches) {
        if (err) {
            console.error(err);
        } else {
            var teams = {};
            matches.filter(function(match) {
                return match.comp_level === 'qm';
            }).forEach(function(match) {
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
                            if (alliance.breakdown.teleopScalePoints >= 15) {
                                teams[team_id].scales += 1;
                            }

                            teams[team_id].defense += alliance.breakdown.teleopCrossingPoints;
                            teams[team_id].challenge += alliance.breakdown.teleopChallengePoints;

                            teams[team_id].matches.push(alliance);
                        });
                    }
                }
            });

            var team_numbers = [],
                breaches = [],
                captures = [],
                defense = [],
                scales = [],
                challenge = [],
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

                breaches.push(teams[team_id].breaches);
                captures.push(teams[team_id].captures);
                defense.push(teams[team_id].defense);
                scales.push(teams[team_id].scales);
                challenge.push(teams[team_id].challenge);

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
            var breaches = numeric.solve(played, breaches);
            breaches.forEach(function(e, i) {
                teams['frc' + team_numbers[i]].breaches_opr = e;
            });
            var captures = numeric.solve(played, captures);
            captures.forEach(function(e, i) {
                teams['frc' + team_numbers[i]].captures_opr = e;
            });
            var defense = numeric.solve(played, defense);
            defense.forEach(function(e, i) {
                teams['frc' + team_numbers[i]].defense_opr = e;
            });
            var scales = numeric.solve(played, scales);
            scales.forEach(function(e, i) {
                teams['frc' + team_numbers[i]].scales_opr = e;
            });
            var challenge = numeric.solve(played, challenge);
            challenge.forEach(function(e, i) {
                teams['frc' + team_numbers[i]].challenge_opr = e;
            });

            var predictions_correct = 0, predictions_incorrect = 0;
            matches = matches.sort(function(a, b) {
                if (a.comp_level === b.comp_level) {
                    return a.match_number - b.match_number;
                } else {
                    return a.comp_level === 'qm' ? -1 : 1;
                }
            }).map(function(match) {
                if (match.comp_level === 'qm') {
                    match.comp_level = 'Qualification';
                } else {
                    match.comp_level = 'Elimination';
                }

                var blue_score = teams[match.alliances.blue.teams[0]].opr
                               + teams[match.alliances.blue.teams[1]].opr
                               + teams[match.alliances.blue.teams[2]].opr;
                var red_score = teams[match.alliances.red.teams[0]].opr
                              + teams[match.alliances.red.teams[1]].opr
                              + teams[match.alliances.red.teams[2]].opr;
                var blue_breach = teams[match.alliances.blue.teams[0]].breaches_opr
                                 + teams[match.alliances.blue.teams[1]].breaches_opr
                                 + teams[match.alliances.blue.teams[2]].breaches_opr;
                var red_breach = teams[match.alliances.red.teams[0]].breaches_opr
                                + teams[match.alliances.red.teams[1]].breaches_opr
                                + teams[match.alliances.red.teams[2]].breaches_opr;
                var blue_capture = teams[match.alliances.blue.teams[0]].captures_opr
                                 + teams[match.alliances.blue.teams[1]].captures_opr
                                 + teams[match.alliances.blue.teams[2]].captures_opr;
                var red_capture = teams[match.alliances.red.teams[0]].captures_opr
                                + teams[match.alliances.red.teams[1]].captures_opr
                                + teams[match.alliances.red.teams[2]].captures_opr;

                if (match.score_breakdown != null) {
                    // prediction of old match
                    if (match.alliances.red.score > match.alliances.blue.score) {
                        if (red_score > blue_score) {
                            predictions_correct++;
                        } else {
                            predictions_incorrect++;
                        }
                    } else {
                        if (blue_score > red_score) {
                            predictions_correct++;
                        } else {
                            predictions_incorrect++;
                        }
                    }
                }

                match.predicted_score = { blue: blue_score, red: red_score };
                match.predicted_breach = { blue: blue_breach, red: red_breach };
                match.predicted_capture = { blue: blue_capture, red: red_capture };

                return match;
            });

            matches.forEach(function(match) {
                if (match.score_breakdown == null && match.comp_level === 'Qualification') {
                    if (match.predicted_score.blue > match.predicted_score.red) {
                        teams[match.alliances.blue.teams[0]].predicted_rank_points += 2;
                        teams[match.alliances.blue.teams[1]].predicted_rank_points += 2;
                        teams[match.alliances.blue.teams[2]].predicted_rank_points += 2;
                    } else if (match.predicted_score.red > match.predicted_score.blue) {
                        teams[match.alliances.red.teams[0]].predicted_rank_points += 2;
                        teams[match.alliances.red.teams[1]].predicted_rank_points += 2;
                        teams[match.alliances.red.teams[2]].predicted_rank_points += 2;
                    }
                    teams[match.alliances.red.teams[0]].predicted_rank_points += match.predicted_breach.red;
                    teams[match.alliances.red.teams[1]].predicted_rank_points += match.predicted_breach.red;
                    teams[match.alliances.red.teams[2]].predicted_rank_points += match.predicted_breach.red;
                    teams[match.alliances.blue.teams[0]].predicted_rank_points += match.predicted_breach.blue;
                    teams[match.alliances.blue.teams[1]].predicted_rank_points += match.predicted_breach.blue;
                    teams[match.alliances.blue.teams[2]].predicted_rank_points += match.predicted_breach.blue;
                    teams[match.alliances.red.teams[0]].predicted_rank_points += match.predicted_capture.red;
                    teams[match.alliances.red.teams[1]].predicted_rank_points += match.predicted_capture.red;
                    teams[match.alliances.red.teams[2]].predicted_rank_points += match.predicted_capture.red;
                    teams[match.alliances.blue.teams[0]].predicted_rank_points += match.predicted_capture.blue;
                    teams[match.alliances.blue.teams[1]].predicted_rank_points += match.predicted_capture.blue;
                    teams[match.alliances.blue.teams[2]].predicted_rank_points += match.predicted_capture.blue;
                }
            });

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
                matches: matches,
                prediction_rate: 100 * (predictions_correct / (predictions_correct + predictions_incorrect))
            });
        }
    });
});

module.exports = router;
