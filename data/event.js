var tba = require('thebluealliance')('node-thebluealliance','TBA v2 API','1.1.1');

function Event(data) {
    this.name = data.name;
    this.id = data.key.substring(4);
    this.year = data.year;
    this.start_date = new Date(Date.parse(data.start_date));
    this.end_date = new Date(Date.parse(data.end_date));
    this.end_date.setDate(this.end_date.getDate() + 1);
    this.location = data.location;
    this.teams = data.teams;
}

var events = {};
function get_event(id, year, callback) {
    if (events.hasOwnProperty(year + id)) {
        callback(null, events[year + id]);
    } else {
        tba.getEventById(id, year, function(err, event) {
            if (err) {
                return callback(err);
            }

            tba.getTeamsAtEvent(id, year, function(err, data) {
                if (err) {
                    return callback(err);
                }

                event.teams = data.map(function(team) { return team.key.substring(3); });
                events[year + id] = new Event(event);
                callback(null, events[year + id]);
            });
        });
    }
}

module.exports = { Event: Event, get_event: get_event }
