var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');
var numeric = require('numeric');
var eventdata = require('./eventdata')

function OPR(teams, played, stat) {
    var OPRS = this;
    var solution = numeric.solve(played, stat);

    teams.map(function(team, ind) {
        return { team: team, val: solution[ind] };
    }).sort(function(a, b) {
        return b.val - a.val;
    }).forEach(function(d, ind) {
        OPRS[d.team] = { rank: ind + 1, val: d.val };
    });
}

function component_opr(teams, played, matches, callback) {
    return new OPR(teams, played, teams.map(function(team) {
        return matches.filter(function(match) {
            return match.played && match.teams.indexOf(team) !== -1;
        }).reduce(function(sum, match) {
            return sum + callback(match);
        }, 0);
    }));
}

function convert_stat(tba, teams) {
    var stat = {};

    teams.map(function(team) {
        if (typeof tba !== 'undefined') {
            return { team: team, val: tba[team.substring(3)] };
        } else {
            return { team: team, val: NaN };
        }
    }).sort(function(a, b) {
        return b.val - a.val;
    }).forEach(function(d, rank) {
        stat[d.team] = { rank: rank + 1, val: d.val };
    });

    return stat;
}

function TeamStats(event_data, stats) {
    this.teams = event_data.teams;
    this.OPR = convert_stat(stats.oprs, this.teams);
    this.DPR = convert_stat(stats.dprs, this.teams);
    this.CCWM = convert_stat(stats.ccwms, this.teams);

    var played = new Array(this.teams.length);
    for (var i = 0; i < this.teams.length; i++) {
        played[i] = new Array(this.teams.length);
        for (var x = 0; x < this.teams.length; x++) {
            played[i][x] = 0; // 2d matrix
        }
    }
    var teams = this.teams;
    event_data.qual_matches.forEach(function(match) {
        if (match.played) {
            match.teams.forEach(function(team1) {
                match.teams.forEach(function(team2) {
                    played[teams.indexOf(team1)][teams.indexOf(team2)]++;
                });
            });
        }
    });

    this.autoOPR = {
        highOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.auto.high;
            }),
        lowOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.auto.low;
            }),
        crossOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.auto.cross;
            }),
    };

    this.teleopOPR = {
        highOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.high;
            }),
        lowOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.low;
            }),
        damagingOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.crossing;
            }),
        challengeOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.challenge;
            }),
        scaleOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.scale;
            }),
        breachOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.breach_point;
            }),
        captureOPR:
            component_opr(this.teams, played, event_data.qual_matches, function(match) {
                return match.teleop.capture_point;
            }),
        crossingOPR: {
            typeAOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.category === 'A' ? cross.crosses : 0);
                    }, 0);
                }),
            typeBOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.category === 'B' ? cross.crosses : 0);
                    }, 0);
                }),
            typeCOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.category === 'C' ? cross.crosses : 0);
                    }, 0);
                }),
            typeDOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.category === 'D' ? cross.crosses : 0);
                    }, 0);
                }),
            lowbarOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'lowbar' ? cross.crosses : 0);
                    }, 0);
                }),
            portcullisOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'Portcullis' ? cross.crosses : 0);
                    }, 0);
                }),
            chevalOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'ChevalDeFrise' ? cross.crosses : 0);
                    }, 0);
                }),
            rampartsOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'Ramparts' ? cross.crosses : 0);
                    }, 0);
                }),
            moatOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'Moat' ? cross.crosses : 0);
                    }, 0);
                }),
            drawbridgeOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'Drawbridge' ? cross.crosses : 0);
                    }, 0);
                }),
            sallyportOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'SallyPort' ? cross.crosses : 0);
                    }, 0);
                }),
            rockwallOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'RockWall' ? cross.crosses : 0);
                    }, 0);
                }),
            roughterrainOPR:
                component_opr(this.teams, played, event_data.qual_matches, function(match) {
                    return match.teleop.crossed.reduce(function(sum, cross) {
                        return sum + (cross.type === 'RoughTerrain' ? cross.crosses : 0);
                    }, 0);
                }),
        },
    };
    this.foulOPR =
        component_opr(this.teams, played, event_data.qual_matches, function(match) {
            return match.fouls;
        });

    this.rankpointOPR =
        component_opr(this.teams, played, event_data.qual_matches, function(match) {
            return match.rank_points;
        });
}

var team_stats = {};
function get_team_stats(id, year, data, update, callback) {
    if (update) {
        tba.getStatsAtEvent(id, year, function(err, stats) {
            if (err) {
                return callback(err);
            }

            callback(null, team_stats = new TeamStats(data, stats));
        });
    } else {
        callback(null, team_stats);
    }
}

module.exports = { get_team_stats: get_team_stats };
