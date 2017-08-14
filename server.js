var port = process.env.PORT || 3000;
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var login = require("./login.js");

var session = require('express-session');
var exphbs = require('express-handlebars');
var methodOverride = require("method-override");
var bodyParser = require('body-parser');
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var express = require('express');
var app = express();

var redis = require('redis');
client = redis.createClient();

client.on("error", (error) => {
    console.log("Error " + error);
});

// Allows us to parse JSON from POST
//app.use(bodyParser.JSON());

// Initialize app session
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
    secret: 'godspeed',
    saveUninitialized: true,
    resave: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
// app.use(logger('combined'));

// Session-persisted message middleware
app.use(function(req, res, next) {
    var err = req.session.error,
        msg = req.session.notice,
        success = req.session.success;

    delete req.session.error;
    delete req.session.success;
    delete req.session.notice;

    if (err) res.locals.error = err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;

    next();
});

// Set template render engine to be 'handlebars'
var hbs = exphbs.create({
    defaultLayout: 'main', //we will be creating this layout shortly
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============PASSPORT=================
// Use the LocalStrategy within Passport to login/"signin" users.
passport.use('local-signin', new LocalStrategy({
        passReqToCallback: true,
        usernameField: 'username',
        passwordField: 'password'
    },
    function(req, username, password, done) {
        console.log("HERE IN LOCAL SIGNUP");
        login.localAuth(username, password)
            .then(function(user) {
                if (user) {
                    console.log("LOGGED IN AS: " + user.username);
                    req.session.success = 'You are successfully logged in ' + user.username + '!';
                    done(null, user);
                }
                if (!user) {
                    console.log("COULD NOT LOG IN");
                    req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
                    done(null, user);
                }
            })
            .fail(function(err) {
                console.log(err.body);
            });
    }
));

// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy({
        passReqToCallback: true
    },
    function(req, username, password, done) {
        login.localReg(username, password)
            .then(function(user) {
                if (user) {
                    console.log("REGISTERED: " + user.username);
                    req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
                    done(null, user);
                }
                if (!user) {
                    console.log("COULD NOT REGISTER");
                    req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
                    done(null, user);
                }
            })
            .fail(function(err) {
                console.log(err.body);
            });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.error = 'Please sign in!';
    res.redirect('/signin');
}

// ======== ROUTES ===========

app.get('/signin', function(req, res) {
    res.render('signin', {layout: "blank"});
});

app.get('*', function(req, res, next) {
    if(req.user == null) {
        res.redirect('/signin');
    } else {
        next();
    }
});

app.get('/', function(req, res, next) {
    if(req.user == null) {
        res.redirect('/signin');
    } else {
        res.render('home', {
            user: req.user,
            home: true
        });
    }
});

app.get('/profile', function(req, res) {
    res.render('profile', {
        user: req.user,
        login: true
    })
});

app.post('/local-reg', passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/signin'
}));


app.post('/login', passport.authenticate('local-signin', {
    successRedirect: '/',
    failureRedirect: '/signin'
}));

app.get('/logout', function(req, res) {
    var name = req.user.username;
    console.log("LOGGIN OUT " + req.user.username)
    req.logout();
    res.redirect('/');
    req.session.notice = "You have successfully been logged out " + name;
});

app.listen(port, (res) => {
    console.log("Server listening on port " + port);
});
