/*jshint esversion: 6 */
const path = require('path');
const express = require('express');
const app = express();

const bcrypt = require('bcrypt');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let multer  = require('multer');
let upload = multer({ dest: path.join(__dirname, 'uploads')});
const fs = require('fs'); // used to delete from 'uploads'

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

// database for the images and comments and users
let Datastore = require('nedb'), images = new Datastore({ filename: 'db/images.db', autoload: true, timestampData : true}), comments = new Datastore({ filename: 'db/comments.db', autoload: true }), users = new Datastore({ filename: 'db/users.db', autoload: true });

// The image object
let Image = (function(){
    return function img(image){
        this._id = image._id;
        this.title = image.body.title;
        this.author = image.user._id;
        this.picture = image.file;
        this.date = Date();
    };
}());

// The comment object
let Comment = (function(){
    return function cmt(comment){
        this.imageId = comment.body.imageId;
        this.author = comment.user._id;
        this.content = comment.body.content;
        this.date = "";
    };
}());

const cookie = require('cookie');

const session = require('express-session');
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

// All code for user below taken from lab 6 code
app.use(function (req, res, next){
    req.user = ('user' in req.session)? req.session.user : null;
    let username = (req.user)? req.user._id:'';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
        path : '/', 
        maxAge: 60 * 60 * 24 * 7
    }));
    next();
});

app.use(function (req, res, next){
    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});

let isAuthenticated = function(req, res, next) {
    if (!req.user) return res.status(401).end("request denied");
    next();
};

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signup/
app.post('/signup/', function (req, res, next) {
    // extract data from HTTP request
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    let username = req.body.username;
    let password = req.body.password;
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("username " + username + " already exists");
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return res.status(500).end(err);
            bcrypt.hash(password, salt, function(err, hash) {
                // insert new user into the database
                users.update({_id: username},{_id: username, hash: hash}, {upsert: true}, function(err){
                    if (err) return res.status(500).end(err);
                    req.session.user = user;
                    // initialize cookie
                    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                        path : '/', 
                        maxAge: 60 * 60 * 24 * 7
                    }));
                    return res.json("user " + username + " signed up");
                });
            });
        });
    });
});

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signin/
app.post('/signin/', function (req, res, next) {
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    let username = req.body.username;
    let password = req.body.password;
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("access denied"); //wrong username
        bcrypt.compare(password, user.hash, function(err, valid) {
            if (err) return res.status(500).end(err);
            if (!valid) return res.status(401).end("access denied"); //wrong password
            req.session.user = user;
            // initialize cookie
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                path : '/', 
                maxAge: 60 * 60 * 24 * 7
            }));
            return res.json("user " + username + " has been signed in");
        });
    });
});

// curl -b cookie.txt -c cookie.txt localhost:3000/signout/
app.get('/signout/', function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    res.redirect('/');
});

// Adding an image
app.post('/api/images/', isAuthenticated, upload.single('picture'), function (req, res, next) {
    images.insert(new Image(req), function (err, picture) {
        if (err) return res.status(500).end(err);
        return res.json(picture);
    });
});

// Adding a comment to an image
app.post('/api/comments/', function (req, res, next) {
    // Date code shown below found at https://stackoverflow.com/questions/1531093/how-do-i-get-the-current-date-in-javascript
    let date = new Date();
    let dd = String(date.getDate()).padStart(2, '0');
    let mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = date.getFullYear();
    curr_date = (yyyy + '/' + mm + '/' + dd);
    let new_comment = new Comment(req);
    new_comment.date = curr_date;
    comments.insert(new_comment, function (err, comment) {
        if (err) return res.status(500).end(err);
        return res.json(comment);
    });
});

// Get all images
app.get('/api/images/', function (req, res, next) {
    images.find({author:req.query.owner}).exec(function(err, data) { 
        if (err) return res.status(500).end(err);
        return res.json(data);
    });
});

app.get('/api/users/', function (req, res, next) {
    users.find({}).exec(function(err, data) { 
        if (err) return res.status(500).end(err);
        return res.json(data);
    });
});

// Get all comments (reverse order)
app.get('/api/comments/', function (req, res, next) {
    comments.find({}).sort({createdAt:-1}).limit(10).exec(function(err, data) { 
        if (err) return res.status(500).end(err);
        return res.json(data.reverse());
    });
});

// Gets a specific image given the image id 
app.get('/api/images/:id', function (req, res, next){
    images.findOne({_id: req.params.id}, function(err, image){
        if (err) return res.status(500).end(err);
        if (!image) return res.status(404).end("image number " + req.params.id + " does not exist");
        let img = image.picture;
        res.setHeader("Content-Type", img.mimetype);
        return res.sendFile(img.path);
    });
});

// Deletes a speicif image given its image id
app.delete('/api/images/:id/', function (req, res, next) {
    images.findOne({_id: req.params.id}, function(err, image){
        if(image.author !== req.user._id){
            return res.status(401).end("Cannot delete someone elses image");
        }
        // this piece removes it from the uploads folder
        // found this at https://nodejs.org/api/fs.html#fs_file_system
        fs.unlink('./uploads/' + image.picture.filename, (err) => {
            if (err) throw err;
        });
        if (err) return res.status(500).end(err);
        // This is required to delete all the comments associated with that image 
        comments.remove({imageId: image._id}, { multi: true }, function(err, num) {  
            images.remove({ _id: image._id }, { multi: false }, function(err, num) {
                return res.json(image);
             });
         });
    });
});

// This is used to delete a specific comment given its comment id
app.delete('/api/comments/:id/', function (req, res, next) {
    comments.findOne({_id: req.params.id}, function(err, comment){
        images.findOne({_id: comment.imageId}, function(err, image){
            if(comment.author !== req.user._id && image.author !== req.user._id){
                return res.status(401).end("Cannot delete someone elses comment");
            }
            if (err) return res.status(500).end(err);
            comments.remove({ _id: comment._id }, { multi: false }, function(err, num) {  
                return res.json(comment);
        });
         });
    });
});

app.use(express.static('static'));

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});