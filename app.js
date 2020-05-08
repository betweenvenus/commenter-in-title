var fs = require('fs');
var readline = require('readline');
var { google } = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var profanity = require('@2toad/profanity').profanity;

// init

const videoId = 'OkdWpfWtnUg';


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube-video-updater-credentials.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    authorize(JSON.parse(content), getCommenter);

});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}


/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}

var youtube = google.youtube({
    version: 'v3'
});

function getCommenter(auth) {
    youtube.commentThreads.list({
        auth: auth,
        videoId: videoId,
        part: 'snippet,replies',
    },
        function (error, response) {
            if (error) {
                console.log('api error @ getCommenter: ' + error)
                return;
            }

            if (response.data.items) {
                if (response.data.items[0]) {
                    console.log('getCommenter successful - top commenter is: ' + response.data.items[0].snippet.topLevelComment.snippet.authorDisplayName);
                    updateVideo(auth, response.data.items[0].snippet.topLevelComment.snippet.authorDisplayName);
                }
                else {
                    console.log('video not found for some reason');
                    console.log(response);
                    return;
                }
            }
        }
    )
}


function listCategory(auth) {
    youtube.videos.list({
        auth: auth,
        id: videoId,
        part: "snippet",
    },
        function (error, response) {
            if (error) {
                console.log('listCategory error: ' + error);
                return;
            }
            if (response.data.items) {
                if (response.data.items[0]) {
                    console.log("response" + response.data.items[0].snippet.categoryId);
                    return;
                }
            }
            else {
                console.log('no items found');
                return;
            }

        }
    )
}

function updateVideo(auth, commenter) {
    if (profanity.exists(commenter)) {
        throw "profanity in username!";
    }
    else {
        youtube.videos.update({
            part: "snippet",
            auth: auth,
            requestBody: {
                id: videoId,
                snippet: {
                    title: "The latest commenter is: " + commenter,
                    categoryId: '24'
                }
            }
        },
            function (error, response) {
                if (error) {
                    console.log('updateVideo failed: ' + error);
                    return;
                }

                if (response.data.items) {
                    if (response.data.items[0]) {
                        console.log('complete');
                    }
                    else {
                        console.log('zero items in list');
                    }
                }
                else {
                    console.log('no items found');
                    console.log(response);
                    return;
                }
            }
        )
    }
}