var express = require('express');
var router = express.Router();
var all = require('../data/all');

router.get('/:year', function(req, res, next) {
    all.get_all(req.params.year, function(err, data) {
        if (err) {
            next(err);
        }

        res.render('all', {
            data: data
        });
    });
});

module.exports = router;
