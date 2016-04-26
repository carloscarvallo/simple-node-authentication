var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var bcrypt = require('bcryptjs');
var morgan = require('morgan');
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
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(sessions({
    cookieName: 'session',
    secret: 'secret123123123',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
        User.findOne({ email: req.session.user.email }, function(err, user) {
            if (user) {
                //console.log('me encontraron en la base de datos ', user);
                req.user = user;
                delete req.user.password;
                req.session.user = req.user;
                res.locals.user = req.user;
            }
            next();
        });
    } else {
        next();
    }
});

function requireLogin(req, res, next) {

    if (!req.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

app.get('/', function(req, res) {
    res.render('index.jade');
});

app.get('/register', function(req, res) {
    res.render('register.jade');
});

app.post('/register', function(req, res) {
    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    var user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hash
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
            if (bcrypt.compareSync(req.body.password, user.password)) {
                
                //console.log('EXISTE!');
                
                req.session.user = user; // set-cookie: session={ email: '...', password: '....', '...' }
                
                //console.log('LOGIN SESSION ', req.session.user);
                
                res.redirect('/dashboard');
            } else {
                res.render('login.jade', { error: 'Invalid email or password' });
            }
        }
    });
    
});

app.get('/dashboard', requireLogin, function(req, res) {
    res.render('dashboard.jade');
});

app.get('/logout', function(req, res) {
    req.session.reset();
    res.redirect('/');
});

app.listen(3000);