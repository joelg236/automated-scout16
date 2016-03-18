var express = require('express');
var router = express.Router();
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

              teams[team].opr = teams[team].matches.reduce(function (p, c) {
                return p + c.score;
              }, 0) / Object.keys(teams[team].matches).length;

              teams[team].ropr = teams[team].won / Object.keys(teams[team].matches).length;
            }
          }
        }
      }

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
