/**
 * Copyright 2018, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// [START app]

const express = require('express');
const request = require('request');

const {google} = require('googleapis');
const people = google.people('v1');

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const projectId = 'siebertc-cs493-final';
const datastore = new Datastore({projectId:projectId});

const BOAT = "Boat";
const LOAD = "Load";
const USER = "User";

const app = express();
const router = express.Router();
app.use(bodyParser.json());
app.enable('trust proxy');

app.use(express.static(__dirname + '/views'));

const handlebars = require('express-handlebars').create({defaultLayout:'index'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

var clientID = '173614997942-8cjqdtunvsar51mi8e6oe2an7m1b4g09.apps.googleusercontent.com';
var clientSec = '5K97TOFM2X4Mn6Y2_T4Tehfu';

// [START enable_parser]
app.use(bodyParser.urlencoded({extended: true}));
// [END enable_parser]

function fromDatastore(item){
  item.id = item[Datastore.KEY].id;
  return item;
}

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://www.googleapis.com/oauth2/v3/certs`
    }),

    // Validate the audience and the issuer.
    issuer: `https://accounts.google.com`,
    algorithms: ['RS256']
});

function helpJSON(boats, baseURL) {
    var editJSON = boats;

    //console.log(boats.items[0].id);
    var i = 0;
    for (i = 0; i < boats.items.length; i++) {
        editJSON.items[i].self = baseURL + editJSON.items[i].id;
    }
    return editJSON;
}

function helpJSON2(data, baseURL) {
    var editJSON = data;

    console.log("my data", data.id);
    var i = 0;
    for (i = 0; i < data.length; i++) {
        editJSON[i].self = baseURL + editJSON[i].id;
    }
    return editJSON;
}

/* ------------- Begin Model Functions ------------- */
//Add New Boat
function post_boats(name, type, length, owner){
    var key = datastore.key(BOAT);
    const new_boats = {"name": name, "type": type, "length": length, loads: null, "owner": owner};
    return datastore.save({"key":key, "data":new_boats}).then(() => {return key});
}

function post_users(name, email, sub){
    var key = datastore.key(USER);
    const new_users = {"name": name, "email": email, "sub":sub};
    return datastore.save({"key":key, "data":new_users}).then(() => {return key});
}

function post_loads(weight, content, delivery_date){
    var carrier = null;
    var key = datastore.key(LOAD);
    const new_slips = {"weight": weight, "content": content, "delivery_date": delivery_date, "carrier": carrier};
    return datastore.save({"key":key, "data":new_slips}).then(() => {return key});
}

function get_users(){
    const q = datastore.createQuery(USER);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

function get_boats(){
    const q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

function get_loads(){
    const q = datastore.createQuery(LOAD);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

function get_users_pagination(req){
    var q = datastore.createQuery(USER).limit(5);
    const results = {};
    if (Object.keys(req.query).includes("cursor")) {
        console.log(req.query);
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) => {
        //console.log(entities);
        results.items = entities[0].map(fromDatastore);
        if(typeof prev !== 'undefined') {
            results.previous = prev;
        }
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ) {
            results.next = req.protocol + "://" + req.get("host") + "/users" + "?cursor=" + encodeURIComponent(entities[1].endCursor);
        }
        return results;
    });
}

function get_boats_pagination(req){
    var q = datastore.createQuery(BOAT).limit(5);
    const results = {};
    if (Object.keys(req.query).includes("cursor")) {
        console.log(req.query);
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) => {
        //console.log(entities);
        results.items = entities[0].map(fromDatastore);
        if(typeof prev !== 'undefined') {
            results.previous = prev;
        }
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ) {
            results.next = req.protocol + "://" + req.get("host") + "/boats" + "?cursor=" + encodeURIComponent(entities[1].endCursor);
        }
        return results;
    });
}

function get_loads_pagination(req){
    var q = datastore.createQuery(LOAD).limit(5);
    const results = {};
    if (Object.keys(req.query).includes("cursor")) {
        console.log(req.query);
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) => {
        //console.log(entities);
        results.items = entities[0].map(fromDatastore);
        if(typeof prev !== 'undefined') {
            results.previous = prev;
        }
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ) {
            results.next = req.protocol + "://" + req.get("host") + "/loads" + "?cursor=" + encodeURIComponent(entities[1].endCursor);
        }
        return results;
    });
}

function get_specific_users(id){
    const key = datastore.key([USER, parseInt(id)]);
    return datastore.get(key).then( (entity) => {
        if (entity[0] === undefined) {
            return 0;
        }
        return entity.map(fromDatastore)[0];
    });
}

function get_specific_boats(id){
    const key = datastore.key([BOAT, parseInt(id)]);
    return datastore.get(key).then( (entity) => {
        if (entity[0] === undefined) {
            return 0;
        }
        return entity.map(fromDatastore)[0];
    });
}

function get_specific_loads(id){
    const key = datastore.key([LOAD, parseInt(id)]);
    return datastore.get(key).then( (entity) => {
        if (entity[0] === undefined) {
            return 0;
        }
        return entity.map(fromDatastore)[0];
    });
}

function patch_boat(id, name, type, length) {
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.update({"key":key, "data":boat}).then((boat) => { return key});
}

function patch_load(id, weight, content, delivery_date) {
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const load = {"weight": weight, "content": content, "delivery_date": delivery_date};
    return datastore.update({"key":key, "data":load}).then((load) => { return key});
}

function put_boat(id, name, type, length, load, owner) {
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length, "loads": load, "owner": owner};
    return datastore.save({"key":key, "data":boat}).then((boat) => { return key});
}

function put_load(load_id, weight, content, delivery_date, carrier){
    const key = datastore.key([LOAD, parseInt(load_id,10)]);
    const load = {"weight": weight, "content": content, "delivery_date": delivery_date, "carrier": carrier};
    return datastore.save({"key":key, "data":load});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

function delete_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

app.get('/users', function(req, res){
    const users = get_users_pagination(req)
    .then( (users) => {
        const users_total = get_users()
        .then ( (users_total) => {
            console.log(users_total.length);
            var baseURL = `${req.protocol}://${req.get("host")}${req.path}/`
            //console.log(baseURL);
            var newJSON = helpJSON(users, baseURL);
            newJSON.total = users_total.length;
            res.status(200).json(newJSON);
        });
    });
});

app.post('/users', checkJwt, (req, res) => {
    var matchFound = false;
    var user_id = null;
    const users = get_users()
    .then ( ( users ) => {
        var i;
        for (i = 0; i < users.length; i++) {
            if (users[i].sub == req.user.sub) {
                console.log("I found a repeat!");
                matchFound = true;
                user_id = users[i].id;
            }
        }
        if  (matchFound == false) {
            post_users(req.user.name, req.user.email, req.user.sub)
            .then( key => {res.status(201).json({
                id: key.id,
                name: req.user.name,
                email: req.user.email,
                sub: req.user.sub,
                self: `${req.protocol}://${req.get("host")}${req.path}/${key.id}`
                })
            });
        } else {
            console.log("I'm not making a new account");
            res.status(201).json({
                id: user_id,
                name: req.user.name,
                email: req.user.email,
                sub: req.user.sub,
                self: `${req.protocol}://${req.get("host")}${req.path}/${user_id}`
                })
        }
    });
});

app.get('/users/:user_id', function(req, res){
    const user_id = req.params.user_id; // gets the id of the boat
    console.log(user_id);
    const user = get_specific_users(user_id)
    .then( (user) => {
        if (user) {
            user.self = `${req.protocol}://${req.get("host")}${req.path}`;
            res.status(200).json(user);
        }else{
            res.status(404).json({
                Error: 'No user with this user_id exists'
            });
        }
    })
});

app.get('/boats', function(req, res){
    const boats = get_boats_pagination(req)
    .then( (boats) => {
        const boats_total = get_boats()
        .then ( (boats_total) => {

            var baseURL = `${req.protocol}://${req.get("host")}${req.path}/`
            //console.log(baseURL);

            var i;
            for (i = 0; i < boats.items.length; i++) {
                var j = 0;
                if (boats.items[i].loads !== null) {
                    for ( j = 0; j < boats.items[i].loads.length; j++) {
                        //console.log(i, j, boats.items[i], boats.items[i].loads[j]);
                    
                        boats.items[i].loads[j].self = `${req.protocol}://${req.get("host")}/loads/${boats.items[i].loads[j].id}`;
                    }
                }
            }           

            var newJSON = helpJSON(boats, baseURL);
            newJSON.total = boats_total.length;
            res.status(200).json(newJSON);
        });
    });
});

app.post('/boats', checkJwt, function(req, res){
    if(req.get('content-type') !== 'application/json') {
        res.status(406).json({
            Error: 'The server only accepts application/json data.'
        });
    }
    if ( req.body.name && req.body.type && req.body.length ) {
        post_boats(req.body.name, req.body.type, req.body.length, req.user.sub)
        .then( key => {res.status(201).json({
            id: key.id,
            name: req.body.name,
            type: req.body.type,
            length: req.body.length,
            owner: req.user.sub,
            loads: null,
            self: `${req.protocol}://${req.get("host")}${req.path}/${key.id}`
        })
    });
    } else {
        res.status(400).json({
            Error: 'The request object is missing at least one of the required attributes.'
        });
    }
});

app.get('/boats/:boat_id', function(req, res){
    const boat_id = req.params.boat_id; // gets the id of the boat
    const boat = get_specific_boats(boat_id)
    .then( (boat) => {
        if (boat) {
            var i;
            
            if(boat.loads !== null) {
                for ( i = 0; i < boat.loads.length; i++) {

                    if (boat.loads[i] !== null) {
    
                        boat.loads[i].self = `${req.protocol}://${req.get("host")}/loads/${boat.loads[i].id}`;
                    }
                }
            }
            
            boat.self = `${req.protocol}://${req.get("host")}${req.path}`;
            res.status(200).json(boat);
        } else {
            res.status(404).json({
                Error: 'No boat with this boat_id exists'
            });
        }
    })
});

app.patch('/boats/:boat_id', checkJwt, function(req, res) {
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    }
    const boat_id = req.params.boat_id; // gets the id of the boat
    if ( req.body.name && req.body.type && req.body.length) {
        const boat = get_specific_boats(boat_id)
        .then( (boat) => {
            if (boat) {
                patch_boat(boat_id, req.body.name, req.body.type, req.body.length).then((key) => {
                    const boat = get_specific_boats(key.id).then((boat) => {
                        boat.self = `${req.protocol}://${req.get("host")}${req.path}`;
                        res.status(200).json(boat);
                    })
                });                
            } else {
                res.status(404).json({
                    Error: 'No boat with this boat_id exists'
                });
            }
        })
    } else {
        res.status(400).json({
            Error: 'The request object is missing at least one of the required attributes'
        });
    }
});

app.patch('/loads/:load_id', function(req, res) {
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    }
    const load_id = req.params.load_id; // gets the id of the load
    if ( req.body.weight && req.body.content && req.body.delivery_date) {
        const load = get_specific_loads(load_id)
        .then( (load) => {
            if (load) {
                patch_load(load_id, req.body.weight, req.body.content, req.body.delivery_date).then((key) => {
                    const load = get_specific_loads(key.id).then((load) => {
                        load.self = `${req.protocol}://${req.get("host")}${req.path}`;
                        res.status(201).json(load);
                    })
                });                
            } else {
                res.status(404).json({
                    Error: 'No load with this load_id exists'
                });
            }
        })
    } else {
        res.status(400).json({
            Error: 'The request object is missing at least one of the required attributes'
        });
    }
});

app.delete('/boats/:boat_id', checkJwt, function(req, res){
    var carrier = null;
    const boat_id = req.params.boat_id; // gets the id of the boat
    const boat = get_specific_boats(boat_id)
    .then( (boat) => {
        if (boat) {
            if (boat.owner == req.user.sub) {
                const loads = get_loads()
                .then( (loads) => {
                    console.log(loads);
                    var i;
                    for( i = 0; i < loads.length; i++){
            
                        if (loads[i].carrier !== null) {
                            console.log("i'm looking for my boat", loads[i].carrier.id, boat_id);
                            if (loads[i].carrier.id == boat_id) {
                                console.log("I found my boat");
                                put_load(loads[i].id, loads[i].weight, loads[i].content, loads[i].delivery_date, carrier);
                            }
                        }
                    }
                });
                delete_boat(boat_id).then(res.status(204).end())
            } else {
                res.status(403).json({
                    Error: 'You do not have access to edit this entity.'
                });
            }
        } else {
            res.status(404).json({
                Error: 'No boat with this boat_id exists'
            });
        }
    }) 
});

app.get('/loads', function(req, res){
    const loads = get_loads_pagination(req)
    .then( (loads) => {
        const loads_total = get_loads()
        .then ( (loads_total) => {
        
            var baseURL = `${req.protocol}://${req.get("host")}${req.path}/`
            //console.log(baseURL);

            var i;
            for (i = 0; i < loads.items.length; i++) {
                var j = 0;
                if (loads.items[i].carrier !== null) {
                    
                    loads.items[i].carrier.self = `${req.protocol}://${req.get("host")}/boats/${loads.items[i].carrier.id}`;
                    
                }
            }           


            var newJSON = helpJSON(loads, baseURL);
            newJSON.total = loads_total.length;
            res.status(200).json(newJSON);
        });
    });
});

app.get('/loads/boats/:boat_id', function(req, res){
    var data = [];    
    const boat = get_specific_boats(req.params.boat_id)
    .then( (boat ) => {
        if (boat) {
            if (boat.loads == null) {
                res.status(404).json({
                    Error: 'No loads exist for this boat.'
                });
            } else {
                const loads = get_loads()
                .then( (loads) => {
                    for( i = 0; i < boat.loads.length; i++ ) {
                        console.log(boat.loads[0], i);
          
                        for (j = 0; j < loads.length; j++ ){
                          
                            if (boat.loads[i].id == loads[j].id) {
                                //console.log(loads[i]);
                                data.push(loads[i]);
                            }
                        }
                    }
                    console.log(data); 
                    baseURL = `${req.protocol}://${req.get("host")}/loads/`
                    res.status(200).json(helpJSON2(data, baseURL));
                });
            }
        } else {
            res.status(404).json({
                Error: 'No boat with this boat_id exists.'
            });
        }
    });
});

app.post('/loads', function(req, res){
    if(req.get('content-type') !== 'application/json') {
        res.status(406).json({
            Error: 'The server only accepts application/json data.'
        });
    }
    if ( req.body.weight && req.body.content && req.body.delivery_date ) {
        post_loads(req.body.weight, req.body.content, req.body.delivery_date)
        .then( key => {res.status(201).json({
            id: key.id,
            weight: req.body.weight,
            content: req.body.content,
            delivery_date: req.body.delivery_date,
            carrier: null,
            self: `${req.protocol}://${req.get("host")}${req.path}/${key.id}`
        })
    });
    } else {
        res.status(400).json({
            Error: 'The request object is missing at least one of the required attributes'
        });
    }
});

app.get('/loads/:load_id', function(req, res){
    const load_id = req.params.load_id; // gets the id of the boat
    console.log(load_id);
    const load = get_specific_loads(load_id)
    .then( (load) => {
        if (load) {

                if (load.carrier !== null) {
 
                    load.carrier.self = `${req.protocol}://${req.get("host")}/boats/${load.carrier.id}`;
                }
            
            load.self = `${req.protocol}://${req.get("host")}${req.path}`;
            res.status(200).json(load);
        } else {
            res.status(404).json({
                Error: 'No load with this load_id exists'
            });
        }
    })
});

app.delete('/loads/:load_id', checkJwt, function(req, res){
    
    const load_id = req.params.load_id; // gets the id of the boat
    const load = get_specific_loads(load_id)
    .then( (load) => {
        if (load) {
            
            if (load.carrier == null) {
                delete_load(load.id).then(res.status(204).end())
            } else {
                const boat = get_specific_boats(load.carrier.id)
                .then ( (boat) => {
                    if(boat.owner == req.user.sub) {
                        var boat_id = load.carrier.id;
                        var i;
                        for (i = 0; i < boat.loads.length; i++) {
                            if (boat.loads[i].id == load_id) {
                                console.log("I make it in here");
                                var data = boat.loads;
                                data.splice(i,1);

                                delete_load(load.id).then(res.status(204).end());

                                put_boat(boat_id, boat.name, boat.type, boat.length, data, boat.owner)
                                .then(res.status(204).end());
                            }
                        }

                    } else {
                        res.status(403).json({
                            Error: 'You do not have access to edit this entity.'
                        });
                    }
                });
            }

        } else {
            res.status(404).json({
                Error: 'No load with this load_id exists'
            });
        }
    })  
});

//put a load on a boat
app.put('/boats/:boat_id/loads/:load_id', checkJwt, function (req, res) {
    const load_id = req.params.load_id; //gets the id of the load
    const boat_id = req.params.boat_id; //gets the id of the boat
    console.log(boat_id, load_id);

    var newLoad = { "id": load_id };
    var data = [newLoad];

    console.log(data);
    const load = get_specific_loads(load_id)
    .then ( ( load ) => {
        if (load) {
            if (load.carrier == null) {
                const boat = get_specific_boats(req.params.boat_id)
                .then ( (boat ) => {
                    console.log(boat.owner, req.user.sub);

                    if (boat) {
                        console.log(boat);
                        if (boat.owner == req.user.sub) {
                            if (boat.loads == null) {
                                console.log("I make it in here")
                                boat.loads = data;
                                console.log(boat.loads);
                            } else {
                                boat.loads.push(newLoad);
                            }
                            var newCarrier = { "id": boat_id, "name":boat.name};
                            put_load(load_id, load.weight, load.content, load.delivery_date, newCarrier);
        
                            put_boat(boat_id, boat.name, boat.type, boat.length, boat.loads, boat.owner)
                            .then(res.status(204).end());
                        } else {
                            res.status(403).json({
                                Error: 'You do not have access to edit this entity.'
                            });
                        }
                    } else {
                        res.status(404).json({
                            Error: 'No boat with this boat_id exists'
                        });
                    }        
                }) 
            } else {
                res.status(403).json({
                    Error: 'The load is already assigned to another boat.'
                });
             } 
        } else {
            res.status(404).json({
                Error: 'No load with this load_id exists'
            });
        }   
    })
});

//remove a load from a boat
app.put('/loads/:load_id', checkJwt, function (req, res) {
    const load_id = req.params.load_id; //gets the id of the load

    const load = get_specific_loads(load_id)
    .then ( ( load ) => {
        if (load) {
            if (load.carrier != null) {
            const boat_id = load.carrier.id //gets the id of the boat
            const boat = get_specific_boats(boat_id)
            .then ( (boat ) => {
                console.log(boat);
                if (boat.owner == req.user.sub) {
                    var i;
                    for (i = 0; i < boat.loads.length; i++) {
                        if (boat.loads[i].id == load_id) {
                            console.log("I make it in here");
                            var data = boat.loads;
                            data.splice(i,1);

                            put_load(load_id, load.weight, load.content, load.delivery_date, null);

                            put_boat(boat_id, boat.name, boat.type, boat.length, data, boat.owner)
                            .then(res.status(204).end());
                        }
                    }
                } else {
                    res.status(403).json({
                        Error: 'You do not have access to edit this entity.'
                    });
                }
            }); 
            } else {
                res.status(403).json({
                    Error: 'The load is already unassigned from any boat.'
                });
            }
        } else {
            res.status(404).json({
                Error: 'No load with this load_id exists.'
            });
        }    
    })
});

app.get('/', (req, res) => {
    res.render('main', {});
});

app.get('/contact', (req, res) => {
    res.render('contact', {
        JWT: req.user.sub
    });
});

app.get('/login', (req, res) => {

    var oauthURL = "https://accounts.google.com/o/oauth2/v2/auth?";
    var oauthRES = "code";
    var oauthRURI = "https://siebertc-cs493-final.appspot.com/oauth";
    var oauthScope = "profile%20email" 
    var oauthState = "SomeSecretState123";

    res.redirect(`${oauthURL}response_type=${oauthRES}&client_id=${clientID}&redirect_uri=${oauthRURI}&scope=${oauthScope}&state=${oauthState}`);
});

app.get('/oauth', (req, res) => {
    console.log(req.query.state, req.query.code);

    var postURL = "https://www.googleapis.com/oauth2/v4/token?";
    var postCODE = req.query.code;
    var oauthRURI = "https://siebertc-cs493-final.appspot.com/oauth";

    var newURL = `${postURL}code=${postCODE}&client_id=${clientID}&client_secret=${clientSec}&redirect_uri=${oauthRURI}&grant_type=authorization_code`;

    request({
        url: newURL,
        method: 'POST'
    }, function(error, response, body){
        var results1 = JSON.parse(body);
        console.log(results1.id_token);

        request({
            url: "https://siebertc-cs493-final.appspot.com/users",
            method: 'POST',
            headers: {
            "Authorization": "Bearer " + results1.id_token
            }
        }, function(err, rs, bod){
            //console.log(err, rs, bod);
            console.log(bod);
            var results2 = JSON.parse(bod);
            res.render('main', {
                name: results2.name,
                email: results2.email,
                sub: results2.sub,
                jwt: results1.id_token,
                accountCreation: "Your account has been created!"
            });
        });
    });
});


app.delete('/boats', function(req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

app.put('/boats', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

app.delete('/loads', function(req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

app.put('/loads', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

app.delete('/users', function(req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

app.put('/users', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

/* ------------- End Controller Functions ------------- */

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
// [END app]

module.exports = app;
