var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

function Team(data) {
    this.number = data.info.team_number;
    this.id = data.info.key;
    this.name = data.info.nickname;
    this.location = data.info.location;
    this.picture = data.info.image;
    this.events = data.events.map(function(data) {
        return {
            'name': data.name,
            'id': data.key.substring(4),
            'start_date': data.start_date,
            'end_date': data.end_date,
        };
    });
}

function get_team(id, year, callback) {
    var team_data = {};

    tba.getEventsForTeam(id, year, function(err, events) {
        if (err) {
            return callback(err);
        }

        team_data.events = events;
        tba.getTeamById(id, function(err, info) {
            if (err) {
                return callback(err);
            }

            team_data.info = info;
            tba.getMediaForTeam(id, year, function(err, media) {
                if (err) {
                    return callback(err);
                }

                media.forEach(function(data) {
                    if (data.type === 'imgur') {
                        team_data.info.image = 'https://imgur.com/'
                                                + data['foreign_key'] + '.png';
                    } else if (data.type === 'cdphotothread') {
                        team_data.info.image = 'http://www.chiefdelphi.com/media/img/'
                                                  + data.details.image_partial;
                    }
                });

                callback(null, new Team(team_data));
            });
        });
    });
}

module.exports = { Team: Team, get_team: get_team }
