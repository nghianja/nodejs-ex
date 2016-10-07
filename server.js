//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan'),
    Parse   = require('parse/node');
    
Parse.initialize("SimpliFly");
Parse.serverURL = 'http://parse-server-example-simplifly-parse.44fs.preview.openshiftapps.com/parse';

Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/simplifly/:status?', function (req, res) {
    var Request = Parse.Object.extend("Request"), query;
    if (req.params.status == 'closed') {
        query = new Parse.Query(Request);
        query.equalTo("status", "closed");
        query.find({
            success: function (results) {
                res.render('simplifly.html', { section : 3, results : results });
            }
        });
    } else if (req.params.status == 'pending') {
        query = new Parse.Query(Request);
        query.equalTo("status", "pending");
        query.find({
            success: function (results) {
                res.render('simplifly.html', { section : 2, results : results });
            }
        });
    } else if (req.params.status == 'open') {
        query = new Parse.Query(Request);
        query.equalTo("status", "open");
        query.find({
            success: function (results) {
                res.render('simplifly.html', { section : 1, results : results });
            }
        });
    } else {
        var open = -1, pending = -1, total = -1;
        query = new Parse.Query(Request);
        query.equalTo("status", "open");
        query.count({
            success: function (count) {
                console.log("open : " + count);
                open = count;
                if (open > -1 && pending > -1 && total > -1) {
                    res.render('simplifly.html', { section : 0, open : open, pending : pending, total : total });
                }
            }
        });
        query = new Parse.Query(Request);
        query.equalTo("status", "pending");
        query.count({
            success: function (count) {
                console.log("pending : " + count);
                pending = count;
                if (open > -1 && pending > -1 && total > -1) {
                    res.render('simplifly.html', { section : 0, open : open, pending : pending, total : total });
                }
            }
        });
        query = new Parse.Query(Request);
        query.count({
            success: function (count) {
                console.log("total : " + count);
                total = count;
                if (open > -1 && pending > -1 && total > -1) {
                    res.render('simplifly.html', { section : 0, open : open, pending : pending, total : total });
                }
            }
        });
    }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
