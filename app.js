var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var database = require('./config/database');
var sessions = require('client-sessions');

mongoose.connect(database.url);

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User = mongoose.model('User', new Schema({
    id: ObjectId,
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String
}));

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.on('open', function() {
    console.log('Estamos conectados!');
});

app.set('view engine', 'jade');
app.locals.pretty = true;

// middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(sessions({
    cookieName: 'session',
    secret: 'secret123123123',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

app.get('/', function(req, res) {
    res.render('index.jade');
});

app.get('/register', function(req, res) {
    res.render('register.jade');
});

app.post('/register', function(req, res) {
    var user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password
    });
    user.save(function(err) {
        if (err) {
            var err = 'Something bad happened! Try again!';
            if (err.code === 11000) {
                error = 'That email is already taken, try another.';
            }
            res.render('register.jade', { error: error });
        } else {
            res.redirect('/dashboard');
        }
    })
});

app.get('/login', function(req, res) {
    res.render('login.jade');
});

app.post('/login', function(req, res) {
    User.findOne({ email: req.body.email }, function(err, user){
        if (!user) {
            res.render('login.jade', { error: 'Invalid email or password' });
        } else {
            if (req.body.password === user.password) {
                req.session.user = user; // set-cookie: session={ email: '...', password: '....', '...' }
                res.redirect('/dashboard');
            } else {
                res.render('login.jade', { error: 'Invalid email or password' });
            }
        }
    });
    
});

app.get('/dashboard', function(req, res) {
    if (req.session && req.session.user) {
        User.findOne({ email: req.session.user.email }, function(err, user) {
            if (!user) {
                req.session.reset();
                res.redirect('/login');
            } else {
                res.locals.user = user;
                res.render('dashboard.jade');
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', function(req, res) {
    req.session.reset();
    res.redirect('/');
});

app.listen(3000);