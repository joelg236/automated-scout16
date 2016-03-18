var express = require('express');
var router = express.Router();
var numeric = require('numeric');
var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

router.get('/*', function(req, res, next) {
  tba.getMatchesAtEvent(req.url.substring(5), req.url.substring(1, 5), function(err, data) {
    if (err) {
      console.error(err);
    } else {
      var teams = {};
      for (match in data) {
        var match = data[match];
        for (alliance in match.alliances) {
          var alliance_name = alliance;
          var opponent = match.alliances[alliance == "red" ? "blue" : "red"];
          var alliance = match.alliances[alliance];
          if (alliance.score != -1) {
            for (team in alliance.teams) {
              var team = alliance.teams[team];
              if (team in teams) {
                  teams[team].matches.push(alliance);
              } else {
                  teams[team] = { team: Number(team.substr(3)), matches: [alliance], opr: 0, ropr: 0, won: 0, pwon: 0 };
              }

              if (alliance.score > opponent.score) {
                  teams[team].won += 2;
              }

              alliance.breakdown = match.score_breakdown[alliance_name];
              if (alliance.breakdown.teleopTowerCaptured) {
                  teams[team].won += 1;
              }
              if (alliance.breakdown.teleopDefensesBreached) {
                  teams[team].won += 1;
              }

              teams[team].ropr = teams[team].won / Object.keys(teams[team].matches).length;
            }
          }
        }
      }

      var team_numbers = [], points = [], played = new Array(teams.length);
      var num_teams = Object.keys(teams).length;
      for (var i = 0; i < num_teams; i++) {
        played[i] = new Array(num_teams);
        for (var x = 0; x < num_teams; x++) {
          played[i][x] = 0;
        }
      }

      for (team in teams) {
        team_numbers.push(teams[team].team);

        points.push(teams[team].matches.reduce(function (p, c) {
          return p + c.score;
        }, 0));
      }

      for (match in data) {
        var redteams = data[match].alliances.red.teams.map(function (t) {
          return team_numbers.indexOf(Number(t.substr(3)));
        });
        var blueteams = data[match].alliances.blue.teams.map(function (t) {
          return team_numbers.indexOf(Number(t.substr(3)));
        });
        if (data[match].score_breakdown != null) {
          for (team1 in redteams) {
            for (team2 in redteams) {
              played[redteams[team1]][redteams[team2]]++;
            }
          }
          for (team1 in blueteams) {
            for (team2 in blueteams) {
              played[blueteams[team1]][blueteams[team2]]++;
            }
          }
        }
      }

      var opr = numeric.solve(played, points);
      opr.forEach(function(e, i) {
        teams['frc' + team_numbers[i]].opr = e;
      });

      data = data.sort(function(a, b) {
        return a.match_number - b.match_number;
      }).map(function(a) {
        if (a.comp_level === 'qm') {
          a.comp_level = 'Qualification';
        } else {
          a.comp_level = 'Elimination';
        }

        if (a.score_breakdown == null) {
          var blue_score = 0, red_score = 0;
          blue_score += teams[a.alliances.blue.teams[0]].opr;
          blue_score += teams[a.alliances.blue.teams[1]].opr;
          blue_score += teams[a.alliances.blue.teams[2]].opr;
          red_score += teams[a.alliances.red.teams[0]].opr;
          red_score += teams[a.alliances.red.teams[1]].opr;
          red_score += teams[a.alliances.red.teams[2]].opr;

          a.predicted_score = { blue: blue_score.toFixed(2), red: red_score.toFixed(2) };
        }

        return a;
      });

      for (match in data) {
        var match = data[match];
        if (match.score_breakdown == null) {
            if (match.predicted_score.blue > match.predicted_score.red) {
                teams[match.alliances.blue.teams[0]].pwon += 2;
                teams[match.alliances.blue.teams[1]].pwon += 2;
                teams[match.alliances.blue.teams[2]].pwon += 2;
            } else if (match.predicted_score.red > match.predicted_score.blue) {
                teams[match.alliances.red.teams[0]].pwon += 2;
                teams[match.alliances.red.teams[1]].pwon += 2;
                teams[match.alliances.red.teams[2]].pwon += 2;
            }
        }
      }

      var team_array = [];
      for (team in teams) {
        team_array.push(teams[team]);
      }
      var team_array = team_array.sort(function (a, b) {
        return b.opr - a.opr;
      });
      res.render('event', {
          title: 'Automated Scout',
          event: req.url.substring(1),
          teams: team_array,
          matches: data
      });
    }
  });
});

module.exports = router;
