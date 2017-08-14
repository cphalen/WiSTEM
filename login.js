var bcrypt = require('bcryptjs');
var Q = require('q');
var bluebird = require("bluebird");
var redis = require("redis");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

exports.localReg = function(username, password) {
    var deferred = Q.defer();
    var client = redis.createClient();

    client.getAsync("users:" + username)
        .then((result) => {
            console.log(result);
            if (null != result) {
                console.log("USERNAME ALREADY EXISTS:", JSON.parse(result).username);
                deferred.resolve(false);
            } else {
                var hash = bcrypt.hashSync(password, 8);
                var user = {
                    "username": username,
                    "password": hash,
                }

                console.log("CREATING USER:", username);

                client.setAsync("users:" + username, JSON.stringify(user))
                    .then(function() {
                        deferred.resolve(user);
                        client.quit();
                    }).catch(function(error) {
                        console.log(error)
                    });
            }
        });

    return deferred.promise;
};


exports.localAuth = function(username, password) {
    var deferred = Q.defer();
    var client = redis.createClient();

    client.getAsync("users:" + username)
        .then((result) => {
            if (null == result) {
                console.log("USERNAME NOT FOUND:", username);
                deferred.resolve(false);
            } else {
                result = JSON.parse(result);
                var hash = result.password;
                console.log("FOUND USER: " + result.username);
                if (bcrypt.compareSync(password, hash)) {
                    deferred.resolve(result);
                    client.quit()
                } else {
                    console.log("AUTHENTICATION FAILED");
                    deferred.resolve(false);
                    client.quit()
                }
            }
        });

    return deferred.promise;
}
