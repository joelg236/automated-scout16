function Prediction(matches, stats) {
    var prediction = [];
    var prediction_accuracy = { OPR: 0, CCWM: 0, DPR: 0, ODPR: 0 };
    matches.forEach(function(match) {
        var pred = {
            red: {
                points: {
                    OPR:
                        stats.OPR[match.red.teams[0]].val
                      + stats.OPR[match.red.teams[1]].val
                      + stats.OPR[match.red.teams[2]].val,
                    CCWM:
                        stats.CCWM[match.red.teams[0]].val
                      + stats.CCWM[match.red.teams[1]].val
                      + stats.CCWM[match.red.teams[2]].val,
                    DPR:
                        stats.DPR[match.red.teams[0]].val
                      + stats.DPR[match.red.teams[1]].val
                      + stats.DPR[match.red.teams[2]].val,
                    ODPR:
                        stats.OPR[match.red.teams[0]].val
                      + stats.OPR[match.red.teams[1]].val
                      + stats.OPR[match.red.teams[2]].val
                      + stats.DPR[match.red.teams[0]].val
                      + stats.DPR[match.red.teams[1]].val
                      + stats.DPR[match.red.teams[2]].val,
                },
                rank: {
                    rankOPR:
                        stats.rankpointOPR[match.red.teams[0]].val
                      + stats.rankpointOPR[match.red.teams[1]].val
                      + stats.rankpointOPR[match.red.teams[2]].val,
                }
            },
            blue: {
                points: {
                    OPR:
                        stats.OPR[match.blue.teams[0]].val
                      + stats.OPR[match.blue.teams[1]].val
                      + stats.OPR[match.blue.teams[2]].val,
                    CCWM:
                        stats.CCWM[match.blue.teams[0]].val
                      + stats.CCWM[match.blue.teams[1]].val
                      + stats.CCWM[match.blue.teams[2]].val,
                    DPR:
                        stats.DPR[match.blue.teams[0]].val
                      + stats.DPR[match.blue.teams[1]].val
                      + stats.DPR[match.blue.teams[2]].val,
                    ODPR:
                        stats.OPR[match.blue.teams[0]].val
                      + stats.OPR[match.blue.teams[1]].val
                      + stats.OPR[match.blue.teams[2]].val
                      + stats.DPR[match.blue.teams[0]].val
                      + stats.DPR[match.blue.teams[1]].val
                      + stats.DPR[match.blue.teams[2]].val,
                },
                rank: {
                    rankOPR:
                        stats.rankpointOPR[match.blue.teams[0]].val
                      + stats.rankpointOPR[match.blue.teams[1]].val
                      + stats.rankpointOPR[match.blue.teams[2]].val,
                }
            }
        }

        prediction.push(pred);

        if (match.played) {
            if (match.red.points > match.blue.points) {
                if (pred.red.points.OPR > pred.blue.points.OPR) {
                    prediction_accuracy.OPR++;
                }
                if (pred.red.points.CCWM > pred.blue.points.CCWM) {
                    prediction_accuracy.CCWM++;
                }
                if (pred.red.points.DPR > pred.blue.points.DPR) {
                    prediction_accuracy.DPR++;
                }
                if (pred.red.points.ODPR > pred.blue.points.ODPR) {
                    prediction_accuracy.ODPR++;
                }
            } else if (match.blue.points > match.red.points) {
                if (pred.blue.points.OPR > pred.red.points.OPR) {
                    prediction_accuracy.OPR++;
                }
                if (pred.blue.points.CCWM > pred.red.points.CCWM) {
                    prediction_accuracy.CCWM++;
                }
                if (pred.blue.points.DPR > pred.red.points.DPR) {
                    prediction_accuracy.DPR++;
                }
                if (pred.blue.points.ODPR > pred.red.points.ODPR) {
                    prediction_accuracy.ODPR++;
                }
            }
        }
    });

    var best_predictor, best_results = 0;
    for (type in prediction_accuracy) {
        prediction_accuracy[type] /= matches.length;
        if (prediction_accuracy[type] > best_results) {
            best_predictor = type;
            best_results = prediction_accuracy[type];
        }
    }
    this.best_predictor = best_predictor;
    this.best_results = best_results * 100;

    var teams = {};
    for (team in stats.teams) {
        var wins = 0, rank_points = 0;
        matches.filter(function(match) { return match.level === 'qm'; })
            .forEach(function(match, ind) {
            if (match.red.teams.indexOf(stats.teams[team]) === 0) {
                if (!match.played) {
                    if (prediction[ind].red.points[best_predictor]
                      > prediction[ind].blue.points[best_predictor]) {
                        wins++;
                    }

                    rank_points += prediction[ind].red.rank.rankOPR;
                }
            } else if (match.blue.teams.indexOf(stats.teams[team]) === 0) {
                if (!match.played) {
                    if (prediction[ind].blue.points[best_predictor]
                      > prediction[ind].red.points[best_predictor]) {
                        wins++;
                    }

                    rank_points += prediction[ind].blue.rank.rankOPR;
                }
            }
        });
        teams[stats.teams[team]] = { wins: wins, rank_points: rank_points };
    }
    this.teams = teams;
    this.prediction = prediction;
    this.prediction_accuracy = prediction_accuracy;
}

module.exports = { Prediction: Prediction }
